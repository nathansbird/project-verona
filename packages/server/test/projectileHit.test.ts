import { describe, it, expect } from 'vitest';
import { SimWorld, Ship, Projectile } from '@glide/shared';

describe('projectile-ship contact', () => {
  it('projectile body and ship body overlap produces begin-contact event', () => {
    const w = new SimWorld();
    const ship = new Ship(w.world, 0, 0);
    const projectile = new Projectile(w.world, {
      id: 'p1',
      ownerSessionId: 'other',
      x: -50,
      y: 0,
      vx: 60,
      vy: 0,
      spawnTick: 0,
      despawnTick: 60,
    });
    let contacts = 0;
    w.world.on('begin-contact', (c) => {
      const a = c.getFixtureA().getBody().getUserData() as any;
      const b = c.getFixtureB().getBody().getUserData() as any;
      if (
        (a?.kind === 'projectile' && b?.kind === 'ship') ||
        (a?.kind === 'ship' && b?.kind === 'projectile')
      ) {
        contacts += 1;
      }
    });
    for (let i = 0; i < 60; i++) w.step();
    expect(contacts).toBeGreaterThan(0);
    expect(ship.body).toBeDefined();
    expect(projectile.body).toBeDefined();
  });
});
