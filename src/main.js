import * as THREE from 'three';
import { SceneManager } from './scene.js';
import { GameMap } from './map.js';
import { Player } from './player.js';
import { Enemy } from './enemy.js';
import { Bullet } from './bullet.js';
import { Explosion } from './explosion.js';
import { PowerUp, POWERUP_TYPES } from './powerup.js';
import { Input } from './input.js';
import { HUD } from './hud.js';
import { AudioSystem } from './audio.js';

const STATE = { MENU: 0, PLAYING: 1, PAUSED: 2, WAVE_CLEAR: 3, OVER: 4 };

class Game {
  constructor() {
    this.state = STATE.MENU;
    this.wave = 1;
    this.kills = 0;
    this._waveClearTimer = 0;

    this.sceneMgr = new SceneManager();
    this.input    = new Input();
    this.hud      = new HUD();
    this.audio    = new AudioSystem();

    this.map       = null;
    this.player    = null;
    this.enemies   = [];
    this.bullets   = [];
    this.explosions = [];
    this.powerUps  = [];

    this._lastTime = 0;
    this._camTarget = new THREE.Vector3();

    this._bindUI();
    this.hud.showMenu();
    requestAnimationFrame(t => this._loop(t));
  }

  // ── UI bindings ──────────────────────────────────────────────────────────
  _bindUI() {
    document.getElementById('btn-start').addEventListener('click',      () => this._startGame());
    document.getElementById('btn-restart').addEventListener('click',    () => this._startGame());
    document.getElementById('btn-menu').addEventListener('click',       () => this._toMenu());
    document.getElementById('btn-resume').addEventListener('click',     () => this._resume());
    document.getElementById('btn-pause-menu').addEventListener('click', () => this._toMenu());

    window.addEventListener('keydown', e => {
      if (e.code !== 'Escape') return;
      if (this.state === STATE.PLAYING) this._pause();
      else if (this.state === STATE.PAUSED) this._resume();
    });

    // Activate audio on first interaction
    const unlock = () => { this.audio.init(); };
    window.addEventListener('click', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
  }

  // ── Game lifecycle ───────────────────────────────────────────────────────
  _startGame() {
    this._cleanup();
    this.wave = 1;
    this.kills = 0;

    this.map    = new GameMap(this.sceneMgr.scene);
    this.player = new Player(this.sceneMgr.scene);
    const sp = this.map.getPlayerSpawn();
    this.player.setPosition(sp.x, 0, sp.z);

    this._spawnWave(true);
    this.state = STATE.PLAYING;
    this.hud.showGame();
  }

  _cleanup() {
    if (this.map)    { this.map.destroy(); this.map = null; }
    if (this.player) { this.player.destroy(); this.player = null; }
    this.enemies.forEach(e => e.destroy());
    this.bullets.forEach(b => b.destroy());
    this.explosions.forEach(e => e.destroy());
    this.powerUps.forEach(p => p.destroy());
    this.enemies = []; this.bullets = []; this.explosions = []; this.powerUps = [];
  }

  _pause() {
    this.state = STATE.PAUSED;
    this.hud.showPause();
  }

  _resume() {
    this.state = STATE.PLAYING;
    this.hud.hidePause();
    this._lastTime = performance.now(); // prevent dt spike
  }

  _toMenu() {
    this._cleanup();
    this.state = STATE.MENU;
    this.hud.showMenu();
  }

  // ── Wave management ──────────────────────────────────────────────────────
  _spawnWave(announce = false) {
    const count = 2 + this.wave * 2;
    const spawns = this.map.getEnemySpawns(count);
    for (let k = 0; k < count; k++) {
      const e = new Enemy(this.sceneMgr.scene, this.map, this.wave);
      e.setPosition(spawns[k].x, 0, spawns[k].z);
      this.enemies.push(e);
    }
    if (announce) this.hud.announceWave(this.wave);
  }

  // ── Main loop ────────────────────────────────────────────────────────────
  _loop(timestamp) {
    const dt = Math.min((timestamp - this._lastTime) / 1000, 0.05);
    this._lastTime = timestamp;

    if (this.state === STATE.PLAYING || this.state === STATE.WAVE_CLEAR) {
      this._update(dt);
    }

    this.sceneMgr.render();
    requestAnimationFrame(t => this._loop(t));
  }

  _update(dt) {
    if (this.state === STATE.WAVE_CLEAR) {
      this._waveClearTimer -= dt;
      if (this._waveClearTimer <= 0) {
        this.wave++;
        this._spawnWave(true);
        this.player.ammo = Math.min(this.player.maxAmmo, this.player.ammo + 10);
        this.state = STATE.PLAYING;
      }
    }

    // Player
    this.player.update(dt, this.input, this.sceneMgr.camera, this.map, tank => this._shoot(tank));

    // Enemies
    for (const e of this.enemies) {
      if (e.alive) e.update(dt, this.player.position, tank => this._shoot(tank));
    }

    // Bullets
    for (const b of this.bullets) {
      if (!b.alive) continue;
      b.update(dt);
      if (b.alive) this._checkBullet(b);
    }

    // Explosions
    this.explosions = this.explosions.filter(ex => {
      const alive = ex.update(dt);
      if (!alive) ex.destroy();
      return alive;
    });

    // Power-ups
    this.powerUps = this.powerUps.filter(p => {
      if (!p.alive) return false;
      const alive = p.update(dt);
      if (!alive) return false;
      if (this.player.box.intersectsBox(p.box)) {
        this.player.collectPowerup(p.type);
        this.audio.playPowerup();
        p.destroy();
        return false;
      }
      return true;
    });

    // Prune dead bullets/enemies
    this.bullets = this.bullets.filter(b => b.alive);
    this.enemies = this.enemies.filter(e => e.alive);

    // Camera
    this._updateCamera(dt);

    // HUD
    this.hud.update(dt, this.player, this.wave, this.kills, this.enemies, this.powerUps);

    // Game over
    if (!this.player.alive) {
      this._explode(this.player.position.clone(), 2);
      this.player.destroy();
      this.state = STATE.OVER;
      this.hud.showGameOver(false, this.kills, this.wave);
      return;
    }

    // Wave clear
    if (this.state === STATE.PLAYING && this.enemies.every(e => !e.alive)) {
      this.audio.playWaveClear();
      this.state = STATE.WAVE_CLEAR;
      this._waveClearTimer = 2.5;
    }
  }

  // ── Shoot ────────────────────────────────────────────────────────────────
  _shoot(tank) {
    const isPlayer = tank === this.player;
    const piercing = isPlayer && tank.hasPierce;
    const b = new Bullet(
      this.sceneMgr.scene,
      tank.getBarrelTip(),
      tank.getBarrelDir(),
      isPlayer ? 'player' : 'enemy',
      piercing
    );
    this.bullets.push(b);
    this.audio.playShoot();
  }

  // ── Collision ────────────────────────────────────────────────────────────
  _checkBullet(bullet) {
    // vs walls (snapshot to allow splice during iteration)
    for (const wall of [...this.map.walls]) {
      if (!bullet.box.intersectsBox(wall.box)) continue;
      this._explode(bullet.mesh.position.clone(), 0.5);
      if (wall.type === 1 /* BRICK */) {
        this.map.destroyBrick(wall.i, wall.j);
      }
      if (!bullet.piercing) { bullet.destroy(); return; }
      break;
    }
    if (!bullet.alive) return;

    // vs tanks
    if (bullet.owner === 'enemy') {
      if (bullet.box.intersectsBox(this.player.box)) {
        this.player.takeDamage(1);
        this._explode(bullet.mesh.position.clone(), 0.6);
        this.audio.playHit();
        bullet.destroy();
      }
    } else {
      for (const e of this.enemies) {
        if (!e.alive) continue;
        if (!bullet.box.intersectsBox(e.box)) continue;
        e.takeDamage(1);
        this._explode(bullet.mesh.position.clone(), 0.5);
        this.audio.playHit();
        if (!e.alive) {
          this.kills++;
          this._explode(e.position.clone(), 1.8);
          e.destroy();
          // Drop powerup
          if (Math.random() < 0.35) {
            const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
            this.powerUps.push(new PowerUp(this.sceneMgr.scene, e.position.clone(), type));
          }
        }
        if (!bullet.piercing) { bullet.destroy(); return; }
      }
    }
  }

  _explode(pos, scale = 1) {
    this.explosions.push(new Explosion(this.sceneMgr.scene, pos, scale));
    if (scale >= 1) this.audio.playExplosion();
  }

  // ── Camera ───────────────────────────────────────────────────────────────
  _updateCamera(dt) {
    const pos   = this.player.position;
    const angle = this.player.group.rotation.y;
    const dist  = 20, height = 13;

    // Position camera behind and above the player
    const tx = pos.x + Math.sin(angle) * dist;
    const tz = pos.z + Math.cos(angle) * dist;
    const ty = height;

    // Move directional light shadow with player
    this.sceneMgr.sun.position.set(pos.x + 60, pos.y + 120, pos.z + 40);
    this.sceneMgr.sun.target.position.copy(pos);
    this.sceneMgr.sun.target.updateMatrixWorld();

    // Smooth follow
    const lerpSpeed = 1 - Math.exp(-dt * 7);
    this.sceneMgr.camera.position.lerp(new THREE.Vector3(tx, ty, tz), lerpSpeed);
    this._camTarget.lerp(new THREE.Vector3(pos.x, 1.5, pos.z), lerpSpeed);
    this.sceneMgr.camera.lookAt(this._camTarget);
  }
}

new Game();
