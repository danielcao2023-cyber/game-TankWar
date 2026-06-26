import * as THREE from 'three';

export class SceneManager {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB);
    this.scene.fog = new THREE.FogExp2(0x87CEEB, 0.007);

    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 600);
    this.camera.position.set(0, 18, 22);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    const el = this.renderer.domElement;
    el.style.cssText = 'position:fixed;top:0;left:0;z-index:0;';
    document.body.insertBefore(el, document.body.firstChild);

    this._buildLights();

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  _buildLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(ambient);

    this.sun = new THREE.DirectionalLight(0xfff4e0, 1.1);
    this.sun.position.set(70, 120, 50);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.setScalar(2048);
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 500;
    const s = 90;
    Object.assign(this.sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s });
    this.scene.add(this.sun);

    const hemi = new THREE.HemisphereLight(0xb0d8f0, 0x6b5a3e, 0.45);
    this.scene.add(hemi);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
