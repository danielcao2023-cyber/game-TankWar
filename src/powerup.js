import * as THREE from 'three';

const CONFIGS = {
  health: { color: 0xff2255, label: '❤️', emissive: 0x880011 },
  speed:  { color: 0x00ccff, label: '⚡', emissive: 0x005588 },
  pierce: { color: 0xff8800, label: '🔥', emissive: 0x663300 },
  ammo:   { color: 0xffee00, label: '💛', emissive: 0x665500 },
};

export const POWERUP_TYPES = Object.keys(CONFIGS);

export class PowerUp {
  constructor(scene, position, type) {
    this.scene = scene;
    this.type = type;
    this.alive = true;
    this._life = 12;
    this._t = 0;

    const cfg = CONFIGS[type] || CONFIGS.health;
    const geo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
    const mat = new THREE.MeshLambertMaterial({
      color: cfg.color,
      emissive: cfg.emissive,
      emissiveIntensity: 0.6
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(position);
    this.mesh.position.y = 0.7;
    this.mesh.castShadow = true;
    scene.add(this.mesh);

    // Outer ring glow
    const ringGeo = new THREE.TorusGeometry(0.75, 0.08, 6, 16);
    const ringMat = new THREE.MeshBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.5 });
    this.ring = new THREE.Mesh(ringGeo, ringMat);
    this.ring.position.copy(position);
    this.ring.position.y = 0.7;
    scene.add(this.ring);

    this.box = new THREE.Box3().setFromObject(this.mesh);
  }

  update(dt) {
    this._life -= dt;
    this._t += dt;

    this.mesh.rotation.y += dt * 2.2;
    this.mesh.position.y = 0.7 + Math.sin(this._t * 3) * 0.25;
    this.ring.position.y = this.mesh.position.y;
    this.ring.rotation.y = this._t * 1.5;

    // Blink when about to expire
    if (this._life < 3) {
      const blink = Math.sin(this._t * 12) > 0;
      this.mesh.visible = blink;
      this.ring.visible = blink;
    }

    this.box.setFromObject(this.mesh);
    if (this._life <= 0) { this.destroy(); return false; }
    return true;
  }

  destroy() {
    if (!this.alive) return;
    this.scene.remove(this.mesh);
    this.scene.remove(this.ring);
    this.alive = false;
  }
}
