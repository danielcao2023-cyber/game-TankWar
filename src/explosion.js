import * as THREE from 'three';

const PARTICLE_GEO = new THREE.SphereGeometry(0.22, 4, 4);
const SPARK_GEO    = new THREE.SphereGeometry(0.08, 3, 3);

export class Explosion {
  constructor(scene, position, scale = 1) {
    this.scene = scene;
    this.maxLife = 0.75 * scale;
    this.life = this.maxLife;
    this.particles = [];

    // Fireball particles
    const count = Math.ceil(18 * scale);
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(0.04 + Math.random() * 0.08, 1, 0.5 + Math.random() * 0.35),
        transparent: true
      });
      const mesh = new THREE.Mesh(PARTICLE_GEO, mat);
      mesh.position.copy(position);
      mesh.position.y += Math.random() * 0.5;
      const speed = (3 + Math.random() * 7) * scale;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.random() * Math.PI;
      const vel = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.abs(Math.cos(phi)) * speed * 1.2 + 1,
        Math.sin(phi) * Math.sin(theta) * speed
      );
      scene.add(mesh);
      this.particles.push({ mesh, vel, type: 'fire' });
    }

    // Sparks
    const sparks = Math.ceil(12 * scale);
    for (let i = 0; i < sparks; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true });
      const mesh = new THREE.Mesh(SPARK_GEO, mat);
      mesh.position.copy(position);
      const speed = (8 + Math.random() * 12) * scale;
      const theta = Math.random() * Math.PI * 2;
      const vel = new THREE.Vector3(
        Math.cos(theta) * speed,
        (Math.random() * 6 + 2) * scale,
        Math.sin(theta) * speed
      );
      scene.add(mesh);
      this.particles.push({ mesh, vel, type: 'spark' });
    }

    // Shockwave ring
    const ringGeo = new THREE.RingGeometry(0.1, 1.2 * scale, 16);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xff8800, side: THREE.DoubleSide, transparent: true });
    this.ring = new THREE.Mesh(ringGeo, ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.copy(position);
    this.ring.position.y = 0.05;
    scene.add(this.ring);

    // Point light flash
    this.flash = new THREE.PointLight(0xff6600, 4 * scale, 15 * scale);
    this.flash.position.copy(position);
    scene.add(this.flash);
  }

  update(dt) {
    this.life -= dt;
    if (this.life <= 0) return false;

    const t = this.life / this.maxLife; // 1→0

    for (const p of this.particles) {
      p.vel.y -= 18 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.material.opacity = t * (p.type === 'spark' ? 1.5 : 1);
      const s = p.type === 'fire'
        ? (0.5 + t * 1.2) * (1 + (1 - t) * 0.8)
        : t * 0.6;
      p.mesh.scale.setScalar(Math.max(0.01, s));
    }

    // Expand shockwave and fade
    const rScale = (1 - t) * 4 + 1;
    this.ring.scale.setScalar(rScale);
    this.ring.material.opacity = t * 0.6;

    // Fade flash
    this.flash.intensity = t * 4;

    return true;
  }

  destroy() {
    this.particles.forEach(p => {
      this.scene.remove(p.mesh);
      p.mesh.material.dispose();
    });
    this.scene.remove(this.ring);
    this.ring.geometry.dispose();
    this.ring.material.dispose();
    this.scene.remove(this.flash);
    this.particles = [];
  }
}
