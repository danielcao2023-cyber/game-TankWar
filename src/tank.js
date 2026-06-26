import * as THREE from 'three';

export class Tank {
  constructor(scene, bodyColor, turretColor) {
    this.scene = scene;
    this.hp = 3;
    this.maxHp = 3;
    this.speed = 7;
    this.turnSpeed = 2.2;
    this.shootCooldown = 0;
    this.shootInterval = 0.85;
    this.alive = true;

    this.group = new THREE.Group();
    this._buildMesh(bodyColor, turretColor || bodyColor);
    scene.add(this.group);

    this.box = new THREE.Box3();
    this._flashTimer = 0;
    this._origBodyColor = bodyColor;
  }

  _buildMesh(bodyColor, turretColor) {
    // Tracks (below body)
    const trackGeo = new THREE.BoxGeometry(0.55, 0.65, 3.9);
    const trackMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    [-1.35, 1.35].forEach(x => {
      const t = new THREE.Mesh(trackGeo, trackMat);
      t.position.set(x, 0.32, 0);
      t.castShadow = true;
      this.group.add(t);
    });

    // Track wheels
    const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 8);
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    [-1.35, 1.35].forEach(x => {
      [-1.4, 0, 1.4].forEach(z => {
        const w = new THREE.Mesh(wheelGeo, wheelMat);
        w.rotation.z = Math.PI / 2;
        w.position.set(x, 0.35, z);
        this.group.add(w);
      });
    });

    // Body hull
    const bodyGeo = new THREE.BoxGeometry(2.7, 0.85, 3.6);
    const bodyMat = new THREE.MeshLambertMaterial({ color: bodyColor });
    this.bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    this.bodyMesh.position.y = 0.75;
    this.bodyMesh.castShadow = true;
    this.bodyMesh.receiveShadow = true;
    this.group.add(this.bodyMesh);

    // Turret ring
    const ringGeo = new THREE.CylinderGeometry(1.05, 1.1, 0.3, 12);
    const ringMat = new THREE.MeshLambertMaterial({ color: turretColor });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 1.3;
    ring.castShadow = true;
    this.group.add(ring);

    // Turret pivot (rotates independently)
    this.turretPivot = new THREE.Group();
    this.turretPivot.position.y = 1.3;
    this.group.add(this.turretPivot);

    // Turret dome
    const domeGeo = new THREE.BoxGeometry(1.5, 0.55, 1.9);
    const domeMat = new THREE.MeshLambertMaterial({ color: turretColor });
    this.turretMesh = new THREE.Mesh(domeGeo, domeMat);
    this.turretMesh.position.y = 0.27;
    this.turretMesh.castShadow = true;
    this.turretPivot.add(this.turretMesh);

    // Barrel
    const barrelGeo = new THREE.CylinderGeometry(0.14, 0.16, 2.2, 8);
    const barrelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    this.barrel = new THREE.Mesh(barrelGeo, barrelMat);
    this.barrel.rotation.x = -Math.PI / 2; // align with -Z forward
    this.barrel.position.set(0, 0.2, -1.6);
    this.barrel.castShadow = true;
    this.turretPivot.add(this.barrel);

    // HP bar (sprite above tank)
    this._buildHpBar();
  }

  _buildHpBar() {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 10;
    this._hpCanvas = canvas;
    this._hpCtx = canvas.getContext('2d');
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false });
    this.hpSprite = new THREE.Sprite(mat);
    this.hpSprite.scale.set(3.5, 0.55, 1);
    this.hpSprite.position.y = 3.5;
    this.group.add(this.hpSprite);
    this._updateHpBar();
  }

  _updateHpBar() {
    const ctx = this._hpCtx;
    const W = 64, H = 10;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, W, H);
    const pct = Math.max(0, this.hp / this.maxHp);
    ctx.fillStyle = pct > 0.5 ? '#2ecc71' : pct > 0.25 ? '#f39c12' : '#e74c3c';
    ctx.fillRect(1, 1, (W - 2) * pct, H - 2);
    this.hpSprite.material.map.needsUpdate = true;
  }

  getBarrelTip() {
    // Barrel length 2.2, center at z=-1.6, so tip at z = -1.6 - 1.1 = -2.7
    const tip = new THREE.Vector3(0, 0.2, -2.7);
    this.turretPivot.localToWorld(tip);
    return tip;
  }

  getBarrelDir() {
    const dir = new THREE.Vector3(0, 0, -1);
    const q = new THREE.Quaternion();
    this.turretPivot.getWorldQuaternion(q);
    return dir.applyQuaternion(q);
  }

  takeDamage(amount = 1) {
    if (!this.alive) return;
    this.hp = Math.max(0, this.hp - amount);
    this._updateHpBar();
    if (this.hp === 0) { this.alive = false; return; }
    // Flash red
    this._flashTimer = 0.18;
    this.bodyMesh.material.color.setHex(0xff2222);
    this.turretMesh.material.color.setHex(0xff2222);
  }

  updateFlash(dt) {
    if (this._flashTimer > 0) {
      this._flashTimer -= dt;
      if (this._flashTimer <= 0) {
        this.bodyMesh.material.color.setHex(this._origBodyColor);
        this.turretMesh.material.color.setHex(this._origBodyColor);
      }
    }
  }

  updateBox() {
    this.box.setFromObject(this.group);
  }

  get position() { return this.group.position; }

  setPosition(x, y, z) { this.group.position.set(x, y, z); }

  destroy() {
    this.scene.remove(this.group);
    this.alive = false;
  }
}
