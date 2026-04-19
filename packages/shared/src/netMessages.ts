export interface ProjectileSpawnEvent {
  id: string;
  ownerSessionId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  spawnTick: number;
  despawnTick: number;
}

export interface ProjectileHitEvent {
  id: string;
  x: number;
  y: number;
  victimSessionId: string;
  ownerSessionId: string;
}

export interface ProjectileCancelEvent {
  id: string;
}

export interface ShipDeathEvent {
  sessionId: string;
  killerSessionId: string | null;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationV: number;
}

export interface ShipRespawnEvent {
  sessionId: string;
  x: number;
  y: number;
  rotation: number;
}

export interface InputAckMessage {
  lastSeq: number;
}

export const PROJECTILE_SPAWN = 'pSpawn';
export const PROJECTILE_HIT = 'pHit';
export const PROJECTILE_CANCEL = 'pCancel';
export const SHIP_DEATH = 'sDeath';
export const SHIP_RESPAWN = 'sRespawn';
export const INPUT_ACK = 'inputAck';
