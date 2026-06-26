export class Input {
  constructor() {
    this.keys = {};
    this.mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2, clicked: false };

    const prevent = new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space']);
    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (prevent.has(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; });
    window.addEventListener('mousemove', e => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
    window.addEventListener('mousedown', e => {
      if (e.button === 0) { this.mouse.clicked = true; this.mouse._pending = true; }
    });
    window.addEventListener('mouseup', e => {
      if (e.button === 0) this.mouse.clicked = false;
    });
    window.addEventListener('click', e => {
      if (e.button === 0) this.mouse._pending = true;
    });
  }

  isDown(code) { return !!this.keys[code]; }
}
