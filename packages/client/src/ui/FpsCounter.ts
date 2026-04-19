import { Application, Container, Text } from 'pixi.js';

export class FpsCounter {
  private text: Text;
  private app: Application;
  private frameTimes: number[] = [];
  private lastTime = performance.now();

  constructor(app: Application, ui: Container) {
    this.app = app;
    this.text = new Text({
      text: 'FPS: --',
      style: { fill: 0xffffff, fontSize: 16, fontFamily: 'monospace' },
    });
    this.text.position.set(20, 20);
    this.text.alpha = 0.35;
    ui.addChild(this.text);
  }

  update(): void {
    const now = performance.now();
    const dt = now - this.lastTime;
    this.lastTime = now;
    this.frameTimes.push(dt);
    if (this.frameTimes.length > 60) this.frameTimes.shift();
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    const fps = 1000 / avg;
    this.text.text = `FPS: ${fps.toFixed(1)}`;
  }
}
