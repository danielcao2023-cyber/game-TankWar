export class AudioSystem {
  constructor() { this.ctx = null; }

  init() {
    if (this.ctx) return;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
  }

  playShoot() {
    this._tone(380, 0.13, 'sawtooth', 0.14);
    this._tone(180, 0.18, 'sine', 0.08);
  }

  playExplosion() {
    this._noise(0.45, 0.45);
    this._tone(70, 0.55, 'sine', 0.35);
  }

  playHit() {
    this._tone(220, 0.09, 'square', 0.18);
    this._noise(0.08, 0.2);
  }

  playPowerup() {
    [880, 1100, 1320].forEach((f, i) =>
      setTimeout(() => this._tone(f, 0.12, 'sine', 0.18), i * 80));
  }

  playWaveClear() {
    [523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => this._tone(f, 0.2, 'sine', 0.2), i * 100));
  }

  _tone(freq, dur, type = 'sine', vol = 0.25) {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.25, this.ctx.currentTime + dur);
      gain.gain.setValueAtTime(vol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + dur + 0.01);
    } catch {}
  }

  _noise(dur, vol = 0.3) {
    if (!this.ctx) return;
    try {
      const sr = this.ctx.sampleRate;
      const buf = this.ctx.createBuffer(1, sr * dur, sr);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(vol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + dur);
      src.connect(gain);
      gain.connect(this.ctx.destination);
      src.start();
    } catch {}
  }
}
