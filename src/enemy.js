import * as THREE from 'three';
import { Tank } from './tank.js';
import { MAP_SIZE, TILE } from './map.js';

const PATROL = 'patrol', CHASE = 'chase', ATTACK = 'attack';

// Color palette for different enemy types
const ENEMY_PRESETS = [
  { color: 0xb84c2a, hp: 2, speed: 4.5, fire: 1.6, detect: 28, range: 22 }, // standard
  { color: 0x8b2252, hp: 3, speed: 3.2, fire: 1.0, detect: 24, range: 20 }, // heavy
  { color: 0xc8a000, hp: 1, speed: 7.0, fire: 2.0, detect: 32, range: 26 }, // scout
];

export class Enemy extends Tank {
  constructor(scene, map, wave = 1) {
    const preset = ENEMY_PRESETS[Math.floor(Math.random() * Math.min(wave, ENEMY_PRESETS.length))];
    super(scene, preset.color, preset.color);

    this.map = map;
    this.maxHp = preset.hp + Math.floor(wave / 3);
    this.hp = this.maxHp;
    this.speed = preset.speed + wave * 0.12;
    this.shootInterval = Math.max(0.5, preset.fire - wave * 0.05);
    this.detectionRange = preset.detect;
    this.attackRange = preset.range;

    this.state = PATROL;
    this._patrolTarget = null;
    this._stuckTimer = 0;
    this._lastPos = new THREE.Vector3();
    this._pickPatrol();
    this._updateHpBar();
  }

  _pickPatrol() {
    for (let tries = 0; tries < 30; tries++) {
      const i = 1 + Math.floor(Math.random() * (MAP_SIZE - 2));
      const j = 1 + Math.floor(Math.random() * (MAP_SIZE - 2));
      if (this.map.isWalkable(i, j)) {
        const wp = this.map.tileToWorld(i, j);
        this._patrolTarget = new THREE.Vector3(wp.x, 0, wp.z);
        return;
      }
    }
  }

  update(dt, playerPos, onShoot) {
    if (!this.alive) return;

    this.shootCooldown -= dt;
    this.updateFlash(dt);

    const myPos = this.group.position;
    const dist = myPos.distanceTo(playerPos);

    // State machine
    if (dist < this.attackRange)     this.state = ATTACK;
    else if (dist < this.detectionRange) this.state = CHASE;
    else                                 this.state = PATROL;

    // Movement target
    let target;
    if (this.state === PATROL) {
      if (!this._patrolTarget || myPos.distanceTo(this._patrolTarget) < 1.5) this._pickPatrol();
      target = this._patrolTarget;
    } else {
      target = playerPos;
    }

    if (target) this._moveToward(target, dt);

    // Aim turret at player always
    const toPlayer = new THREE.Vector3().subVectors(playerPos, myPos);
    const worldAngle = Math.atan2(toPlayer.x, toPlayer.z);
    this.turretPivot.rotation.y = worldAngle - this.group.rotation.y;

    // Shoot when attacking
    if (this.state === ATTACK && this.shootCooldown <= 0) {
      this.shootCooldown = this.shootInterval;
      onShoot(this);
    }

    this.updateBox();
  }

  _moveToward(target, dt) {
    const myPos = this.group.position;
    const dir = new THREE.Vector3().subVectors(target, myPos);
    dir.y = 0;
    if (dir.length() < 0.1) return;

    // Rotate body toward movement direction
    const targetAngle = Math.atan2(dir.x, dir.z);
    let diff = targetAngle - this.group.rotation.y;
    while (diff >  Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.group.rotation.y += Math.sign(diff) * Math.min(Math.abs(diff), this.turnSpeed * dt);

    // Move forward only when roughly aligned
    if (Math.abs(diff) < Math.PI * 0.6) {
      const angle = this.group.rotation.y;
      const dx = -Math.sin(angle) * this.speed * dt;
      const dz = -Math.cos(angle) * this.speed * dt;
      const nx = myPos.x + dx;
      const nz = myPos.z + dz;

      if (this.map.canMoveTo(nx, nz)) {
        myPos.x = nx; myPos.z = nz;
      } else if (this.map.canMoveTo(nx, myPos.z)) {
        myPos.x = nx;
      } else if (this.map.canMoveTo(myPos.x, nz)) {
        myPos.z = nz;
      } else {
        this._pickPatrol(); // stuck → new patrol point
      }
    }

    // Anti-stuck
    this._stuckTimer += dt;
    if (this._stuckTimer > 2.0) {
      if (myPos.distanceTo(this._lastPos) < 0.3) this._pickPatrol();
      this._lastPos.copy(myPos);
      this._stuckTimer = 0;
    }
  }
}
