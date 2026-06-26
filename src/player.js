import * as THREE from 'three';
import { Tank } from './tank.js';

export class Player extends Tank {
  constructor(scene) {
    super(scene, 0x2d6a4f, 0x1e4d38);
    this.maxHp = 5;
    this.hp = 5;
    this.ammo = 30;
    this.maxAmmo = 30;
    this.kills = 0;
    this.speedBoost = 0;   // seconds remaining
    this.pierceTimer = 0;  // seconds remaining
    this.speed = 8;
    this.turnSpeed = 2.5;
    this.shootInterval = 0.55;
    this._updateHpBar();
    // Player doesn't show HP bar sprite
    this.hpSprite.visible = false;
  }

  update(dt, input, camera, map, onShoot) {
    if (!this.alive) return;
    this.shootCooldown -= dt;
    if (this.speedBoost > 0) this.speedBoost -= dt;
    if (this.pierceTimer > 0) this.pierceTimer -= dt;
    this.updateFlash(dt);

    const spd = this.speed * (this.speedBoost > 0 ? 1.75 : 1);
    const ry = this.group.rotation.y;

    // Rotation
    if (input.isDown('KeyA') || input.isDown('ArrowLeft'))  this.group.rotation.y += this.turnSpeed * dt;
    if (input.isDown('KeyD') || input.isDown('ArrowRight')) this.group.rotation.y -= this.turnSpeed * dt;

    // Forward / backward
    let fwd = 0;
    if (input.isDown('KeyW') || input.isDown('ArrowUp'))   fwd =  1;
    if (input.isDown('KeyS') || input.isDown('ArrowDown')) fwd = -1;

    if (fwd !== 0) {
      const angle = this.group.rotation.y;
      const dx = -Math.sin(angle) * spd * dt * fwd;
      const dz = -Math.cos(angle) * spd * dt * fwd;
      const nx = this.position.x + dx;
      const nz = this.position.z + dz;

      // Try full move, then axis-separated (wall sliding)
      if (map.canMoveTo(nx, nz)) {
        this.position.x = nx;
        this.position.z = nz;
      } else if (map.canMoveTo(nx, this.position.z)) {
        this.position.x = nx;
      } else if (map.canMoveTo(this.position.x, nz)) {
        this.position.z = nz;
      }
    }

    // Mouse → turret aim (raycast to ground plane y=1.2)
    this._aimTurret(input.mouse, camera);

    // Shoot: fire while held OR consume a pending click
    const wantShoot = input.mouse.clicked || input.mouse._pending;
    if (wantShoot && this.shootCooldown <= 0 && this.ammo > 0) {
      this.shootCooldown = this.shootInterval;
      this.ammo = Math.max(0, this.ammo - 1);
      input.mouse._pending = false;
      onShoot(this);
    } else {
      input.mouse._pending = false;
    }

    this.updateBox();
  }

  _aimTurret(mouse, camera) {
    const raycaster = new THREE.Raycaster();
    const ndcX = (mouse.x / window.innerWidth) * 2 - 1;
    const ndcY = -(mouse.y / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);

    const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.2);
    const hit = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(ground, hit)) {
      const dir = hit.sub(this.group.position);
      const worldAngle = Math.atan2(dir.x, dir.z);
      this.turretPivot.rotation.y = worldAngle - this.group.rotation.y;
    }
  }

  collectPowerup(type) {
    switch (type) {
      case 'health': this.hp = Math.min(this.maxHp, this.hp + 2); this._updateHpBar(); break;
      case 'speed':  this.speedBoost = 6; break;
      case 'pierce': this.pierceTimer = 8; break;
      case 'ammo':   this.ammo = Math.min(this.maxAmmo, this.ammo + 12); break;
    }
  }

  get hasPierce() { return this.pierceTimer > 0; }
  get hasSpeed()  { return this.speedBoost > 0; }
}
