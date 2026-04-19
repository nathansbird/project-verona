export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function normalizeAngle(angle: number): number {
  const TWO_PI = Math.PI * 2;
  let a = angle % TWO_PI;
  if (a > Math.PI) a -= TWO_PI;
  if (a < -Math.PI) a += TWO_PI;
  return a;
}

export function angleBetween(from: number, to: number): number {
  return normalizeAngle(to - from);
}
