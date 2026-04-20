import { Graphics, Container } from 'pixi.js';

interface Point {
  x: number;
  y: number;
}

export class StructureView {
  readonly container: Container;
  private base: Graphics;
  private extrusion: Graphics;
  private footprint: Point[];
  private depth: number;

  constructor(footprint: Point[], depth: number) {
    this.footprint = footprint;
    this.depth = depth;
    this.container = new Container();
    this.base = new Graphics();
    this.extrusion = new Graphics();
    this.container.addChild(this.base, this.extrusion);
    this.drawBase();
  }

  private drawBase(): void {
    if (this.footprint.length === 2) {
      const [a, b] = this.footprint;
      this.base.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 2, color: 0xffffff });
      return;
    }
    const pts = this.footprint;
    this.base.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) this.base.lineTo(pts[i].x, pts[i].y);
    this.base.lineTo(pts[0].x, pts[0].y).stroke({ width: 2, color: 0xffffff });
  }

  updateExtrusion(cameraX: number, cameraY: number): void {
    this.extrusion.clear();
    if (this.footprint.length < 3) return;
    const topPts = this.footprint.map((p) => ({
      x: p.x + (p.x - cameraX) / this.depth,
      y: p.y + (p.y - cameraY) / this.depth,
    }));
    for (let i = 0; i < this.footprint.length; i++) {
      this.extrusion
        .moveTo(this.footprint[i].x, this.footprint[i].y)
        .lineTo(topPts[i].x, topPts[i].y);
    }
    this.extrusion.moveTo(topPts[0].x, topPts[0].y);
    for (let i = 1; i < topPts.length; i++) this.extrusion.lineTo(topPts[i].x, topPts[i].y);
    this.extrusion.lineTo(topPts[0].x, topPts[0].y).stroke({ width: 2, color: 0xffffff });
  }
}
