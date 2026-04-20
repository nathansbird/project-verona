import { describe, it, expect } from 'vitest';
import { clamp, normalizeAngle, angleBetween } from '../src/math.js';

describe('clamp', () => {
  it('clamps below min', () => expect(clamp(-5, 0, 10)).toBe(0));
  it('clamps above max', () => expect(clamp(15, 0, 10)).toBe(10));
  it('passes values in range', () => expect(clamp(5, 0, 10)).toBe(5));
});

describe('normalizeAngle', () => {
  it('leaves angle in [-pi, pi] unchanged', () => {
    expect(normalizeAngle(1)).toBeCloseTo(1);
  });
  it('wraps angles greater than pi', () => {
    expect(normalizeAngle(Math.PI * 3)).toBeCloseTo(Math.PI);
  });
  it('wraps angles less than -pi', () => {
    expect(normalizeAngle(-Math.PI * 3)).toBeCloseTo(-Math.PI);
  });
});

describe('angleBetween', () => {
  it('returns shortest signed difference', () => {
    expect(angleBetween(0, Math.PI / 2)).toBeCloseTo(Math.PI / 2);
    expect(angleBetween(Math.PI / 2, 0)).toBeCloseTo(-Math.PI / 2);
  });
  it('handles wraparound', () => {
    expect(angleBetween(-Math.PI + 0.1, Math.PI - 0.1)).toBeCloseTo(-0.2, 5);
  });
});
