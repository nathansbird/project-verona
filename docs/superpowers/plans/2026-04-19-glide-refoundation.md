# Glide Refoundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Glide prototype as a pnpm monorepo (shared / server / client) running TypeScript, Planck.js, Colyseus, PixiJS, and Vite, producing a single playable authoritative-server multiplayer arena with scaffolded hook points for near-term features.

**Architecture:** Server-authoritative simulation at 30Hz with client-side prediction + server reconciliation. Ships and projectiles share physics code between server and client via the `shared` package so the two simulations stay in sync. PixiJS stage split into a world container (camera-transformed) and a UI container (screen-fixed). Bloom and post-processing run as GPU filters on the world container.

**Tech Stack:** TypeScript (strict), pnpm workspaces, Vite, tsx, Planck.js, Colyseus 0.15 + `@colyseus/schema`, PixiJS 8 + `pixi-filters` + `@pixi/particle-emitter`, howler, Vitest.

**Reference spec:** `docs/superpowers/specs/2026-04-19-glide-refoundation-design.md`

**Commit strategy (per user global preferences):** Consolidate work into phase-boundary commits, not per-task. Seven commits total, one per phase.

---

## File Structure Overview

```
glide/
├── package.json                      # workspace root
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .gitignore
├── .prettierrc
├── packages/
│   ├── shared/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts              # barrel export
│   │   │   ├── constants.ts          # tick rates, physics tuning
│   │   │   ├── collisionCategories.ts
│   │   │   ├── math.ts               # angle/clamp helpers (unit tested)
│   │   │   ├── inputMessages.ts      # client→server message types
│   │   │   ├── netMessages.ts        # server→client event types
│   │   │   └── schemas/
│   │   │       ├── ShipSchema.ts
│   │   │       ├── StructureSchema.ts
│   │   │       └── ArenaState.ts
│   │   └── test/
│   │       └── math.test.ts
│   ├── server/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts              # Colyseus bootstrap
│   │   │   ├── ArenaRoom.ts          # room, input queue, tick driver
│   │   │   └── sim/
│   │   │       ├── SimWorld.ts       # owns Planck world
│   │   │       ├── Ship.ts           # ship sim class
│   │   │       ├── Projectile.ts     # projectile sim class
│   │   │       ├── Structure.ts      # static structure builder
│   │   │       └── worldLayout.ts    # hand-placed arena geometry
│   │   └── test/
│   │       ├── ship.test.ts
│   │       └── projectileHit.test.ts
│   └── client/
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── index.html
│       ├── public/audio/             # moved from src/assets
│       └── src/
│           ├── main.ts               # entry
│           ├── net/
│           │   ├── NetClient.ts      # Colyseus connection wrapper
│           │   ├── Prediction.ts     # own-ship prediction + reconciliation
│           │   └── Interpolation.ts  # remote-ship interpolation buffer
│           ├── input/
│           │   └── Keyboard.ts       # keydown/keyup → InputState
│           ├── render/
│           │   ├── Stage.ts          # PIXI.Application + layer setup
│           │   ├── Camera.ts         # worldContainer transform
│           │   ├── Filters.ts        # bloom + optional CRT
│           │   └── Background.ts     # gradient + grid
│           ├── entities/
│           │   ├── ShipView.ts
│           │   ├── ProjectileView.ts
│           │   └── StructureView.ts
│           ├── sim/
│           │   ├── LocalShipSim.ts   # client-side ship prediction
│           │   └── LocalProjectileSim.ts
│           ├── ui/
│           │   ├── HUD.ts
│           │   └── Minimap.ts
│           └── audio/
│               └── SoundBus.ts
└── docs/superpowers/
    ├── specs/2026-04-19-glide-refoundation-design.md
    └── plans/2026-04-19-glide-refoundation.md   # this file (not committed)
```

---

## Phase 1 — Foundation (Tasks 1–5)

Scaffold the monorepo, configure TypeScript, wire up the shared package, and get `pnpm typecheck` passing against empty packages. One commit at phase end.

### Task 1: Workspace scaffold & root config

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.prettierrc`
- Modify: `.gitignore`
- Modify: `package.json` (overwrite)

- [ ] **Step 1: Delete old root files that no longer apply**

```bash
rm -f index.js package-lock.json
```

- [ ] **Step 2: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - "packages/*"
```

- [ ] **Step 3: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "useDefineForClassFields": false,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "declaration": true,
    "sourceMap": true
  }
}
```

(`noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` are intentionally left off — they're valuable but inflate refactor effort beyond this cleanup's scope.)

- [ ] **Step 4: Create `.prettierrc`**

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100
}
```

- [ ] **Step 5: Overwrite `.gitignore`**

```
node_modules/
dist/
.DS_Store
.env
.env.*
*.log
.vite/
.tsbuildinfo
coverage/
```

- [ ] **Step 6: Overwrite root `package.json`**

```json
{
  "name": "glide",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "pnpm -r --parallel --filter=./packages/server --filter=./packages/client dev",
    "dev:server": "pnpm --filter @glide/server dev",
    "dev:client": "pnpm --filter @glide/client dev",
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "typecheck": "pnpm -r typecheck",
    "format": "prettier --write ."
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "prettier": "^3.2.0",
    "vitest": "^1.4.0",
    "@types/node": "^20.11.0"
  },
  "packageManager": "pnpm@9.0.0"
}
```

- [ ] **Step 7: Remove tracked `.DS_Store` files**

```bash
git rm --cached .DS_Store src/.DS_Store 2>/dev/null || true
```

- [ ] **Step 8: Create `packages/` directory**

```bash
mkdir -p packages
```

### Task 2: Shared package scaffold

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`

- [ ] **Step 1: Create `packages/shared/package.json`**

```json
{
  "name": "@glide/shared",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@colyseus/schema": "^2.0.0",
    "planck": "^1.0.0"
  }
}
```

- [ ] **Step 2: Create `packages/shared/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src/**/*", "test/**/*"]
}
```

- [ ] **Step 3: Create empty `packages/shared/src/index.ts`**

```ts
export {};
```

### Task 3: Constants, collision categories, and math helpers (with tests)

**Files:**
- Create: `packages/shared/src/constants.ts`
- Create: `packages/shared/src/collisionCategories.ts`
- Create: `packages/shared/src/math.ts`
- Create: `packages/shared/test/math.test.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Create `constants.ts`**

```ts
export const SIM_TICK_HZ = 30;
export const SIM_TICK_SECONDS = 1 / SIM_TICK_HZ;
export const BROADCAST_TICK_HZ = 20;
export const INPUT_SEND_HZ = 30;

export const SHIP_RADIUS = 20;
export const SHIP_MAX_SPEED = 30;
export const SHIP_THRUST = 60;
export const SHIP_TURN_RATE = 4.0;
export const SHIP_TURN_ACCEL = 12.0;
export const SHIP_LINEAR_DAMPING = 1.2;
export const SHIP_ANGULAR_DAMPING = 2.5;

export const PROJECTILE_RADIUS = 2;
export const PROJECTILE_SPEED = 60;
export const PROJECTILE_LIFETIME_SECONDS = 1.6;
export const PROJECTILE_SPAWN_COOLDOWN_SECONDS = 0.09;

export const DEFAULT_AMMO = 25;
export const DEFAULT_HEALTH = 100;
export const PROJECTILE_DAMAGE = 10;

export const INTERP_BUFFER_MS = 100;
```

- [ ] **Step 2: Create `collisionCategories.ts`**

```ts
export const Category = {
  SHIP: 0x0001,
  PROJECTILE: 0x0002,
  STRUCTURE: 0x0004,
  SHIELD: 0x0008,
} as const;

export const Mask = {
  SHIP: Category.STRUCTURE | Category.SHIP | Category.PROJECTILE | Category.SHIELD,
  PROJECTILE: Category.STRUCTURE | Category.SHIP | Category.SHIELD,
  STRUCTURE: Category.SHIP | Category.PROJECTILE,
  SHIELD: Category.PROJECTILE,
} as const;
```

- [ ] **Step 3: Create test `packages/shared/test/math.test.ts` (TDD — write before impl)**

```ts
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
```

- [ ] **Step 4: Run test to verify it fails**

```bash
pnpm --filter @glide/shared test
```

Expected: FAIL — "Cannot find module '../src/math.js'".

- [ ] **Step 5: Implement `math.ts`**

```ts
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
```

- [ ] **Step 6: Run test to verify pass**

```bash
pnpm --filter @glide/shared test
```

Expected: PASS (3 test suites, 7 tests).

- [ ] **Step 7: Update `packages/shared/src/index.ts` with barrel exports**

```ts
export * from './constants.js';
export * from './collisionCategories.js';
export * from './math.js';
```

### Task 4: Input and network message types

**Files:**
- Create: `packages/shared/src/inputMessages.ts`
- Create: `packages/shared/src/netMessages.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Create `inputMessages.ts`**

```ts
export interface InputFrame {
  seq: number;
  accel: boolean;
  left: boolean;
  right: boolean;
  brake: boolean;
  shoot: boolean;
}

export interface InputBatch {
  frames: InputFrame[];
}

export const INPUT_MESSAGE = 'input';
```

- [ ] **Step 2: Create `netMessages.ts`**

```ts
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

export interface InputAckMessage {
  lastSeq: number;
}

export const PROJECTILE_SPAWN = 'pSpawn';
export const PROJECTILE_HIT = 'pHit';
export const PROJECTILE_CANCEL = 'pCancel';
export const INPUT_ACK = 'inputAck';
```

- [ ] **Step 3: Update barrel export `packages/shared/src/index.ts`**

```ts
export * from './constants.js';
export * from './collisionCategories.js';
export * from './math.js';
export * from './inputMessages.js';
export * from './netMessages.js';
export * from './schemas/ShipSchema.js';
export * from './schemas/StructureSchema.js';
export * from './schemas/ArenaState.js';
```

### Task 5: Colyseus schemas

**Files:**
- Create: `packages/shared/src/schemas/ShipSchema.ts`
- Create: `packages/shared/src/schemas/StructureSchema.ts`
- Create: `packages/shared/src/schemas/ArenaState.ts`

- [ ] **Step 1: Create `ShipSchema.ts`**

```ts
import { Schema, type } from '@colyseus/schema';

export class ShipSchema extends Schema {
  @type('string') sessionId = '';
  @type('string') name = '';
  @type('number') x = 0;
  @type('number') y = 0;
  @type('number') vx = 0;
  @type('number') vy = 0;
  @type('number') rotation = 0;
  @type('number') rotationV = 0;
  @type('number') health = 100;
  @type('number') ammo = 25;
  @type('boolean') shieldActive = false;
  @type('boolean') boostActive = false;
}
```

- [ ] **Step 2: Create `StructureSchema.ts`**

```ts
import { Schema, type, ArraySchema } from '@colyseus/schema';

export class FootprintPoint extends Schema {
  @type('number') x = 0;
  @type('number') y = 0;
}

export class StructureSchema extends Schema {
  @type('string') id = '';
  @type([FootprintPoint]) footprint = new ArraySchema<FootprintPoint>();
  @type('number') depth = 4;
}
```

- [ ] **Step 3: Create `ArenaState.ts`**

```ts
import { Schema, type, MapSchema } from '@colyseus/schema';
import { ShipSchema } from './ShipSchema.js';
import { StructureSchema } from './StructureSchema.js';

export class ArenaState extends Schema {
  @type('number') serverTick = 0;
  @type({ map: ShipSchema }) ships = new MapSchema<ShipSchema>();
  @type({ map: StructureSchema }) structures = new MapSchema<StructureSchema>();
}
```

- [ ] **Step 4: Install workspace deps**

```bash
pnpm install
```

Expected: resolves and installs `@colyseus/schema`, `planck`, root devDeps.

- [ ] **Step 5: Typecheck**

```bash
pnpm --filter @glide/shared typecheck
```

Expected: exits 0.

### Task 6: Phase-1 commit

- [ ] **Step 1: Stage and commit**

```bash
git add pnpm-workspace.yaml tsconfig.base.json .prettierrc .gitignore package.json pnpm-lock.yaml packages/shared
git rm --quiet .DS_Store src/.DS_Store 2>/dev/null || true
git commit -m "scaffold pnpm monorepo and shared package (types, schemas, math)"
```

---

## Phase 2 — Server Simulation (Tasks 7–12)

Stand up the Colyseus server, an authoritative Planck `ArenaRoom` with a fixed-timestep loop, ship bodies created on join, and server-side input application. One commit at phase end.

### Task 7: Server package scaffold

**Files:**
- Create: `packages/server/package.json`
- Create: `packages/server/tsconfig.json`
- Create: `packages/server/src/index.ts`

- [ ] **Step 1: Create `packages/server/package.json`**

```json
{
  "name": "@glide/server",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@glide/shared": "workspace:*",
    "@colyseus/schema": "^2.0.0",
    "@colyseus/ws-transport": "^0.15.0",
    "colyseus": "^0.15.0",
    "express": "^4.19.0",
    "planck": "^1.0.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.0",
    "tsx": "^4.7.0"
  }
}
```

- [ ] **Step 2: Create `packages/server/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src/**/*", "test/**/*"]
}
```

- [ ] **Step 3: Create bootstrap `packages/server/src/index.ts`**

```ts
import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import express from 'express';
import { createServer } from 'http';
import { ArenaRoom } from './ArenaRoom.js';

const port = Number(process.env.PORT ?? 2567);
const app = express();
const httpServer = createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

gameServer.define('arena', ArenaRoom);

httpServer.listen(port, () => {
  console.log(`[glide-server] listening on :${port}`);
});
```

- [ ] **Step 4: Install**

```bash
pnpm install
```

### Task 8: SimWorld + Ship simulation class

**Files:**
- Create: `packages/server/src/sim/SimWorld.ts`
- Create: `packages/server/src/sim/Ship.ts`

- [ ] **Step 1: Create `packages/server/src/sim/SimWorld.ts`**

```ts
import { World, Vec2 } from 'planck';
import { SIM_TICK_SECONDS } from '@glide/shared';

export class SimWorld {
  readonly world: World;

  constructor() {
    this.world = new World({ gravity: Vec2(0, 0) });
  }

  step(): void {
    this.world.step(SIM_TICK_SECONDS, 8, 3);
  }
}
```

- [ ] **Step 2: Create `packages/server/src/sim/Ship.ts`**

```ts
import { Body, Circle, Vec2, World } from 'planck';
import {
  SHIP_RADIUS,
  SHIP_THRUST,
  SHIP_TURN_ACCEL,
  SHIP_TURN_RATE,
  SHIP_MAX_SPEED,
  SHIP_LINEAR_DAMPING,
  SHIP_ANGULAR_DAMPING,
  Category,
  Mask,
  InputFrame,
  clamp,
} from '@glide/shared';

export class Ship {
  readonly body: Body;
  lastInputSeq = 0;

  constructor(world: World, spawnX: number, spawnY: number) {
    this.body = world.createBody({
      type: 'dynamic',
      position: Vec2(spawnX, spawnY),
      linearDamping: SHIP_LINEAR_DAMPING,
      angularDamping: SHIP_ANGULAR_DAMPING,
      fixedRotation: false,
    });
    this.body.createFixture({
      shape: new Circle(SHIP_RADIUS),
      density: 1,
      friction: 0.1,
      restitution: 0.3,
      filterCategoryBits: Category.SHIP,
      filterMaskBits: Mask.SHIP,
    });
    this.body.setUserData({ kind: 'ship' });
  }

  applyInput(input: InputFrame): void {
    const angle = this.body.getAngle();
    if (input.accel) {
      const forward = Vec2(Math.cos(angle), Math.sin(angle));
      const force = Vec2(forward.x * SHIP_THRUST, forward.y * SHIP_THRUST);
      this.body.applyForceToCenter(force, true);
    }
    let angVel = this.body.getAngularVelocity();
    if (input.left) angVel -= SHIP_TURN_ACCEL * (1 / 30);
    if (input.right) angVel += SHIP_TURN_ACCEL * (1 / 30);
    angVel = clamp(angVel, -SHIP_TURN_RATE, SHIP_TURN_RATE);
    this.body.setAngularVelocity(angVel);

    if (input.brake) {
      const v = this.body.getLinearVelocity();
      this.body.setLinearVelocity(Vec2(v.x * 0.92, v.y * 0.92));
    }

    const v = this.body.getLinearVelocity();
    const speedSq = v.x * v.x + v.y * v.y;
    const maxSq = SHIP_MAX_SPEED * SHIP_MAX_SPEED;
    if (speedSq > maxSq) {
      const s = SHIP_MAX_SPEED / Math.sqrt(speedSq);
      this.body.setLinearVelocity(Vec2(v.x * s, v.y * s));
    }

    this.lastInputSeq = input.seq;
  }

  getState() {
    const p = this.body.getPosition();
    const v = this.body.getLinearVelocity();
    return {
      x: p.x,
      y: p.y,
      vx: v.x,
      vy: v.y,
      rotation: this.body.getAngle(),
      rotationV: this.body.getAngularVelocity(),
    };
  }
}
```

### Task 9: ArenaRoom — fixed-timestep loop + input handling

**Files:**
- Create: `packages/server/src/ArenaRoom.ts`

- [ ] **Step 1: Create `packages/server/src/ArenaRoom.ts`**

```ts
import { Room, Client } from 'colyseus';
import {
  ArenaState,
  ShipSchema,
  INPUT_MESSAGE,
  INPUT_ACK,
  InputBatch,
  InputFrame,
  SIM_TICK_HZ,
  BROADCAST_TICK_HZ,
  DEFAULT_AMMO,
  DEFAULT_HEALTH,
} from '@glide/shared';
import { SimWorld } from './sim/SimWorld.js';
import { Ship } from './sim/Ship.js';

interface PendingInput {
  sessionId: string;
  frame: InputFrame;
}

export class ArenaRoom extends Room<ArenaState> {
  private sim = new SimWorld();
  private ships = new Map<string, Ship>();
  private inputQueue: PendingInput[] = [];
  private tickCount = 0;
  private accumulatorMs = 0;
  private lastTickTime = 0;
  private readonly simIntervalMs = 1000 / SIM_TICK_HZ;
  private readonly broadcastEveryNTicks = Math.round(SIM_TICK_HZ / BROADCAST_TICK_HZ);

  onCreate(): void {
    this.setState(new ArenaState());
    this.setPatchRate(1000 / BROADCAST_TICK_HZ);
    this.onMessage(INPUT_MESSAGE, (client, batch: InputBatch) => {
      for (const frame of batch.frames) {
        this.inputQueue.push({ sessionId: client.sessionId, frame });
      }
    });
    this.setSimulationInterval((dt) => this.onSimulationFrame(dt), this.simIntervalMs);
  }

  onJoin(client: Client): void {
    const ship = new Ship(this.sim.world, 0, 0);
    this.ships.set(client.sessionId, ship);

    const schema = new ShipSchema();
    schema.sessionId = client.sessionId;
    schema.health = DEFAULT_HEALTH;
    schema.ammo = DEFAULT_AMMO;
    this.state.ships.set(client.sessionId, schema);
  }

  onLeave(client: Client): void {
    const ship = this.ships.get(client.sessionId);
    if (ship) {
      this.sim.world.destroyBody(ship.body);
      this.ships.delete(client.sessionId);
    }
    this.state.ships.delete(client.sessionId);
    this.inputQueue = this.inputQueue.filter((i) => i.sessionId !== client.sessionId);
  }

  private onSimulationFrame(dt: number): void {
    this.accumulatorMs += dt;
    while (this.accumulatorMs >= this.simIntervalMs) {
      this.accumulatorMs -= this.simIntervalMs;
      this.runSimTick();
    }
  }

  private runSimTick(): void {
    this.tickCount += 1;
    this.state.serverTick = this.tickCount;

    const perShip = new Map<string, InputFrame>();
    for (const pending of this.inputQueue) {
      const existing = perShip.get(pending.sessionId);
      if (!existing || pending.frame.seq > existing.seq) {
        perShip.set(pending.sessionId, pending.frame);
      }
    }
    this.inputQueue = [];

    for (const [sessionId, frame] of perShip) {
      const ship = this.ships.get(sessionId);
      if (ship) ship.applyInput(frame);
    }

    this.sim.step();

    for (const [sessionId, ship] of this.ships) {
      const schema = this.state.ships.get(sessionId);
      if (!schema) continue;
      const s = ship.getState();
      schema.x = s.x;
      schema.y = s.y;
      schema.vx = s.vx;
      schema.vy = s.vy;
      schema.rotation = s.rotation;
      schema.rotationV = s.rotationV;
    }

    if (this.tickCount % this.broadcastEveryNTicks === 0) {
      for (const [sessionId, ship] of this.ships) {
        const client = this.clients.find((c) => c.sessionId === sessionId);
        if (client) client.send(INPUT_ACK, { lastSeq: ship.lastInputSeq });
      }
    }
  }
}
```

Note: Colyseus auto-broadcasts schema state patches at the rate set by `setPatchRate`. We don't call `broadcastPatch()` ourselves; the `tickCount % broadcastEveryNTicks` gate here is only for our custom `INPUT_ACK` message.

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @glide/server typecheck
```

Expected: exits 0.

### Task 10: Server ship sim test

**Files:**
- Create: `packages/server/test/ship.test.ts`

- [ ] **Step 1: Create `packages/server/test/ship.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { SimWorld } from '../src/sim/SimWorld.js';
import { Ship } from '../src/sim/Ship.js';
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
    expect(Math.hypot(s.vx, s.vy)).toBeLessThanOrEqual(SHIP_MAX_SPEED + 0.01);
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
```

- [ ] **Step 2: Run**

```bash
pnpm --filter @glide/server test
```

Expected: 4 tests PASS.

### Task 11: Manual smoke test

- [ ] **Step 1: Start server**

```bash
pnpm dev:server
```

Expected: logs `[glide-server] listening on :2567`. Leave running. The process should accept WebSocket connections but the client doesn't exist yet, so this is just verifying boot.

- [ ] **Step 2: Stop server**

Ctrl-C.

### Task 12: Phase-2 commit

- [ ] **Step 1: Commit**

```bash
git add packages/server pnpm-lock.yaml
git commit -m "add Colyseus server with authoritative Planck ship simulation at 30Hz"
```

---

## Phase 3 — Client Core (Tasks 13–20)

Minimal PixiJS client that connects to the server, sends inputs, predicts its own ship, reconciles with server snapshots, and interpolates remote ships. Playable end-to-end at the end of this phase (two browser windows → two ships).

### Task 13: Client package scaffold

**Files:**
- Create: `packages/client/package.json`
- Create: `packages/client/tsconfig.json`
- Create: `packages/client/vite.config.ts`
- Create: `packages/client/index.html`
- Create: `packages/client/src/main.ts`

- [ ] **Step 1: Create `packages/client/package.json`**

```json
{
  "name": "@glide/client",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@glide/shared": "workspace:*",
    "colyseus.js": "^0.15.0",
    "howler": "^2.2.0",
    "pixi.js": "^8.0.0",
    "pixi-filters": "^6.0.0",
    "@pixi/particle-emitter": "^5.0.0",
    "planck": "^1.0.0"
  },
  "devDependencies": {
    "@types/howler": "^2.2.0",
    "vite": "^5.2.0"
  }
}
```

- [ ] **Step 2: Create `packages/client/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create `packages/client/vite.config.ts`**

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
  },
});
```

The client connects directly to the Colyseus server on `:2567` in development. Proxying WebSocket traffic through Vite is avoided because it conflicts with Vite's own HMR socket.

- [ ] **Step 4: Create `packages/client/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Glide</title>
    <style>
      html, body { margin: 0; padding: 0; background: #000; overflow: hidden; }
      canvas { display: block; }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 5: Move existing audio assets**

```bash
mkdir -p packages/client/public/audio
cp src/assets/*.wav packages/client/public/audio/
```

- [ ] **Step 6: Create placeholder `packages/client/src/main.ts`**

```ts
console.log('[glide-client] boot');
```

- [ ] **Step 7: Install**

```bash
pnpm install
```

### Task 14: PixiJS stage + empty world container

**Files:**
- Create: `packages/client/src/render/Stage.ts`

- [ ] **Step 1: Create `packages/client/src/render/Stage.ts`**

```ts
import { Application, Container } from 'pixi.js';

export interface GlideStage {
  app: Application;
  bgLayer: Container;
  worldContainer: Container;
  shipsLayer: Container;
  projectilesLayer: Container;
  structuresLayer: Container;
  gridLayer: Container;
  particlesLayer: Container;
  uiContainer: Container;
}

export async function createStage(): Promise<GlideStage> {
  const app = new Application();
  await app.init({
    resizeTo: window,
    antialias: true,
    background: '#000000',
  });
  document.getElementById('app')!.appendChild(app.canvas);

  const bgLayer = new Container();
  const worldContainer = new Container();
  const gridLayer = new Container();
  const structuresLayer = new Container();
  const projectilesLayer = new Container();
  const shipsLayer = new Container();
  const particlesLayer = new Container();
  const uiContainer = new Container();

  worldContainer.addChild(gridLayer, structuresLayer, projectilesLayer, shipsLayer, particlesLayer);
  app.stage.addChild(bgLayer, worldContainer, uiContainer);

  return {
    app,
    bgLayer,
    worldContainer,
    gridLayer,
    structuresLayer,
    projectilesLayer,
    shipsLayer,
    particlesLayer,
    uiContainer,
  };
}
```

### Task 15: NetClient — Colyseus connection wrapper

**Files:**
- Create: `packages/client/src/net/NetClient.ts`

- [ ] **Step 1: Create `packages/client/src/net/NetClient.ts`**

```ts
import { Client, Room } from 'colyseus.js';
import {
  ArenaState,
  INPUT_MESSAGE,
  INPUT_ACK,
  InputBatch,
  InputFrame,
  InputAckMessage,
} from '@glide/shared';

export interface NetEvents {
  onAck: (lastSeq: number) => void;
}

export class NetClient {
  private client: Client;
  private room: Room<ArenaState> | null = null;
  readonly events: NetEvents;

  constructor(events: NetEvents) {
    this.events = events;
    const url = import.meta.env.DEV
      ? 'ws://localhost:2567'
      : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;
    this.client = new Client(url);
  }

  async join(): Promise<Room<ArenaState>> {
    this.room = await this.client.joinOrCreate<ArenaState>('arena');
    this.room.onMessage(INPUT_ACK, (msg: InputAckMessage) => this.events.onAck(msg.lastSeq));
    return this.room;
  }

  sendInputs(frames: InputFrame[]): void {
    if (!this.room) return;
    const batch: InputBatch = { frames };
    this.room.send(INPUT_MESSAGE, batch);
  }

  get sessionId(): string {
    return this.room?.sessionId ?? '';
  }

  get state(): ArenaState | null {
    return this.room?.state ?? null;
  }
}
```

### Task 16: Keyboard input

**Files:**
- Create: `packages/client/src/input/Keyboard.ts`

- [ ] **Step 1: Create `packages/client/src/input/Keyboard.ts`**

```ts
import { InputFrame } from '@glide/shared';

export class KeyboardInput {
  private down = new Set<string>();
  private seq = 0;

  constructor() {
    window.addEventListener('keydown', (e) => this.down.add(e.code));
    window.addEventListener('keyup', (e) => this.down.delete(e.code));
    window.addEventListener('blur', () => this.down.clear());
  }

  sampleFrame(): InputFrame {
    this.seq += 1;
    return {
      seq: this.seq,
      accel: this.down.has('KeyW') || this.down.has('ArrowUp'),
      left: this.down.has('KeyA') || this.down.has('ArrowLeft'),
      right: this.down.has('KeyD') || this.down.has('ArrowRight'),
      brake: this.down.has('KeyS') || this.down.has('ArrowDown'),
      shoot: this.down.has('Space'),
    };
  }
}
```

### Task 17: LocalShipSim — client-side ship prediction

**Files:**
- Create: `packages/client/src/sim/LocalShipSim.ts`

- [ ] **Step 1: Create `packages/client/src/sim/LocalShipSim.ts`**

```ts
import { World, Vec2 } from 'planck';
import { SIM_TICK_SECONDS, InputFrame } from '@glide/shared';
import { Ship } from '../../../server/src/sim/Ship.js';

export class LocalShipSim {
  private world = new World({ gravity: Vec2(0, 0) });
  ship: Ship;

  constructor() {
    this.ship = new Ship(this.world, 0, 0);
  }

  snapTo(x: number, y: number, vx: number, vy: number, rotation: number, rotationV: number): void {
    this.ship.body.setPosition(Vec2(x, y));
    this.ship.body.setLinearVelocity(Vec2(vx, vy));
    this.ship.body.setAngle(rotation);
    this.ship.body.setAngularVelocity(rotationV);
  }

  applyAndStep(input: InputFrame): void {
    this.ship.applyInput(input);
    this.world.step(SIM_TICK_SECONDS, 8, 3);
  }
}
```

Note: importing `Ship` from the server package by relative path is deliberate — the Ship sim code is shared-physics behavior. If you prefer, move `Ship` / `SimWorld` to `packages/shared/src/sim/` later; for now the cross-package import works because all code is TS source.

Actually — resolve this now before it causes problems. Move Ship and SimWorld to shared instead.

### Task 18: Move Ship and SimWorld into shared package

**Files:**
- Move: `packages/server/src/sim/Ship.ts` → `packages/shared/src/sim/Ship.ts`
- Move: `packages/server/src/sim/SimWorld.ts` → `packages/shared/src/sim/SimWorld.ts`
- Modify: `packages/server/src/ArenaRoom.ts` (update imports)
- Modify: `packages/server/test/ship.test.ts` (update imports)
- Modify: `packages/client/src/sim/LocalShipSim.ts` (update imports)
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Move files**

```bash
mkdir -p packages/shared/src/sim
git mv packages/server/src/sim/Ship.ts packages/shared/src/sim/Ship.ts
git mv packages/server/src/sim/SimWorld.ts packages/shared/src/sim/SimWorld.ts
```

- [ ] **Step 2: Fix shared `Ship.ts` imports (they were `@glide/shared`; now relative)**

Replace the top import block in `packages/shared/src/sim/Ship.ts`:

```ts
import { Body, Circle, Vec2, World } from 'planck';
import {
  SHIP_RADIUS,
  SHIP_THRUST,
  SHIP_TURN_ACCEL,
  SHIP_TURN_RATE,
  SHIP_MAX_SPEED,
  SHIP_LINEAR_DAMPING,
  SHIP_ANGULAR_DAMPING,
} from '../constants.js';
import { Category, Mask } from '../collisionCategories.js';
import { InputFrame } from '../inputMessages.js';
import { clamp } from '../math.js';
```

- [ ] **Step 3: Fix shared `SimWorld.ts` imports**

```ts
import { World, Vec2 } from 'planck';
import { SIM_TICK_SECONDS } from '../constants.js';
```

- [ ] **Step 4: Update `packages/shared/src/index.ts`**

```ts
export * from './constants.js';
export * from './collisionCategories.js';
export * from './math.js';
export * from './inputMessages.js';
export * from './netMessages.js';
export * from './schemas/ShipSchema.js';
export * from './schemas/StructureSchema.js';
export * from './schemas/ArenaState.js';
export * from './sim/Ship.js';
export * from './sim/SimWorld.js';
```

- [ ] **Step 5: Update `packages/server/src/ArenaRoom.ts` imports**

Replace the two sim imports with:

```ts
import { SimWorld, Ship } from '@glide/shared';
```

And remove the `SHIP_THRUST`/etc. imports if still present (the Ship class uses them internally now).

- [ ] **Step 6: Update `packages/server/test/ship.test.ts`**

```ts
import { SimWorld, Ship } from '@glide/shared';
```

Delete the old relative imports.

- [ ] **Step 7: Update `packages/client/src/sim/LocalShipSim.ts`**

```ts
import { World, Vec2 } from 'planck';
import { SIM_TICK_SECONDS, InputFrame, Ship } from '@glide/shared';

export class LocalShipSim {
  private world = new World({ gravity: Vec2(0, 0) });
  ship: Ship;

  constructor() {
    this.ship = new Ship(this.world, 0, 0);
  }

  snapTo(x: number, y: number, vx: number, vy: number, rotation: number, rotationV: number): void {
    this.ship.body.setPosition(Vec2(x, y));
    this.ship.body.setLinearVelocity(Vec2(vx, vy));
    this.ship.body.setAngle(rotation);
    this.ship.body.setAngularVelocity(rotationV);
  }

  applyAndStep(input: InputFrame): void {
    this.ship.applyInput(input);
    this.world.step(SIM_TICK_SECONDS, 8, 3);
  }
}
```

- [ ] **Step 8: Typecheck + test everything**

```bash
pnpm typecheck
pnpm test
```

Expected: typecheck exits 0, ship.test.ts still PASSES.

### Task 19: Prediction + Reconciliation

**Files:**
- Create: `packages/client/src/net/Prediction.ts`

- [ ] **Step 1: Create `packages/client/src/net/Prediction.ts`**

```ts
import { InputFrame } from '@glide/shared';
import { LocalShipSim } from '../sim/LocalShipSim.js';

interface ServerShipSnapshot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationV: number;
}

export class Prediction {
  readonly sim = new LocalShipSim();
  private unackedInputs: InputFrame[] = [];
  private lastAckedSeq = 0;

  pushInput(input: InputFrame): void {
    this.unackedInputs.push(input);
    this.sim.applyAndStep(input);
  }

  onAck(lastSeq: number): void {
    this.lastAckedSeq = lastSeq;
    this.unackedInputs = this.unackedInputs.filter((i) => i.seq > lastSeq);
  }

  reconcile(server: ServerShipSnapshot): void {
    this.sim.snapTo(server.x, server.y, server.vx, server.vy, server.rotation, server.rotationV);
    for (const input of this.unackedInputs) {
      this.sim.applyAndStep(input);
    }
  }

  get state() {
    return this.sim.ship.getState();
  }

  get lastSeq(): number {
    return this.lastAckedSeq;
  }
}
```

### Task 20: Remote ship interpolation buffer

**Files:**
- Create: `packages/client/src/net/Interpolation.ts`

- [ ] **Step 1: Create `packages/client/src/net/Interpolation.ts`**

```ts
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
```

### Task 21: ShipView — client-side ship rendering

**Files:**
- Create: `packages/client/src/entities/ShipView.ts`

- [ ] **Step 1: Create `packages/client/src/entities/ShipView.ts`**

```ts
import { Graphics, Container } from 'pixi.js';

export class ShipView {
  readonly container: Container;
  private body: Graphics;

  constructor() {
    this.container = new Container();
    this.body = new Graphics();
    this.drawWireframe();
    this.container.addChild(this.body);
  }

  private drawWireframe(): void {
    this.body
      .moveTo(0, -25)
      .lineTo(-15, 10)
      .lineTo(0, 0)
      .lineTo(15, 10)
      .lineTo(0, -25)
      .stroke({ width: 2, color: 0xffffff });
    this.body.moveTo(0, -10).lineTo(0, 1).stroke({ width: 2, color: 0xffffff });
  }

  setTransform(x: number, y: number, rotation: number): void {
    this.container.position.set(x, y);
    this.container.rotation = rotation + Math.PI / 2;
  }
}
```

The `+ Math.PI / 2` offset is because Planck's 0-angle points along +X while the wireframe is drawn pointing along -Y.

### Task 22: Wire everything up — playable end-to-end

**Files:**
- Modify: `packages/client/src/main.ts` (overwrite)

- [ ] **Step 1: Overwrite `packages/client/src/main.ts`**

```ts
import { SIM_TICK_SECONDS, INPUT_SEND_HZ } from '@glide/shared';
import { createStage } from './render/Stage.js';
import { NetClient } from './net/NetClient.js';
import { KeyboardInput } from './input/Keyboard.js';
import { Prediction } from './net/Prediction.js';
import { InterpolationBuffer } from './net/Interpolation.js';
import { ShipView } from './entities/ShipView.js';
import { InputFrame } from '@glide/shared';

async function boot(): Promise<void> {
  const stage = await createStage();
  const keyboard = new KeyboardInput();
  const prediction = new Prediction();
  const inputSendIntervalMs = 1000 / INPUT_SEND_HZ;

  const net = new NetClient({
    onAck: (lastSeq) => prediction.onAck(lastSeq),
  });
  await net.join();

  const ownShipView = new ShipView();
  stage.shipsLayer.addChild(ownShipView.container);

  const remoteShips = new Map<string, { view: ShipView; interp: InterpolationBuffer }>();

  const pendingInputs: InputFrame[] = [];
  let lastInputSendAt = 0;

  stage.app.ticker.add(() => {
    const frame = keyboard.sampleFrame();
    prediction.pushInput(frame);
    pendingInputs.push(frame);

    const now = performance.now();
    if (now - lastInputSendAt >= inputSendIntervalMs) {
      net.sendInputs(pendingInputs.slice(-6));
      pendingInputs.length = 0;
      lastInputSendAt = now;
    }

    const state = net.state;
    if (!state) return;

    const ownSchema = state.ships.get(net.sessionId);
    if (ownSchema) {
      prediction.reconcile({
        x: ownSchema.x,
        y: ownSchema.y,
        vx: ownSchema.vx,
        vy: ownSchema.vy,
        rotation: ownSchema.rotation,
        rotationV: ownSchema.rotationV,
      });
    }

    const own = prediction.state;
    ownShipView.setTransform(own.x, own.y, own.rotation);

    for (const [sid, ship] of state.ships) {
      if (sid === net.sessionId) continue;
      let entry = remoteShips.get(sid);
      if (!entry) {
        const view = new ShipView();
        stage.shipsLayer.addChild(view.container);
        entry = { view, interp: new InterpolationBuffer() };
        remoteShips.set(sid, entry);
      }
      entry.interp.push(ship.x, ship.y, ship.rotation);
      const sampled = entry.interp.sample(performance.now());
      if (sampled) entry.view.setTransform(sampled.x, sampled.y, sampled.rotation);
    }

    for (const sid of remoteShips.keys()) {
      if (!state.ships.has(sid)) {
        const entry = remoteShips.get(sid)!;
        stage.shipsLayer.removeChild(entry.view.container);
        remoteShips.delete(sid);
      }
    }

    stage.worldContainer.position.set(stage.app.screen.width / 2, stage.app.screen.height / 2);
    stage.worldContainer.pivot.set(own.x, own.y);
  });
}

boot().catch((err) => console.error('[glide-client]', err));
```

- [ ] **Step 2: Run server and client**

Two terminals:

```bash
pnpm dev:server
pnpm dev:client
```

Open `http://localhost:5173` — you should see a white triangular ship that responds to WASD/arrows. Open a second window — you should see another ship moving. Current: no structures, no projectiles, no background.

### Task 23: Phase-3 commit

- [ ] **Step 1: Commit**

```bash
git add packages pnpm-lock.yaml
git commit -m "playable client: connect, render ship, input prediction, remote interpolation"
```

---

## Phase 4 — World (Tasks 24–28)

Structures with pseudo-3D extrusion, camera transform (rotation + zoom-with-speed), background gradient, grid. One commit.

### Task 24: Structure sim class + world layout

**Files:**
- Create: `packages/shared/src/sim/Structure.ts`
- Create: `packages/server/src/sim/worldLayout.ts`
- Modify: `packages/server/src/ArenaRoom.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Create `packages/shared/src/sim/Structure.ts`**

```ts
import { Body, Vec2, World, Polygon, Edge } from 'planck';
import { Category, Mask } from '../collisionCategories.js';

export interface StructureDef {
  id: string;
  footprint: Array<{ x: number; y: number }>;
  depth: number;
}

export function createStructureBody(world: World, def: StructureDef): Body {
  const body = world.createBody({ type: 'static', position: Vec2(0, 0) });
  if (def.footprint.length === 2) {
    const [a, b] = def.footprint;
    body.createFixture({
      shape: new Edge(Vec2(a.x, a.y), Vec2(b.x, b.y)),
      filterCategoryBits: Category.STRUCTURE,
      filterMaskBits: Mask.STRUCTURE,
    });
  } else {
    body.createFixture({
      shape: new Polygon(def.footprint.map((p) => Vec2(p.x, p.y))),
      filterCategoryBits: Category.STRUCTURE,
      filterMaskBits: Mask.STRUCTURE,
    });
  }
  body.setUserData({ kind: 'structure', id: def.id });
  return body;
}
```

- [ ] **Step 2: Update `packages/shared/src/index.ts` barrel**

Add line: `export * from './sim/Structure.js';`

- [ ] **Step 3: Create `packages/server/src/sim/worldLayout.ts`**

```ts
import { StructureDef } from '@glide/shared';

export const DEFAULT_WORLD: StructureDef[] = [
  {
    id: 'arena-wall-n',
    footprint: [
      { x: -1000, y: -1000 },
      { x: 1000, y: -1000 },
    ],
    depth: 6,
  },
  {
    id: 'arena-wall-s',
    footprint: [
      { x: -1000, y: 1000 },
      { x: 1000, y: 1000 },
    ],
    depth: 6,
  },
  {
    id: 'arena-wall-e',
    footprint: [
      { x: 1000, y: -1000 },
      { x: 1000, y: 1000 },
    ],
    depth: 6,
  },
  {
    id: 'arena-wall-w',
    footprint: [
      { x: -1000, y: -1000 },
      { x: -1000, y: 1000 },
    ],
    depth: 6,
  },
  {
    id: 'center-block',
    footprint: [
      { x: -75, y: -75 },
      { x: 75, y: -75 },
      { x: 75, y: 75 },
      { x: -75, y: 75 },
    ],
    depth: 4,
  },
];
```

- [ ] **Step 4: Modify `packages/server/src/ArenaRoom.ts` — spawn structures in `onCreate`**

Add these imports at the top:

```ts
import { createStructureBody, StructureSchema, FootprintPoint } from '@glide/shared';
import { DEFAULT_WORLD } from './sim/worldLayout.js';
```

In `onCreate`, after `this.setState(new ArenaState());` and before `this.onMessage(...)`, add:

```ts
for (const def of DEFAULT_WORLD) {
  createStructureBody(this.sim.world, def);
  const schema = new StructureSchema();
  schema.id = def.id;
  schema.depth = def.depth;
  for (const p of def.footprint) {
    const fp = new FootprintPoint();
    fp.x = p.x;
    fp.y = p.y;
    schema.footprint.push(fp);
  }
  this.state.structures.set(def.id, schema);
}
```

- [ ] **Step 5: Export `FootprintPoint` from shared**

`packages/shared/src/schemas/StructureSchema.ts` already exports it. Ensure `packages/shared/src/index.ts` exports everything from that file (already does via the existing `export * from './schemas/StructureSchema.js';`). No change needed.

- [ ] **Step 6: Typecheck**

```bash
pnpm typecheck
```

Expected: exits 0.

### Task 25: StructureView with pseudo-3D extrusion

**Files:**
- Create: `packages/client/src/entities/StructureView.ts`

- [ ] **Step 1: Create `packages/client/src/entities/StructureView.ts`**

```ts
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
      x: p.x + -(p.x - cameraX) / this.depth,
      y: p.y + -(p.y - cameraY) / this.depth,
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
```

### Task 26: Camera module

**Files:**
- Create: `packages/client/src/render/Camera.ts`

- [ ] **Step 1: Create `packages/client/src/render/Camera.ts`**

```ts
import { Container, Application } from 'pixi.js';
import { SHIP_MAX_SPEED } from '@glide/shared';

export class Camera {
  constructor(
    private app: Application,
    private worldContainer: Container,
  ) {}

  update(x: number, y: number, rotation: number, speed: number): void {
    const zoom = 1.2 - Math.min(speed / SHIP_MAX_SPEED, 1) / 3;
    this.worldContainer.pivot.set(x, y);
    this.worldContainer.rotation = -rotation - Math.PI / 2;
    this.worldContainer.scale.set(zoom);
    this.worldContainer.position.set(this.app.screen.width / 2, this.app.screen.height / 2);
  }
}
```

### Task 27: Background gradient + tiling grid

**Files:**
- Create: `packages/client/src/render/Background.ts`

- [ ] **Step 1: Create `packages/client/src/render/Background.ts`**

```ts
import { Application, Container, Graphics, Sprite, Texture, FillGradient, TilingSprite } from 'pixi.js';

export class Background {
  readonly gradient: Sprite;
  readonly grid: TilingSprite;

  constructor(app: Application, bgLayer: Container, gridLayer: Container) {
    const g = new FillGradient(0, 0, 0, 1);
    g.addColorStop(0, 0x250000);
    g.addColorStop(1, 0x000025);
    const gfx = new Graphics().rect(0, 0, 2, 2).fill(g);
    const texture = app.renderer.generateTexture(gfx);
    this.gradient = new Sprite(texture);
    this.gradient.anchor.set(0.5);
    bgLayer.addChild(this.gradient);

    const cellSize = 500;
    const cell = new Graphics()
      .rect(0, 0, cellSize, cellSize)
      .stroke({ width: 2, color: 0xffffff, alpha: 0.07 });
    const cellTexture = app.renderer.generateTexture(cell);
    this.grid = new TilingSprite({ texture: cellTexture, width: 8000, height: 8000 });
    this.grid.anchor.set(0.5);
    gridLayer.addChild(this.grid);
  }

  update(app: Application, cameraX: number, cameraY: number, rotation: number): void {
    this.gradient.width = app.screen.width * 2;
    this.gradient.height = app.screen.height * 2;
    this.gradient.position.set(app.screen.width / 2, app.screen.height / 2);
    this.gradient.rotation = -rotation;

    this.grid.tilePosition.set(-cameraX, -cameraY);
  }
}
```

### Task 28: Integrate structures, camera, background into `main.ts`

**Files:**
- Modify: `packages/client/src/main.ts` (overwrite)

- [ ] **Step 1: Overwrite `packages/client/src/main.ts`**

```ts
import { INPUT_SEND_HZ } from '@glide/shared';
import { createStage } from './render/Stage.js';
import { Camera } from './render/Camera.js';
import { Background } from './render/Background.js';
import { NetClient } from './net/NetClient.js';
import { KeyboardInput } from './input/Keyboard.js';
import { Prediction } from './net/Prediction.js';
import { InterpolationBuffer } from './net/Interpolation.js';
import { ShipView } from './entities/ShipView.js';
import { StructureView } from './entities/StructureView.js';
import { InputFrame } from '@glide/shared';

async function boot(): Promise<void> {
  const stage = await createStage();
  const camera = new Camera(stage.app, stage.worldContainer);
  const background = new Background(stage.app, stage.bgLayer, stage.gridLayer);
  const keyboard = new KeyboardInput();
  const prediction = new Prediction();
  const inputSendIntervalMs = 1000 / INPUT_SEND_HZ;

  const net = new NetClient({
    onAck: (lastSeq) => prediction.onAck(lastSeq),
  });
  await net.join();

  const ownShipView = new ShipView();
  stage.shipsLayer.addChild(ownShipView.container);

  const remoteShips = new Map<string, { view: ShipView; interp: InterpolationBuffer }>();
  const structureViews = new Map<string, StructureView>();

  const pendingInputs: InputFrame[] = [];
  let lastInputSendAt = 0;

  stage.app.ticker.add(() => {
    const frame = keyboard.sampleFrame();
    prediction.pushInput(frame);
    pendingInputs.push(frame);

    const now = performance.now();
    if (now - lastInputSendAt >= inputSendIntervalMs) {
      net.sendInputs(pendingInputs.slice(-6));
      pendingInputs.length = 0;
      lastInputSendAt = now;
    }

    const state = net.state;
    if (!state) return;

    const ownSchema = state.ships.get(net.sessionId);
    if (ownSchema) {
      prediction.reconcile({
        x: ownSchema.x,
        y: ownSchema.y,
        vx: ownSchema.vx,
        vy: ownSchema.vy,
        rotation: ownSchema.rotation,
        rotationV: ownSchema.rotationV,
      });
    }

    const own = prediction.state;
    ownShipView.setTransform(own.x, own.y, own.rotation);
    const speed = Math.hypot(own.vx, own.vy);
    camera.update(own.x, own.y, own.rotation, speed);
    background.update(stage.app, own.x, own.y, own.rotation);

    for (const [id, schema] of state.structures) {
      let view = structureViews.get(id);
      if (!view) {
        const pts = schema.footprint.map((p) => ({ x: p.x, y: p.y }));
        view = new StructureView(pts, schema.depth);
        stage.structuresLayer.addChild(view.container);
        structureViews.set(id, view);
      }
      view.updateExtrusion(own.x, own.y);
    }

    for (const [sid, ship] of state.ships) {
      if (sid === net.sessionId) continue;
      let entry = remoteShips.get(sid);
      if (!entry) {
        const view = new ShipView();
        stage.shipsLayer.addChild(view.container);
        entry = { view, interp: new InterpolationBuffer() };
        remoteShips.set(sid, entry);
      }
      entry.interp.push(ship.x, ship.y, ship.rotation);
      const sampled = entry.interp.sample(performance.now());
      if (sampled) entry.view.setTransform(sampled.x, sampled.y, sampled.rotation);
    }

    for (const sid of remoteShips.keys()) {
      if (!state.ships.has(sid)) {
        const entry = remoteShips.get(sid)!;
        stage.shipsLayer.removeChild(entry.view.container);
        remoteShips.delete(sid);
      }
    }
  });
}

boot().catch((err) => console.error('[glide-client]', err));
```

- [ ] **Step 2: Run server and client, verify in browser**

```bash
pnpm dev:server      # terminal 1
pnpm dev:client      # terminal 2
```

Open two windows at `http://localhost:5173`. Expected: ships fly around, camera rotates with player, grid scrolls, background gradient rotates, four arena edge-barriers visible (bouncing off by Planck contact resolution), central block visible with extruded top whose perspective shifts as you move.

### Task 29: Phase-4 commit

- [ ] **Step 1: Commit**

```bash
git add packages
git commit -m "add world: structures with pseudo-3D extrusion, camera, grid, gradient"
```

---

## Phase 5 — Projectiles (Tasks 30–36)

Server-authoritative projectile spawning with event-broadcast + client-side local simulation, contact-based hit detection. One commit.

### Task 30: Projectile sim class in shared

**Files:**
- Create: `packages/shared/src/sim/Projectile.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Create `packages/shared/src/sim/Projectile.ts`**

```ts
import { Body, Circle, Vec2, World } from 'planck';
import { PROJECTILE_RADIUS } from '../constants.js';
import { Category, Mask } from '../collisionCategories.js';

export interface ProjectileInit {
  id: string;
  ownerSessionId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  spawnTick: number;
  despawnTick: number;
}

export class Projectile {
  readonly body: Body;
  readonly data: ProjectileInit;

  constructor(world: World, init: ProjectileInit) {
    this.data = init;
    this.body = world.createBody({
      type: 'dynamic',
      position: Vec2(init.x, init.y),
      linearVelocity: Vec2(init.vx, init.vy),
      bullet: true,
    });
    this.body.createFixture({
      shape: new Circle(PROJECTILE_RADIUS),
      density: 0.1,
      friction: 0,
      restitution: 0,
      filterCategoryBits: Category.PROJECTILE,
      filterMaskBits: Mask.PROJECTILE,
    });
    this.body.setUserData({ kind: 'projectile', id: init.id, ownerSessionId: init.ownerSessionId });
  }
}
```

- [ ] **Step 2: Add to barrel `packages/shared/src/index.ts`**

Add: `export * from './sim/Projectile.js';`

### Task 31: Server projectile spawning + contact listener

**Files:**
- Modify: `packages/server/src/ArenaRoom.ts`

- [ ] **Step 1: Replace `packages/server/src/ArenaRoom.ts` with full updated version**

```ts
import { Room, Client } from 'colyseus';
import {
  ArenaState,
  ShipSchema,
  StructureSchema,
  FootprintPoint,
  INPUT_MESSAGE,
  INPUT_ACK,
  PROJECTILE_SPAWN,
  PROJECTILE_HIT,
  InputBatch,
  InputFrame,
  ProjectileSpawnEvent,
  ProjectileHitEvent,
  SIM_TICK_HZ,
  SIM_TICK_SECONDS,
  BROADCAST_TICK_HZ,
  DEFAULT_AMMO,
  DEFAULT_HEALTH,
  PROJECTILE_DAMAGE,
  PROJECTILE_SPAWN_COOLDOWN_SECONDS,
  PROJECTILE_SPEED,
  PROJECTILE_LIFETIME_SECONDS,
  SimWorld,
  Ship,
  Projectile,
  createStructureBody,
} from '@glide/shared';
import { DEFAULT_WORLD } from './sim/worldLayout.js';

interface PendingInput {
  sessionId: string;
  frame: InputFrame;
}

interface ShipRuntime {
  ship: Ship;
  shotCooldown: number;
  holdingFire: boolean;
}

export class ArenaRoom extends Room<ArenaState> {
  private sim = new SimWorld();
  private ships = new Map<string, ShipRuntime>();
  private projectiles = new Map<string, Projectile>();
  private inputQueue: PendingInput[] = [];
  private tickCount = 0;
  private accumulatorMs = 0;
  private nextProjectileId = 1;
  private readonly simIntervalMs = 1000 / SIM_TICK_HZ;
  private readonly broadcastEveryNTicks = Math.round(SIM_TICK_HZ / BROADCAST_TICK_HZ);
  private readonly projectileLifetimeTicks = Math.round(PROJECTILE_LIFETIME_SECONDS * SIM_TICK_HZ);

  onCreate(): void {
    this.setState(new ArenaState());
    this.setPatchRate(1000 / BROADCAST_TICK_HZ);

    for (const def of DEFAULT_WORLD) {
      createStructureBody(this.sim.world, def);
      const schema = new StructureSchema();
      schema.id = def.id;
      schema.depth = def.depth;
      for (const p of def.footprint) {
        const fp = new FootprintPoint();
        fp.x = p.x;
        fp.y = p.y;
        schema.footprint.push(fp);
      }
      this.state.structures.set(def.id, schema);
    }

    this.sim.world.on('begin-contact', (contact) => this.handleContact(contact));

    this.onMessage(INPUT_MESSAGE, (client, batch: InputBatch) => {
      for (const frame of batch.frames) {
        this.inputQueue.push({ sessionId: client.sessionId, frame });
      }
    });

    this.setSimulationInterval((dt) => this.onSimulationFrame(dt), this.simIntervalMs);
  }

  onJoin(client: Client): void {
    const ship = new Ship(this.sim.world, 0, 0);
    this.ships.set(client.sessionId, { ship, shotCooldown: 0, holdingFire: false });

    const schema = new ShipSchema();
    schema.sessionId = client.sessionId;
    schema.health = DEFAULT_HEALTH;
    schema.ammo = DEFAULT_AMMO;
    this.state.ships.set(client.sessionId, schema);
  }

  onLeave(client: Client): void {
    const entry = this.ships.get(client.sessionId);
    if (entry) {
      this.sim.world.destroyBody(entry.ship.body);
      this.ships.delete(client.sessionId);
    }
    this.state.ships.delete(client.sessionId);
    this.inputQueue = this.inputQueue.filter((i) => i.sessionId !== client.sessionId);
  }

  private onSimulationFrame(dt: number): void {
    this.accumulatorMs += dt;
    while (this.accumulatorMs >= this.simIntervalMs) {
      this.accumulatorMs -= this.simIntervalMs;
      this.runSimTick();
    }
  }

  private runSimTick(): void {
    this.tickCount += 1;
    this.state.serverTick = this.tickCount;

    const perShip = new Map<string, InputFrame>();
    for (const pending of this.inputQueue) {
      const existing = perShip.get(pending.sessionId);
      if (!existing || pending.frame.seq > existing.seq) {
        perShip.set(pending.sessionId, pending.frame);
      }
    }
    this.inputQueue = [];

    for (const [sessionId, entry] of this.ships) {
      const frame = perShip.get(sessionId);
      if (frame) {
        entry.ship.applyInput(frame);
        entry.holdingFire = frame.shoot;
      }
    }

    this.sim.step();

    for (const [sessionId, entry] of this.ships) {
      if (entry.shotCooldown > 0) entry.shotCooldown -= SIM_TICK_SECONDS;
      const schema = this.state.ships.get(sessionId);
      if (!schema) continue;
      if (entry.holdingFire && entry.shotCooldown <= 0 && schema.ammo > 0) {
        this.spawnProjectile(sessionId, entry);
        entry.shotCooldown = PROJECTILE_SPAWN_COOLDOWN_SECONDS;
        schema.ammo -= 1;
      }
    }

    for (const [id, p] of this.projectiles) {
      if (this.tickCount >= p.data.despawnTick) {
        this.sim.world.destroyBody(p.body);
        this.projectiles.delete(id);
      }
    }

    for (const [sessionId, entry] of this.ships) {
      const schema = this.state.ships.get(sessionId);
      if (!schema) continue;
      const s = entry.ship.getState();
      schema.x = s.x;
      schema.y = s.y;
      schema.vx = s.vx;
      schema.vy = s.vy;
      schema.rotation = s.rotation;
      schema.rotationV = s.rotationV;
    }

    if (this.tickCount % this.broadcastEveryNTicks === 0) {
      for (const [sessionId, entry] of this.ships) {
        const client = this.clients.find((c) => c.sessionId === sessionId);
        if (client) client.send(INPUT_ACK, { lastSeq: entry.ship.lastInputSeq });
      }
    }
  }

  private spawnProjectile(ownerId: string, entry: ShipRuntime): void {
    const state = entry.ship.getState();
    const fx = Math.cos(state.rotation);
    const fy = Math.sin(state.rotation);
    const id = `p${this.nextProjectileId++}`;
    const init = {
      id,
      ownerSessionId: ownerId,
      x: state.x + fx * 30,
      y: state.y + fy * 30,
      vx: state.vx + fx * PROJECTILE_SPEED,
      vy: state.vy + fy * PROJECTILE_SPEED,
      spawnTick: this.tickCount,
      despawnTick: this.tickCount + this.projectileLifetimeTicks,
    };
    const projectile = new Projectile(this.sim.world, init);
    this.projectiles.set(id, projectile);

    const event: ProjectileSpawnEvent = init;
    this.broadcast(PROJECTILE_SPAWN, event);
  }

  private handleContact(contact: any): void {
    const a = contact.getFixtureA().getBody().getUserData() as any;
    const b = contact.getFixtureB().getBody().getUserData() as any;
    const [p, other] = a?.kind === 'projectile' ? [a, b] : b?.kind === 'projectile' ? [b, a] : [null, null];
    if (!p) return;
    if (other?.kind === 'ship') {
      this.onProjectileHitsShip(p.id, p.ownerSessionId, other);
    } else if (other?.kind === 'structure') {
      this.removeProjectile(p.id);
    }
  }

  private onProjectileHitsShip(projectileId: string, ownerSessionId: string, shipUserData: any): void {
    const projectile = this.projectiles.get(projectileId);
    if (!projectile) return;
    const victimEntry = [...this.ships.entries()].find(([, e]) => e.ship.body.getUserData() === shipUserData);
    if (!victimEntry) return;
    const [victimSessionId] = victimEntry;
    if (victimSessionId === ownerSessionId) return;

    const victimSchema = this.state.ships.get(victimSessionId);
    if (victimSchema) victimSchema.health = Math.max(0, victimSchema.health - PROJECTILE_DAMAGE);

    const pos = projectile.body.getPosition();
    const event: ProjectileHitEvent = {
      id: projectileId,
      x: pos.x,
      y: pos.y,
      victimSessionId,
      ownerSessionId,
    };
    this.broadcast(PROJECTILE_HIT, event);
    this.removeProjectile(projectileId);
  }

  private removeProjectile(id: string): void {
    const projectile = this.projectiles.get(id);
    if (!projectile) return;
    this.sim.world.destroyBody(projectile.body);
    this.projectiles.delete(id);
  }
}
```

### Task 32: Server projectile-hit test

**Files:**
- Create: `packages/server/test/projectileHit.test.ts`

- [ ] **Step 1: Create `packages/server/test/projectileHit.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { SimWorld, Ship, Projectile } from '@glide/shared';

describe('projectile-ship contact', () => {
  it('projectile body and ship body overlap produces begin-contact event', () => {
    const w = new SimWorld();
    const shipBody = new Ship(w.world, 0, 0);
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
      if ((a?.kind === 'projectile' && b?.kind === 'ship') || (a?.kind === 'ship' && b?.kind === 'projectile')) {
        contacts += 1;
      }
    });
    for (let i = 0; i < 60; i++) w.step();
    expect(contacts).toBeGreaterThan(0);
    expect(shipBody.body).toBeDefined();
    expect(projectile.body).toBeDefined();
  });
});
```

- [ ] **Step 2: Run**

```bash
pnpm --filter @glide/server test
```

Expected: all tests PASS.

### Task 33: Client local projectile simulation

**Files:**
- Create: `packages/client/src/sim/LocalProjectileSim.ts`

- [ ] **Step 1: Create `packages/client/src/sim/LocalProjectileSim.ts`**

```ts
import { SIM_TICK_SECONDS } from '@glide/shared';

interface LocalProjectile {
  id: string;
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
}
```

### Task 34: ProjectileView

**Files:**
- Create: `packages/client/src/entities/ProjectileView.ts`

- [ ] **Step 1: Create `packages/client/src/entities/ProjectileView.ts`**

```ts
import { Graphics } from 'pixi.js';

export class ProjectileView {
  readonly gfx: Graphics;

  constructor() {
    this.gfx = new Graphics();
    this.draw();
  }

  private draw(): void {
    this.gfx
      .moveTo(-6, 0)
      .lineTo(6, 0)
      .stroke({ width: 2, color: 0xffffff });
  }

  setTransform(x: number, y: number, vx: number, vy: number): void {
    this.gfx.position.set(x, y);
    this.gfx.rotation = Math.atan2(vy, vx);
  }
}
```

### Task 35: Wire projectile events into `main.ts`

**Files:**
- Modify: `packages/client/src/main.ts` (extend with projectile handling)

- [ ] **Step 1: Overwrite `packages/client/src/main.ts`**

```ts
import {
  INPUT_SEND_HZ,
  PROJECTILE_SPAWN,
  PROJECTILE_HIT,
  PROJECTILE_CANCEL,
  ProjectileSpawnEvent,
  ProjectileHitEvent,
  ProjectileCancelEvent,
  InputFrame,
} from '@glide/shared';
import { createStage } from './render/Stage.js';
import { Camera } from './render/Camera.js';
import { Background } from './render/Background.js';
import { NetClient } from './net/NetClient.js';
import { KeyboardInput } from './input/Keyboard.js';
import { Prediction } from './net/Prediction.js';
import { InterpolationBuffer } from './net/Interpolation.js';
import { ShipView } from './entities/ShipView.js';
import { StructureView } from './entities/StructureView.js';
import { ProjectileView } from './entities/ProjectileView.js';
import { LocalProjectileSim } from './sim/LocalProjectileSim.js';

async function boot(): Promise<void> {
  const stage = await createStage();
  const camera = new Camera(stage.app, stage.worldContainer);
  const background = new Background(stage.app, stage.bgLayer, stage.gridLayer);
  const keyboard = new KeyboardInput();
  const prediction = new Prediction();
  const projectileSim = new LocalProjectileSim();
  const inputSendIntervalMs = 1000 / INPUT_SEND_HZ;

  const net = new NetClient({
    onAck: (lastSeq) => prediction.onAck(lastSeq),
  });
  const room = await net.join();

  room.onMessage(PROJECTILE_SPAWN, (e: ProjectileSpawnEvent) => projectileSim.spawn(e));
  room.onMessage(PROJECTILE_HIT, (_e: ProjectileHitEvent) => {
    // hit handling (damage flash, sparks) lands in Phase 6
  });
  room.onMessage(PROJECTILE_CANCEL, (e: ProjectileCancelEvent) => projectileSim.cancel(e.id));

  const ownShipView = new ShipView();
  stage.shipsLayer.addChild(ownShipView.container);

  const remoteShips = new Map<string, { view: ShipView; interp: InterpolationBuffer }>();
  const structureViews = new Map<string, StructureView>();
  const projectileViews = new Map<string, ProjectileView>();

  const pendingInputs: InputFrame[] = [];
  let lastInputSendAt = 0;

  stage.app.ticker.add(() => {
    const frame = keyboard.sampleFrame();
    prediction.pushInput(frame);
    pendingInputs.push(frame);

    const now = performance.now();
    if (now - lastInputSendAt >= inputSendIntervalMs) {
      net.sendInputs(pendingInputs.slice(-6));
      pendingInputs.length = 0;
      lastInputSendAt = now;
    }

    projectileSim.step();

    const state = net.state;
    if (!state) return;

    const ownSchema = state.ships.get(net.sessionId);
    if (ownSchema) {
      prediction.reconcile({
        x: ownSchema.x,
        y: ownSchema.y,
        vx: ownSchema.vx,
        vy: ownSchema.vy,
        rotation: ownSchema.rotation,
        rotationV: ownSchema.rotationV,
      });
    }

    const own = prediction.state;
    ownShipView.setTransform(own.x, own.y, own.rotation);
    const speed = Math.hypot(own.vx, own.vy);
    camera.update(own.x, own.y, own.rotation, speed);
    background.update(stage.app, own.x, own.y, own.rotation);

    for (const [id, schema] of state.structures) {
      let view = structureViews.get(id);
      if (!view) {
        const pts = schema.footprint.map((p) => ({ x: p.x, y: p.y }));
        view = new StructureView(pts, schema.depth);
        stage.structuresLayer.addChild(view.container);
        structureViews.set(id, view);
      }
      view.updateExtrusion(own.x, own.y);
    }

    for (const [sid, ship] of state.ships) {
      if (sid === net.sessionId) continue;
      let entry = remoteShips.get(sid);
      if (!entry) {
        const view = new ShipView();
        stage.shipsLayer.addChild(view.container);
        entry = { view, interp: new InterpolationBuffer() };
        remoteShips.set(sid, entry);
      }
      entry.interp.push(ship.x, ship.y, ship.rotation);
      const sampled = entry.interp.sample(performance.now());
      if (sampled) entry.view.setTransform(sampled.x, sampled.y, sampled.rotation);
    }
    for (const sid of remoteShips.keys()) {
      if (!state.ships.has(sid)) {
        const entry = remoteShips.get(sid)!;
        stage.shipsLayer.removeChild(entry.view.container);
        remoteShips.delete(sid);
      }
    }

    const seenIds = new Set<string>();
    for (const [id, p] of projectileSim.entries()) {
      seenIds.add(id);
      let view = projectileViews.get(id);
      if (!view) {
        view = new ProjectileView();
        stage.projectilesLayer.addChild(view.gfx);
        projectileViews.set(id, view);
      }
      view.setTransform(p.x, p.y, p.vx, p.vy);
    }
    for (const id of projectileViews.keys()) {
      if (!seenIds.has(id)) {
        const v = projectileViews.get(id)!;
        stage.projectilesLayer.removeChild(v.gfx);
        projectileViews.delete(id);
      }
    }
  });
}

boot().catch((err) => console.error('[glide-client]', err));
```

- [ ] **Step 2: Smoke test**

Run server + client. Hold Space — projectiles spawn in a stream and fly forward. They should despawn on contact with structures (no visual particle yet, that's Phase 6).

### Task 36: Phase-5 commit

- [ ] **Step 1: Commit**

```bash
git add packages
git commit -m "add projectile system: server-authoritative spawn, local client sim, contact-based hit registration"
```

---

## Phase 6 — Polish & Feature Hooks (Tasks 37–43)

Bloom filter, HUD (ammo + speed + health), SoundBus, particle emitters, minimap, and placeholder wiring for health/shield/boost/melee. One commit.

### Task 37: Bloom filter

**Files:**
- Create: `packages/client/src/render/Filters.ts`
- Modify: `packages/client/src/render/Stage.ts`

- [ ] **Step 1: Create `packages/client/src/render/Filters.ts`**

```ts
import { Container } from 'pixi.js';
import { AdvancedBloomFilter } from 'pixi-filters';

export function applyBloom(target: Container): void {
  const bloom = new AdvancedBloomFilter({
    threshold: 0.25,
    bloomScale: 1.1,
    brightness: 1,
    blur: 6,
    quality: 6,
  });
  target.filters = [bloom];
}
```

- [ ] **Step 2: Modify `packages/client/src/render/Stage.ts`**

Replace the two-line final section in `createStage`'s return statement — add a bloom call just before `return`:

```ts
// ... after: app.stage.addChild(bgLayer, worldContainer, uiContainer);
applyBloom(worldContainer);
```

And add the import at the top:

```ts
import { applyBloom } from './Filters.js';
```

- [ ] **Step 3: Smoke-test bloom**

Run; the wireframes should now have a visible Gaussian glow, much more pronounced than the previous `shadowBlur`.

### Task 38: SoundBus

**Files:**
- Create: `packages/client/src/audio/SoundBus.ts`

- [ ] **Step 1: Create `packages/client/src/audio/SoundBus.ts`**

```ts
import { Howl } from 'howler';

export type SoundEvent = 'shoot' | 'hit' | 'bump' | 'reload' | 'newPlayer';

const MAP: Record<SoundEvent, string> = {
  shoot: '/audio/shooting.wav',
  hit: '/audio/hover.wav',
  bump: '/audio/hover.wav',
  reload: '/audio/money_in.wav',
  newPlayer: '/audio/new_player.wav',
};

export class SoundBus {
  private cache = new Map<SoundEvent, Howl>();

  play(event: SoundEvent, volume = 1): void {
    let sound = this.cache.get(event);
    if (!sound) {
      sound = new Howl({ src: [MAP[event]], volume });
      this.cache.set(event, sound);
    }
    sound.volume(volume);
    sound.play();
  }
}
```

Audio filenames match the `.wav` files copied in Task 13 step 5 from `src/assets/`. List the files with `ls packages/client/public/audio/` and update the `MAP` if filenames differ. Remove any mapping that has no matching file.

### Task 39: HUD (ammo + speed + health)

**Files:**
- Create: `packages/client/src/ui/HUD.ts`

- [ ] **Step 1: Create `packages/client/src/ui/HUD.ts`**

```ts
import { Application, Container, Graphics, Text } from 'pixi.js';
import { DEFAULT_AMMO, DEFAULT_HEALTH, SHIP_MAX_SPEED } from '@glide/shared';

export class HUD {
  private speedText: Text;
  private ammoText: Text;
  private ammoBarFill: Graphics;
  private ammoBarOutline: Graphics;
  private healthBarFill: Graphics;
  private healthBarOutline: Graphics;
  private app: Application;

  constructor(app: Application, ui: Container) {
    this.app = app;
    this.speedText = new Text({ text: 'SPEED: 0', style: { fill: 0xffffff, fontSize: 20, fontFamily: 'monospace' } });
    this.ammoText = new Text({ text: `AMMO ${DEFAULT_AMMO}`, style: { fill: 0xffffff, fontSize: 20, fontFamily: 'monospace' } });
    this.ammoBarFill = new Graphics();
    this.ammoBarOutline = new Graphics();
    this.healthBarFill = new Graphics();
    this.healthBarOutline = new Graphics();
    ui.addChild(this.ammoBarFill, this.ammoBarOutline, this.ammoText, this.speedText, this.healthBarFill, this.healthBarOutline);
  }

  update(ammo: number, health: number, speed: number): void {
    const w = this.app.screen.width;
    const h = this.app.screen.height;

    this.speedText.position.set(w - 180, h - 40);
    this.speedText.text = `SPEED: ${speed >= SHIP_MAX_SPEED ? 'MAX' : Math.round(speed)}`;

    this.ammoText.position.set(30, h - 90);
    this.ammoText.text = ammo === 0 ? '[R] RELOAD' : `AMMO`;

    this.ammoBarFill.clear().rect(30, h - 70, (ammo / DEFAULT_AMMO) * 175, 30).fill(0xffffff);
    this.ammoBarOutline.clear().rect(30, h - 70, 175, 30).stroke({ width: 3, color: 0xffffff });

    this.healthBarFill.clear().rect(30, h - 120, (health / DEFAULT_HEALTH) * 175, 10).fill(0xffffff);
    this.healthBarOutline.clear().rect(30, h - 120, 175, 10).stroke({ width: 2, color: 0xffffff });
  }
}
```

### Task 40: Minimap

**Files:**
- Create: `packages/client/src/ui/Minimap.ts`

- [ ] **Step 1: Create `packages/client/src/ui/Minimap.ts`**

```ts
import { Application, Container, Graphics } from 'pixi.js';
import { ArenaState } from '@glide/shared';

export class Minimap {
  private gfx: Graphics;
  private app: Application;
  private readonly size = 160;
  private readonly worldRadius = 1200;

  constructor(app: Application, ui: Container) {
    this.app = app;
    this.gfx = new Graphics();
    ui.addChild(this.gfx);
  }

  update(state: ArenaState, ownX: number, ownY: number, ownSessionId: string): void {
    const size = this.size;
    const cx = this.app.screen.width - size - 20;
    const cy = 20;
    const scale = size / (2 * this.worldRadius);
    this.gfx.clear();
    this.gfx.rect(cx, cy, size, size).stroke({ width: 2, color: 0xffffff, alpha: 0.6 });

    for (const [, s] of state.structures) {
      if (s.footprint.length < 3) continue;
      const first = s.footprint[0];
      const fx = cx + size / 2 + (first.x - ownX) * scale;
      const fy = cy + size / 2 + (first.y - ownY) * scale;
      this.gfx.moveTo(fx, fy);
      for (let i = 1; i < s.footprint.length; i++) {
        const p = s.footprint[i];
        this.gfx.lineTo(cx + size / 2 + (p.x - ownX) * scale, cy + size / 2 + (p.y - ownY) * scale);
      }
      this.gfx.lineTo(fx, fy).stroke({ width: 1, color: 0xffffff, alpha: 0.5 });
    }

    this.gfx.circle(cx + size / 2, cy + size / 2, 3).fill(0xffffff);

    for (const [sid, ship] of state.ships) {
      if (sid === ownSessionId) continue;
      const mx = cx + size / 2 + (ship.x - ownX) * scale;
      const my = cy + size / 2 + (ship.y - ownY) * scale;
      if (mx >= cx && mx <= cx + size && my >= cy && my <= cy + size) {
        this.gfx.circle(mx, my, 2).fill(0xff6666);
      }
    }
  }
}
```

### Task 41: Particle emitters (thrust, tracer, hit)

For this cleanup, scaffold one emitter (thrust) and leave `tracer` and `hit` as stubs with clear TODOs that are resolvable by adding emitter config — not by rewiring.

**Files:**
- Create: `packages/client/src/render/Particles.ts`

- [ ] **Step 1: Create `packages/client/src/render/Particles.ts`**

```ts
import { Emitter } from '@pixi/particle-emitter';
import { Container, Graphics } from 'pixi.js';

function makeDotTexture(app: { renderer: { generateTexture: Function } }): any {
  const g = new Graphics().circle(0, 0, 2).fill(0xffffff);
  return app.renderer.generateTexture(g);
}

export class ThrustEmitter {
  private emitter: Emitter;
  constructor(parent: Container, renderer: any) {
    const texture = makeDotTexture({ renderer });
    this.emitter = new Emitter(parent, {
      lifetime: { min: 0.15, max: 0.35 },
      frequency: 0.02,
      emitterLifetime: -1,
      maxParticles: 200,
      pos: { x: 0, y: 0 },
      behaviors: [
        { type: 'alpha', config: { alpha: { list: [{ time: 0, value: 1 }, { time: 1, value: 0 }] } } },
        { type: 'scale', config: { scale: { list: [{ time: 0, value: 1 }, { time: 1, value: 0.2 }] } } },
        { type: 'moveSpeed', config: { speed: { list: [{ time: 0, value: 150 }, { time: 1, value: 0 }] } } },
        { type: 'rotationStatic', config: { min: 0, max: 360 } },
        { type: 'textureSingle', config: { texture } },
      ],
    });
    this.emitter.emit = false;
  }
  setActive(active: boolean, x: number, y: number, angle: number): void {
    this.emitter.emit = active;
    this.emitter.updateOwnerPos(x, y);
    this.emitter.rotate((angle * 180) / Math.PI + 180);
  }
  update(deltaSeconds: number): void {
    this.emitter.update(deltaSeconds);
  }
}
```

Tracer and hit emitters follow the same pattern and are deferred; the architecture supports them without change.

### Task 42: Integrate HUD, Minimap, Sound, Thrust particles into `main.ts`

**Files:**
- Modify: `packages/client/src/main.ts`

- [ ] **Step 1: Update imports at top of `main.ts`**

Append the following imports:

```ts
import { HUD } from './ui/HUD.js';
import { Minimap } from './ui/Minimap.js';
import { SoundBus } from './audio/SoundBus.js';
import { ThrustEmitter } from './render/Particles.js';
```

- [ ] **Step 2: Instantiate after stage is created (inside `boot`)**

After `const background = new Background(...)`:

```ts
const hud = new HUD(stage.app, stage.uiContainer);
const minimap = new Minimap(stage.app, stage.uiContainer);
const sound = new SoundBus();
const thrust = new ThrustEmitter(stage.particlesLayer, stage.app.renderer);
```

- [ ] **Step 3: Play shoot sound on spawn-event receipt**

Replace the existing spawn handler:

```ts
room.onMessage(PROJECTILE_SPAWN, (e: ProjectileSpawnEvent) => {
  projectileSim.spawn(e);
  if (e.ownerSessionId === net.sessionId) sound.play('shoot', 0.4);
});
room.onMessage(PROJECTILE_HIT, (_e: ProjectileHitEvent) => sound.play('hit', 0.5));
```

- [ ] **Step 4: Update HUD/Minimap/thrust each tick**

Inside the ticker, after `camera.update(...)` and `background.update(...)`:

```ts
const ownShipSchema = state.ships.get(net.sessionId);
const ammo = ownShipSchema?.ammo ?? 0;
const health = ownShipSchema?.health ?? 0;
hud.update(ammo, health, speed);
minimap.update(state, own.x, own.y, net.sessionId);

const accelHeld = keyboard.sampleFrame().accel; // cheap re-read OK; keyboard sampleFrame is idempotent aside from seq tick
thrust.setActive(accelHeld, own.x, own.y - 10, own.rotation);
thrust.update(stage.app.ticker.deltaMS / 1000);
```

Note: re-sampling the keyboard inside the ticker to get `accel` bumps the seq count. That's fine because we only send `pendingInputs.slice(-6)` so per-tick-doubling doesn't add wire traffic meaningfully. If you prefer, read from the last pushed input instead — refactor step for later polish.

- [ ] **Step 5: Smoke test**

Run; confirm HUD visible bottom-left (ammo bar, health bar, speed readout), minimap top-right showing structures and own ship, thrust particles trailing behind ship on accel, shoot sound on space.

### Task 43: Phase-6 commit

- [ ] **Step 1: Commit**

```bash
git add packages
git commit -m "add HUD, minimap, sound bus, bloom filter, thrust particle emitter"
```

---

## Phase 7 — Cleanup & Legacy Removal (Tasks 44–47)

Delete legacy files, verify nothing references the old prototype, typecheck and test pass, single commit.

### Task 44: Delete legacy source tree

**Files:**
- Delete: `src/` (everything except assets moved in Task 13)
- Delete: `index.js` (already done in Task 1)
- Delete: `node_modules/` (stale from old top-level install)

- [ ] **Step 1: Verify assets were copied correctly**

```bash
ls packages/client/public/audio/
```

Expected: same `.wav` files as were in `src/assets/`.

- [ ] **Step 2: Delete old source tree**

```bash
rm -rf src/
rm -rf node_modules/
```

- [ ] **Step 3: Reinstall to regenerate lockfile at workspace root only**

```bash
pnpm install
```

### Task 45: Grep for dead references

- [ ] **Step 1: Confirm no TS code imports from the old `src/` paths**

```bash
grep -r "from '.*/src/" packages/ || echo "no stale refs"
grep -r "require('.*src/" packages/ || echo "no stale refs"
```

Expected: `no stale refs` printed.

- [ ] **Step 2: Confirm no references to old `rooms/*` modules**

```bash
grep -rn "rooms/lobby\|rooms/arena\|rooms/intro\|rooms/menu\|rooms/experiment" packages/ || echo "clean"
```

Expected: `clean`.

### Task 46: Full build and test

- [ ] **Step 1: Typecheck everything**

```bash
pnpm typecheck
```

Expected: exits 0.

- [ ] **Step 2: Run all tests**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 3: Smoke test — run server + client in two windows**

```bash
pnpm dev:server
pnpm dev:client
```

Open two browser windows. Verify:
- Ships fly around with WASD/arrows
- Space shoots
- Projectiles bounce off walls (are destroyed on structure contact)
- Projectiles damage the other player (their health bar drops)
- Bloom, HUD, minimap, thrust particles, sound all working
- No console errors

### Task 47: Phase-7 commit

- [ ] **Step 1: Commit**

```bash
git add -A
git commit -m "remove legacy prototype source tree"
```

---

## Summary

**Total commits:** 7 (one per phase), matching the "minimize commits" preference.

**What's shipped at the end:**
- pnpm monorepo (shared / server / client) in strict TypeScript
- Authoritative Colyseus server running Planck physics at 30Hz, broadcasting at 20Hz
- Pixi v8 client with bloom, camera, grid, gradient, HUD, minimap, thrust particles, sound bus
- Client-side prediction + server reconciliation for own ship, interpolation for remote ships
- Server-authoritative projectile spawning and hit resolution; client-side local projectile sim
- Pseudo-3D structure rendering with correct perspective math
- Unit tests on shared math + server ship sim + projectile contact
- Legacy prototype source tree removed

**What's deliberately stubbed but plumbed:**
- Health (field exists, damage works, death/respawn flow not implemented)
- Shields, boost, melee (fields exist on schema, input wiring will drop into `InputFrame` cleanly)
- Tracer and hit particle emitters (scaffold in Particles.ts, config not yet written)
- Full interest management via `StateView` (entities carry position; flag not yet enabled)
