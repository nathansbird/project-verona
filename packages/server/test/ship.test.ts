import { describe, it, expect } from 'vitest';
import { SimWorld, Ship } from '@glide/shared';
import { InputFrame, SHIP_MAX_SPEED } from '@glide/shared';

function emptyInput(seq: number): InputFrame {
  return { seq, accel: false, left: false, right: false, brake: false, shoot: false };
}

describe('Ship', () => {
  it('stays still with no input', () => {
    const w = new SimWorld();
    const ship = new Ship(w.world, 0, 0);
    for (let i = 0; i < 30; i++) {
      ship.applyInput(emptyInput(i));
      w.step();
    }
    const s = ship.getState();
    expect(Math.abs(s.x)).toBeLessThan(0.01);
    expect(Math.abs(s.y)).toBeLessThan(0.01);
  });

  it('accelerates forward when thrusting', () => {
    const w = new SimWorld();
    const ship = new Ship(w.world, 0, 0);
    const input: InputFrame = { ...emptyInput(1), accel: true };
    for (let i = 0; i < 30; i++) {
      ship.applyInput({ ...input, seq: i });
      w.step();
    }
    const s = ship.getState();
    expect(s.x).toBeGreaterThan(0);
    expect(Math.hypot(s.vx, s.vy)).toBeGreaterThan(1);
  });

  it('respects max speed cap', () => {
    const w = new SimWorld();
    const ship = new Ship(w.world, 0, 0);
    const input: InputFrame = { ...emptyInput(1), accel: true };
    for (let i = 0; i < 300; i++) {
      ship.applyInput({ ...input, seq: i });
      w.step();
    }
    const s = ship.getState();
    expect(Math.hypot(s.vx, s.vy)).toBeLessThanOrEqual(SHIP_MAX_SPEED * 1.05);
  });

  it('turns with left input', () => {
    const w = new SimWorld();
    const ship = new Ship(w.world, 0, 0);
    const input: InputFrame = { ...emptyInput(1), left: true };
    for (let i = 0; i < 30; i++) {
      ship.applyInput({ ...input, seq: i });
      w.step();
    }
    expect(ship.getState().rotation).toBeLessThan(0);
  });
});
