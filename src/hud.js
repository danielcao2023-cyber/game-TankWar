import { MAP_SIZE, TILE } from './map.js';

export class HUD {
  constructor() {
    this._hud          = document.getElementById('hud');
    this._hpFill       = document.getElementById('hp-fill');
    this._hpText       = document.getElementById('hp-text');
    this._ammoNum      = document.getElementById('ammo-num');
    this._waveNum      = document.getElementById('wave-num');
    this._killNum      = document.getElementById('kill-num');
    this._enemyNum     = document.getElementById('enemy-num');
    this._minimap      = document.getElementById('minimap');
    this._ctx          = this._minimap.getContext('2d');
    this._waveAnn      = document.getElementById('wave-announce');
    this._iconSpeed    = document.getElementById('icon-speed');
    this._iconPierce   = document.getElementById('icon-pierce');
    this._goScreen     = document.getElementById('gameover-screen');
    this._goTitle      = document.getElementById('go-title');
    this._goMsg        = document.getElementById('go-msg');
    this._menuScreen   = document.getElementById('menu-screen');
    this._pauseScreen  = document.getElementById('pause-screen');

    this._waveAnnTimer = 0;
  }

  update(dt, player, wave, kills, enemies, powerups) {
    this._waveAnnTimer = Math.max(0, this._waveAnnTimer - dt);
    if (this._waveAnnTimer <= 0) this._waveAnn.classList.remove('show');

    const pct = player.hp / player.maxHp;
    this._hpFill.style.width = (pct * 100).toFixed(1) + '%';
    this._hpFill.style.background = pct > 0.5 ? '#2ecc71' : pct > 0.25 ? '#f39c12' : '#e74c3c';
    this._hpText.textContent = `${player.hp}/${player.maxHp}`;
    this._ammoNum.textContent = player.ammo;
    this._waveNum.textContent = wave;
    this._killNum.textContent = kills;
    this._enemyNum.textContent = enemies.filter(e => e.alive).length;

    this._iconSpeed.style.display  = player.hasSpeed  ? 'block' : 'none';
    this._iconPierce.style.display = player.hasPierce ? 'block' : 'none';

    this._drawMinimap(player, enemies, powerups);
  }

  _drawMinimap(player, enemies, powerups) {
    const ctx = this._ctx;
    const W = this._minimap.width, H = this._minimap.height;
    const worldSize = MAP_SIZE * TILE;

    const toScreen = (wx, wz) => ({
      sx: (wx / worldSize + 0.5) * W,
      sy: (wz / worldSize + 0.5) * H
    });

    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, W, H);

    // Powerups
    for (const p of powerups) {
      if (!p.alive) continue;
      const { sx, sy } = toScreen(p.mesh.position.x, p.mesh.position.z);
      ctx.fillStyle = '#ffee44';
      ctx.fillRect(sx - 2, sy - 2, 4, 4);
    }

    // Enemies
    ctx.fillStyle = '#ff4444';
    for (const e of enemies) {
      if (!e.alive) continue;
      const { sx, sy } = toScreen(e.position.x, e.position.z);
      ctx.beginPath();
      ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player (triangle pointing forward)
    const { sx: px, sy: pz } = toScreen(player.position.x, player.position.z);
    const angle = player.group.rotation.y;
    ctx.save();
    ctx.translate(px, pz);
    ctx.rotate(-angle);
    ctx.fillStyle = '#00ff44';
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(3.5, 4);
    ctx.lineTo(-3.5, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, W, H);
  }

  announceWave(wave) {
    this._waveAnn.textContent = `第 ${wave} 波`;
    this._waveAnn.classList.add('show');
    this._waveAnnTimer = 2.5;
  }

  showGame() {
    this._menuScreen.classList.add('hidden');
    this._goScreen.classList.add('hidden');
    this._pauseScreen.classList.add('hidden');
    this._hud.style.display = 'flex';
  }

  showMenu() {
    this._hud.style.display = 'none';
    this._menuScreen.classList.remove('hidden');
    this._goScreen.classList.add('hidden');
    this._pauseScreen.classList.add('hidden');
  }

  showGameOver(won, kills, wave) {
    this._goTitle.textContent = won ? '🏆 胜利！' : '💥 游戏结束';
    this._goMsg.textContent = won
      ? `恭喜你！消灭了所有敌人！击杀 ${kills} 辆坦克！`
      : `你的坦克被击毁了！第 ${wave} 波，共击杀 ${kills} 辆坦克。`;
    this._goScreen.classList.remove('hidden');
  }

  showPause() { this._pauseScreen.classList.remove('hidden'); }
  hidePause() { this._pauseScreen.classList.add('hidden'); }
}
