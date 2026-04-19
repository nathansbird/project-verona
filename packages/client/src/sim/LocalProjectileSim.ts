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

export class LocalProjectileSim {
  private projectiles = new Map<string, LocalProjectile>();
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

  step(): void {
    this.tick += 1;
    for (const [id, p] of this.projectiles) {
      p.x += p.vx * SIM_TICK_SECONDS;
      p.y += p.vy * SIM_TICK_SECONDS;
      if (this.tick >= p.despawnTick) this.projectiles.delete(id);
    }
  }

  entries(): Iterable<[string, LocalProjectile]> {
    return this.projectiles.entries();
  }

  get currentTick(): number {
    return this.tick;
  }
}
