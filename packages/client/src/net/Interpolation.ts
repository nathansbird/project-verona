import { INTERP_BUFFER_MS } from '@glide/shared';

interface Snapshot {
  receivedAt: number;
  x: number;
  y: number;
  rotation: number;
}

export class InterpolationBuffer {
  private snapshots: Snapshot[] = [];

  push(x: number, y: number, rotation: number): void {
    this.snapshots.push({ receivedAt: performance.now(), x, y, rotation });
    if (this.snapshots.length > 30) this.snapshots.shift();
  }

  sample(now: number): { x: number; y: number; rotation: number } | null {
    const targetTime = now - INTERP_BUFFER_MS;
    if (this.snapshots.length === 0) return null;
    if (this.snapshots.length === 1) {
      const s = this.snapshots[0];
      return { x: s.x, y: s.y, rotation: s.rotation };
    }

    let before = this.snapshots[0];
    let after = this.snapshots[this.snapshots.length - 1];
    for (let i = 0; i < this.snapshots.length - 1; i++) {
      if (this.snapshots[i].receivedAt <= targetTime && this.snapshots[i + 1].receivedAt >= targetTime) {
        before = this.snapshots[i];
        after = this.snapshots[i + 1];
        break;
      }
    }

    const span = after.receivedAt - before.receivedAt;
    const t = span <= 0 ? 0 : (targetTime - before.receivedAt) / span;
    const clamped = Math.max(0, Math.min(1, t));
    return {
      x: before.x + (after.x - before.x) * clamped,
      y: before.y + (after.y - before.y) * clamped,
      rotation: before.rotation + shortAngleDelta(before.rotation, after.rotation) * clamped,
    };
  }
}

function shortAngleDelta(a: number, b: number): number {
  const TWO_PI = Math.PI * 2;
  let d = (b - a) % TWO_PI;
  if (d > Math.PI) d -= TWO_PI;
  if (d < -Math.PI) d += TWO_PI;
  return d;
}
