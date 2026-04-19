import { Application, Container, Graphics } from 'pixi.js';
import { ArenaState, WORLD_BOUND } from '@glide/shared';

export class Minimap {
  private frame: Graphics;
  private content: Graphics;
  private mask: Graphics;
  private container: Container;
  private app: Application;
  private readonly size = 160;
  private readonly worldRadius = 1200;

  constructor(app: Application, ui: Container) {
    this.app = app;
    this.container = new Container();
    this.content = new Graphics();
    this.mask = new Graphics();
    this.frame = new Graphics();
    this.container.addChild(this.content, this.mask, this.frame);
    this.content.mask = this.mask;
    ui.addChild(this.container);
  }

  update(
    state: ArenaState,
    ownX: number,
    ownY: number,
    ownRotation: number,
    ownSessionId: string,
  ): void {
    const size = this.size;
    const half = size / 2;
    const cx = this.app.screen.width - size - 20;
    const cy = 20;
    const scale = size / (2 * this.worldRadius);
    const mapCx = cx + half;
    const mapCy = cy + half;
    const a = -ownRotation - Math.PI / 2;
    const cosA = Math.cos(a);
    const sinA = Math.sin(a);
    const project = (wx: number, wy: number): { x: number; y: number } => {
      const dx = wx - ownX;
      const dy = wy - ownY;
      const rx = dx * cosA - dy * sinA;
      const ry = dx * sinA + dy * cosA;
      return { x: mapCx + rx * scale, y: mapCy + ry * scale };
    };

    this.mask.clear().rect(cx, cy, size, size).fill(0xffffff);
    this.frame.clear().rect(cx, cy, size, size).stroke({ width: 2, color: 0xffffff, alpha: 0.6 });
    this.content.clear();

    const nw = project(-WORLD_BOUND, -WORLD_BOUND);
    const ne = project(WORLD_BOUND, -WORLD_BOUND);
    const se = project(WORLD_BOUND, WORLD_BOUND);
    const sw = project(-WORLD_BOUND, WORLD_BOUND);
    this.content
      .moveTo(nw.x, nw.y)
      .lineTo(ne.x, ne.y)
      .lineTo(se.x, se.y)
      .lineTo(sw.x, sw.y)
      .lineTo(nw.x, nw.y)
      .stroke({ width: 1.5, color: 0xff8844, alpha: 0.7 });

    for (const [, s] of state.structures) {
      if (s.footprint.length < 3) continue;
      const first = s.footprint[0];
      if (!first) continue;
      const p0 = project(first.x, first.y);
      this.content.moveTo(p0.x, p0.y);
      for (let i = 1; i < s.footprint.length; i++) {
        const p = s.footprint[i];
        if (!p) continue;
        const pp = project(p.x, p.y);
        this.content.lineTo(pp.x, pp.y);
      }
      this.content.lineTo(p0.x, p0.y).stroke({ width: 1, color: 0xffffff, alpha: 0.35 });
    }

    this.content.circle(mapCx, mapCy, 3).fill(0xffffff);

    const edgeMargin = 4;
    const maxOffset = half - edgeMargin;
    for (const [sid, ship] of state.ships) {
      if (sid === ownSessionId) continue;
      const p = project(ship.x, ship.y);
      const ox = p.x - mapCx;
      const oy = p.y - mapCy;
      const absX = Math.abs(ox);
      const absY = Math.abs(oy);
      if (absX <= maxOffset && absY <= maxOffset) {
        this.content.circle(p.x, p.y, 2).fill(0xff6666);
      } else {
        const clamp = maxOffset / Math.max(absX, absY);
        this.content.circle(mapCx + ox * clamp, mapCy + oy * clamp, 2).fill(0xffaaaa);
      }
    }
  }
}
