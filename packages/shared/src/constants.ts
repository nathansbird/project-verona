export const SIM_TICK_HZ = 30;
export const SIM_TICK_SECONDS = 1 / SIM_TICK_HZ;
export const BROADCAST_TICK_HZ = 20;
export const INPUT_SEND_HZ = 30;

export const SHIP_RADIUS = 20;
// Slightly padded outward from the visual wireframe so landing a hit feels
// a touch more forgiving than pixel-perfect.
export const SHIP_HULL: ReadonlyArray<readonly [number, number]> = [
  [4, 0],
  [-37, 18],
  [-37, -18],
];
export const SHIP_MAX_SPEED = 2400;
export const SHIP_THRUST = 5000;
export const SHIP_TURN_RATE = 4.0;
export const SHIP_TURN_ACCEL = 12.0;
export const SHIP_LINEAR_DAMPING = 1.2;
export const SHIP_ANGULAR_DAMPING = 2.5;

export const PROJECTILE_RADIUS = 4;
export const PROJECTILE_SPEED = 2000;
export const PROJECTILE_LIFETIME_SECONDS = 1.6;
export const PROJECTILE_SPAWN_COOLDOWN_SECONDS = 0.09;
export const PROJECTILE_NOSE_OFFSET = 10;

export const DEFAULT_AMMO = 25;
export const DEFAULT_HEALTH = 100;
export const PROJECTILE_DAMAGE = 10;
export const RESPAWN_DELAY_SECONDS = 2.5;

export const INTERP_BUFFER_MS = 100;

export const WORLD_BOUND = 4000;
