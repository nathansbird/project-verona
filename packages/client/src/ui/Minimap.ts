import { Application, Container, Graphics } from 'pixi.js';
import { ArenaState } from '@glide/shared';

export class Minimap {
  private gfx: Graphics;
  private app: Application;
  private readonly size = 160;
  private readonly worldRadius = 1200;

  constructor(app: Application, ui: Container) {
    this.app = app;
    this.gfx = new Graphics();
    ui.addChild(this.gfx);
  }

  update(state: ArenaState, ownX: number, ownY: number, ownSessionId: string): void {
    const size = this.size;
    const cx = this.app.screen.width - size - 20;
    const cy = 20;
    const scale = size / (2 * this.worldRadius);
    this.gfx.clear();
    this.gfx.rect(cx, cy, size, size).stroke({ width: 2, color: 0xffffff, alpha: 0.6 });

    for (const [, s] of state.structures) {
      if (s.footprint.length < 3) continue;
      const first = s.footprint[0];
      if (!first) continue;
      const fx = cx + size / 2 + (first.x - ownX) * scale;
      const fy = cy + size / 2 + (first.y - ownY) * scale;
      this.gfx.moveTo(fx, fy);
      for (let i = 1; i < s.footprint.length; i++) {
        const p = s.footprint[i];
        if (!p) continue;
        this.gfx.lineTo(cx + size / 2 + (p.x - ownX) * scale, cy + size / 2 + (p.y - ownY) * scale);
      }
      this.gfx.lineTo(fx, fy).stroke({ width: 1, color: 0xffffff, alpha: 0.5 });
    }

    this.gfx.circle(cx + size / 2, cy + size / 2, 3).fill(0xffffff);

    for (const [sid, ship] of state.ships) {
      if (sid === ownSessionId) continue;
      const mx = cx + size / 2 + (ship.x - ownX) * scale;
      const my = cy + size / 2 + (ship.y - ownY) * scale;
      if (mx >= cx && mx <= cx + size && my >= cy && my <= cy + size) {
        this.gfx.circle(mx, my, 2).fill(0xff6666);
      }
    }
  }
}
