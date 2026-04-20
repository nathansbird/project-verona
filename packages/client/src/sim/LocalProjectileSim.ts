import { SIM_TICK_SECONDS } from '@glide/shared';

interface LocalProjectile {
  id: string;
  ownerSessionId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  spawnTick: number;
  despawnTick: number;
}

interface Point {
  x: number;
  y: number;
}

interface StructureEdges {
  points: Point[];
  closed: boolean;
}

export class LocalProjectileSim {
  private projectiles = new Map<string, LocalProjectile>();
  private structures: StructureEdges[] = [];
  private tick = 0;

  spawn(p: LocalProjectile): void {
    this.projectiles.set(p.id, p);
  }

  rename(oldId: string, newId: string): boolean {
    const p = this.projectiles.get(oldId);
    if (!p) return false;
    this.projectiles.delete(oldId);
    p.id = newId;
    this.projectiles.set(newId, p);
    return true;
  }

  has(id: string): boolean {
    return this.projectiles.has(id);
  }

  cancel(id: string): void {
    this.projectiles.delete(id);
  }

  addStructure(footprint: Point[]): void {
    if (footprint.length < 2) return;
    this.structures.push({
      points: footprint.map((p) => ({ x: p.x, y: p.y })),
      closed: footprint.length > 2,
    });
  }

  step(): void {
    this.tick += 1;
    for (const [id, p] of this.projectiles) {
      const x0 = p.x;
      const y0 = p.y;
      p.x += p.vx * SIM_TICK_SECONDS;
      p.y += p.vy * SIM_TICK_SECONDS;
      if (this.tick >= p.despawnTick || this.sweptHitsStructure(x0, y0, p.x, p.y)) {
        this.projectiles.delete(id);
      }
    }
  }

  entries(): Iterable<[string, LocalProjectile]> {
    return this.projectiles.entries();
  }

  get currentTick(): number {
    return this.tick;
  }

  private sweptHitsStructure(x0: number, y0: number, x1: number, y1: number): boolean {
    for (const s of this.structures) {
      const pts = s.points;
      const n = pts.length;
      const edgeCount = s.closed ? n : n - 1;
      for (let i = 0; i < edgeCount; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % n];
        if (segmentsIntersect(x0, y0, x1, y1, a.x, a.y, b.x, b.y)) return true;
      }
    }
    return false;
  }
}

function segmentsIntersect(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number,
): boolean {
  const d1 = cross(dx - cx, dy - cy, ax - cx, ay - cy);
  const d2 = cross(dx - cx, dy - cy, bx - cx, by - cy);
  const d3 = cross(bx - ax, by - ay, cx - ax, cy - ay);
  const d4 = cross(bx - ax, by - ay, dx - ax, dy - ay);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }
  if (d1 === 0 && onSegment(cx, cy, dx, dy, ax, ay)) return true;
  if (d2 === 0 && onSegment(cx, cy, dx, dy, bx, by)) return true;
  if (d3 === 0 && onSegment(ax, ay, bx, by, cx, cy)) return true;
  if (d4 === 0 && onSegment(ax, ay, bx, by, dx, dy)) return true;
  return false;
}

function cross(ux: number, uy: number, vx: number, vy: number): number {
  return ux * vy - uy * vx;
}

function onSegment(ax: number, ay: number, bx: number, by: number, px: number, py: number): boolean {
  return (
    Math.min(ax, bx) <= px && px <= Math.max(ax, bx) &&
    Math.min(ay, by) <= py && py <= Math.max(ay, by)
  );
}
