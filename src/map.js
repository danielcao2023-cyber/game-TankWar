import * as THREE from 'three';

export const TILE = 4;
export const MAP_SIZE = 26; // 26×26 tiles

export const EMPTY = 0;
export const BRICK = 1;
export const STEEL = 2;

export class GameMap {
  constructor(scene) {
    this.scene = scene;
    this.grid = [];
    this.walls = [];
    this._meshes = [];
    this._generate();
    this._buildMeshes();
  }

  _generate() {
    this.grid = Array.from({ length: MAP_SIZE }, () => Array(MAP_SIZE).fill(EMPTY));

    // Border (steel)
    for (let i = 0; i < MAP_SIZE; i++) {
      for (let j = 0; j < MAP_SIZE; j++) {
        if (i === 0 || i === MAP_SIZE - 1 || j === 0 || j === MAP_SIZE - 1)
          this.grid[i][j] = STEEL;
      }
    }

    const mid = MAP_SIZE / 2;
    // Clear zones: player center, 4 enemy corners
    const clear = (ci, cj, r) => {
      for (let i = ci - r; i <= ci + r; i++)
        for (let j = cj - r; j <= cj + r; j++)
          if (i > 0 && i < MAP_SIZE - 1 && j > 0 && j < MAP_SIZE - 1)
            this.grid[i][j] = EMPTY;
    };
    clear(mid, mid, 3);
    clear(2, 2, 2); clear(MAP_SIZE - 3, 2, 2);
    clear(2, MAP_SIZE - 3, 2); clear(MAP_SIZE - 3, MAP_SIZE - 3, 2);

    // Random interior walls
    for (let i = 1; i < MAP_SIZE - 1; i++) {
      for (let j = 1; j < MAP_SIZE - 1; j++) {
        if (this.grid[i][j] !== EMPTY) continue;
        const r = Math.random();
        if (r < 0.16)      this.grid[i][j] = BRICK;
        else if (r < 0.21) this.grid[i][j] = STEEL;
      }
    }
  }

  _buildMeshes() {
    // Ground
    const gGeo = new THREE.PlaneGeometry(MAP_SIZE * TILE, MAP_SIZE * TILE);
    const gMat = new THREE.MeshLambertMaterial({ color: 0x4a7a42 });
    this._ground = new THREE.Mesh(gGeo, gMat);
    this._ground.rotation.x = -Math.PI / 2;
    this._ground.receiveShadow = true;
    this.scene.add(this._ground);

    // Ground grid lines
    const gridHelper = new THREE.GridHelper(MAP_SIZE * TILE, MAP_SIZE, 0x000000, 0x000000);
    gridHelper.material.opacity = 0.08;
    gridHelper.material.transparent = true;
    this.scene.add(gridHelper);
    this._meshes.push(gridHelper);

    // Shared wall geometry
    const wallGeo = new THREE.BoxGeometry(TILE, TILE, TILE);
    const brickMat = new THREE.MeshLambertMaterial({ color: 0xb84c2a });
    const steelMat = new THREE.MeshLambertMaterial({ color: 0x7a7a8a });

    for (let i = 0; i < MAP_SIZE; i++) {
      for (let j = 0; j < MAP_SIZE; j++) {
        const type = this.grid[i][j];
        if (type === EMPTY) continue;
        const mat = (type === BRICK ? brickMat : steelMat).clone();
        const mesh = new THREE.Mesh(wallGeo, mat);
        const pos = this.tileToWorld(i, j);
        mesh.position.set(pos.x, TILE / 2, pos.z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        const box = new THREE.Box3().setFromObject(mesh);
        this.walls.push({ mesh, type, box, i, j });
      }
    }
  }

  tileToWorld(i, j) {
    return {
      x: (i - MAP_SIZE / 2 + 0.5) * TILE,
      z: (j - MAP_SIZE / 2 + 0.5) * TILE
    };
  }

  worldToTile(x, z) {
    return {
      i: Math.floor(x / TILE + MAP_SIZE / 2),
      j: Math.floor(z / TILE + MAP_SIZE / 2)
    };
  }

  isWalkable(i, j) {
    if (i < 0 || i >= MAP_SIZE || j < 0 || j >= MAP_SIZE) return false;
    return this.grid[i][j] === EMPTY;
  }

  // AABB collision check: can a tank centered at (x,z) with given half-extent move there?
  canMoveTo(x, z, half = 1.7) {
    const { i, j } = this.worldToTile(x, z);
    for (let di = -1; di <= 1; di++) {
      for (let dj = -1; dj <= 1; dj++) {
        const ni = i + di, nj = j + dj;
        if (this.isWalkable(ni, nj)) continue;
        const wp = this.tileToWorld(ni, nj);
        if (Math.abs(x - wp.x) < TILE / 2 + half && Math.abs(z - wp.z) < TILE / 2 + half)
          return false;
      }
    }
    return true;
  }

  destroyBrick(i, j) {
    const idx = this.walls.findIndex(w => w.i === i && w.j === j && w.type === BRICK);
    if (idx === -1) return false;
    const { mesh } = this.walls[idx];
    this.scene.remove(mesh);
    this.grid[i][j] = EMPTY;
    this.walls.splice(idx, 1);
    return true;
  }

  getPlayerSpawn() { return { x: 0, z: 0 }; }

  getEnemySpawns(count) {
    const bases = [
      [2, 2], [MAP_SIZE - 3, 2], [2, MAP_SIZE - 3], [MAP_SIZE - 3, MAP_SIZE - 3],
      [2, MAP_SIZE / 2 | 0], [MAP_SIZE - 3, MAP_SIZE / 2 | 0],
      [MAP_SIZE / 2 | 0, 2], [MAP_SIZE / 2 | 0, MAP_SIZE - 3]
    ];
    return Array.from({ length: count }, (_, k) => {
      const [bi, bj] = bases[k % bases.length];
      // slight jitter within clear zone
      const ni = Math.max(1, Math.min(MAP_SIZE - 2, bi + (Math.random() * 2 - 1 | 0)));
      const nj = Math.max(1, Math.min(MAP_SIZE - 2, bj + (Math.random() * 2 - 1 | 0)));
      return this.tileToWorld(ni, nj);
    });
  }

  destroy() {
    if (this._ground) { this.scene.remove(this._ground); this._ground = null; }
    this._meshes.forEach(m => this.scene.remove(m));
    this.walls.forEach(w => this.scene.remove(w.mesh));
    this.walls = [];
    this.grid = [];
  }
}
