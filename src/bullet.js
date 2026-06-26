import * as THREE from 'three';

const LIMIT = 110; // destroy if beyond world bounds

export class Bullet {
  constructor(scene, position, direction, owner = 'player', piercing = false) {
    this.scene = scene;
    this.dir = direction.clone().normalize();
    this.dir.y = 0; // keep horizontal
    this.dir.normalize();
    this.speed = 28;
    this.owner = owner;
    this.piercing = piercing;
    this.alive = true;
    this._life = 0;

    const isPlayer = owner === 'player';

    // Shell mesh
    const geo = new THREE.CylinderGeometry(0.13, 0.13, 0.6, 6);
    const mat = new THREE.MeshBasicMaterial({ color: isPlayer ? 0xffee44 : 0xff5500 });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.position.copy(position);

    // Orient cylinder along travel direction
    const up = new THREE.Vector3(0, 1, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(up, this.dir.clone().normalize());
    this.mesh.setRotationFromQuaternion(q);
    scene.add(this.mesh);

    // Tracer line (glow trail)
    const pts = [position.clone(), position.clone().sub(this.dir.clone().multiplyScalar(1.5))];
    const trailGeo = new THREE.BufferGeometry().setFromPoints(pts);
    const trailMat = new THREE.LineBasicMaterial({
      color: isPlayer ? 0xffff99 : 0xff8800,
      transparent: true, opacity: 0.75
    });
    this.trail = new THREE.Line(trailGeo, trailMat);
    scene.add(this.trail);

    // Light flash (small point light follows bullet)
    this.light = new THREE.PointLight(isPlayer ? 0xffee44 : 0xff5500, 1.5, 8);
    this.light.position.copy(position);
    scene.add(this.light);

    this.box = new THREE.Box3().setFromObject(this.mesh);
  }

  update(dt) {
    if (!this.alive) return;
    this._life += dt;

    const move = this.dir.clone().multiplyScalar(this.speed * dt);
    this.mesh.position.add(move);
    this.light.position.copy(this.mesh.position);

    // Update trail
    const tail = this.mesh.position.clone().sub(this.dir.clone().multiplyScalar(1.8));
    this.trail.geometry.setFromPoints([this.mesh.position.clone(), tail]);

    // Update AABB
    this.box.setFromObject(this.mesh);

    // Fade light
    this.light.intensity = Math.max(0, 1.5 - this._life * 4);

    // Kill if out of bounds or lived too long
    const p = this.mesh.position;
    if (Math.abs(p.x) > LIMIT || Math.abs(p.z) > LIMIT || this._life > 4) this.destroy();
  }

  destroy() {
    if (!this.alive) return;
    this.scene.remove(this.mesh);
    this.scene.remove(this.trail);
    this.scene.remove(this.light);
    this.alive = false;
  }
}
