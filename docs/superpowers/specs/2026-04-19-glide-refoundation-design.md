# Glide — Refoundation Design

**Date:** 2026-04-19
**Scope:** Rebuild the Glide prototype (née Project Viridian) on a modern, proven stack while preserving the dark, retro, minimal, bloom/glow, pseudo-3D wireframe aesthetic. Output of this work is a single multiplayer arena, running on foundations that the five near-term goals (expansive worlds, real collision, real PVP, particles/drift/sound, minimap) can slot into as additive features.

---

## Goals

1. Replace hand-rolled physics and collision with a proven, deterministic library.
2. Replace trusted-client networking with an authoritative-server multiplayer framework.
3. Replace Canvas 2D with a WebGL-backed renderer that preserves the current aesthetic and unlocks real bloom, particles, and post-processing.
4. Establish a project structure, build system, and language (TypeScript) that supports client/server code sharing and long-term development.
5. Leave clear hook points for the five near-term features without implementing them in this cleanup pass.

## Non-Goals

- Implementing the five near-term features themselves (shields, boost, melee, minimap, particles beyond scaffolding). Those are follow-on work.
- Rebuilding the intro cinematic, menu, or alternate rooms. Scrapped per scope decision.
- Procedural world generation. Initial world is a hand-placed structure array.
- Client rendering tests or CI.

---

## Stack

| Layer | Choice | Rationale |
|---|---|---|
| Language | TypeScript (strict) | Catches netcode class of bugs at compile time. Required for ergonomic Colyseus schemas. |
| Rendering | PixiJS 8 + `pixi-filters` + `@pixi/particle-emitter` | GPU-accelerated 2D; real `AdvancedBloomFilter` replaces `context.shadowBlur`; `Graphics` API ports the wireframe shapes one-to-one from the current `moveTo/lineTo` calls. |
| Physics | Planck.js | Deterministic Box2D port, runs identically in Node and browser (required for server-authoritative sim with client-side prediction). Same package imported in server and client. |
| Networking | Colyseus 0.15 + `@colyseus/schema` | Authoritative rooms, delta state sync, and `StateView` interest management for expansive worlds. |
| Build (client) | Vite | Native TS/ESM, fast HMR, one proxy line handles WS dev routing. |
| Build (server) | `tsx` watch | Run TS directly in Node without a compile step in dev. |
| Audio | `howler` (kept) | Already working; wrapped in a small `SoundBus` for modularity. |
| Tests | Vitest | Unit tests on shared math and server sim logic. |

---

## Repo Layout

```
glide/
├── package.json              # root, workspaces config
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── packages/
│   ├── shared/               # Colyseus schemas, physics constants,
│   │   ├── src/              # collision categories, input messages,
│   │   └── package.json      # math helpers, entity type defs
│   ├── server/
│   │   ├── src/
│   │   │   ├── index.ts      # Colyseus server bootstrap
│   │   │   ├── ArenaRoom.ts  # room + fixed-timestep sim loop
│   │   │   ├── sim/          # Planck world, Ship/Projectile/Structure sim
│   │   │   └── net/          # input handlers, interest filtering
│   │   └── package.json
│   └── client/
│       ├── src/
│       │   ├── main.ts       # entry, connects, drives frame loop
│       │   ├── net/          # Colyseus client, prediction, reconciliation
│       │   ├── render/       # PixiJS stage, camera, bloom/CRT filters
│       │   ├── entities/     # presentation classes (Ship, Projectile, …)
│       │   ├── input/        # keyboard, intent mapping
│       │   └── ui/           # minimap, HUD (ammo/speed), overlays
│       ├── public/audio/     # moved from src/assets/
│       ├── index.html
│       ├── vite.config.ts
│       └── package.json
└── docs/
    └── superpowers/specs/
```

The `shared/` package is load-bearing: drift between server-side and client-side physics or schema definitions is the primary source of netcode bugs. Physically sharing the code prevents it.

---

## Simulation & Networking Model

### Authority
- Server is authoritative. Owns the Planck `World`, advances simulation at a fixed timestep, decides all positions, collisions, hit registration, and health.
- Clients send input commands (not positions), stamped with sequence numbers.
- Clients run the same Planck sim locally for their own ship for immediate input response (client-side prediction).
- On each state snapshot, the client snaps its own ship to the server's authoritative state, then replays any inputs the server has not yet acknowledged (server reconciliation).
- Remote ships are rendered ~100 ms behind real time, interpolating between the two most recent server snapshots. No prediction for remote ships.

### Tick Rates
- Server sim: 30 Hz (33.3 ms fixed timestep).
- Client sim for own ship: 30 Hz, identical Planck step to server.
- Server state broadcast: 20 Hz (every 3rd sim tick).
- Client input send: 30 Hz, piggybacking the last few input frames for packet-loss resilience.
- Client render loop: uncapped, driven by Pixi `Ticker`, interpolates between sim states.

All tick rates are tunable constants; these are starting values.

### Collision Model
Four collision categories as Planck filter bitmasks:
- `SHIP`: dynamic circle fixture (~20 unit radius). Collides with `STRUCTURE | SHIP | PROJECTILE | SHIELD`.
- `PROJECTILE`: dynamic circle, `bullet` flag (continuous collision detection). Collides with `STRUCTURE | SHIP | SHIELD`. Despawns on first contact.
- `STRUCTURE`: static polygon or edge fixture. Pseudo-3D extrusion is purely visual and does not affect physics.
- `SHIELD`: sensor fixture attached to a ship when its shield is active.

Contact events are dispatched in a `beginContact` listener on the server:
- `projectile + ship` → apply damage, destroy projectile, broadcast hit event.
- `ship + structure` → Planck handles reflection natively; server broadcasts a bump event for sound.
- `ship + ship` → bidirectional bounce + light damage.

### Interest Management
- Day one: server broadcasts full room state to all clients. Sufficient to ~10 players and a few hundred structures.
- Upgrade path: Colyseus `StateView` per-client filtering, keyed on distance from the player. Entities are designed with a uniform `getPosition()` contract so enabling view filtering is a configuration change, not a rewrite.

### Anti-Cheat Posture
- Input rate validation (reject impossibly fast input streams).
- Speed, rotation, and shot cadence capped in server sim regardless of client reports.
- The 90 ms projectile cadence runs on the server, not the client.
- No trust in client-reported positions.

---

## Entity Model

Three entities, each split across three layers. Simulation state lives only on the server. Network state is defined once in `shared/` and replicated via Colyseus. Presentation state lives only on the client.

### Ship
- **Simulation (server):** Planck dynamic body (circle fixture ~20 unit radius), filter bits = `SHIP`, thrust and torque applied each tick from the latest acknowledged input, speed and rotation caps enforced in server sim.
- **Network (shared Colyseus schema):** `sessionId, x, y, vx, vy, rotation, rotationV, health, ammo, shieldActive, boostActive, name`.
- **Presentation (client):** `PIXI.Graphics` for the triangular wireframe (ported directly from the current `Player.render` `moveTo/lineTo` chain), engine-thrust particle emitter, interpolation buffer for remote ships or local-prediction state for the player's own ship.

### Projectile — event-spawned, locally-simulated
Projectiles are not replicated per tick. Replicating a steady state of 100+ short-lived projectiles is wasteful.

- **Spawn:** when the server decides a projectile spawns, it emits a `projectileSpawn` event: `{id, ownerSessionId, x, y, vx, vy, spawnTick, despawnTick}`.
- **Local sim:** every client runs its own deterministic linear projectile sim from that initial state. Same initial conditions, same despawn tick → identical trajectories across clients without per-tick replication.
- **Hit registration:** the server is the only party that registers hits. On `beginContact` between a projectile and a ship, the server applies damage and broadcasts a `projectileHit` event (position, victim id, owner id). Clients never decide their own hits.
- **Prediction:** the player's own bullets appear locally the frame they fire. If the server rejects the spawn (e.g. ammo desync), a `projectileCancel` event removes them.

### Structure
- **Simulation (server):** static Planck body with polygon fixture built from a footprint point list.
- **Network (shared Colyseus schema, sent once on join):** `id, footprint: Array<{x, y}>, depth`. `depth` is the pseudo-3D extrusion amount (visual only).
- **Presentation (client):** two `PIXI.Graphics` layers — the footprint polygon on the ground plane, and the extruded "top" drawn with the same vanishing-point math used today (`offLX = -((x - width/2) - player.x) / depth`).
- **Barriers:** degenerate structures with a two-point footprint. Physics = Planck edge fixture; visual = single `lineTo`.

---

## Rendering

### Stage Hierarchy

```
app.stage
├── bgLayer            # linear gradient sprite, rotates with player
├── worldContainer     # all world objects, camera transform applied here
│   ├── gridLayer      # TilingSprite, infinite scrolling grid
│   ├── structuresLayer
│   ├── projectilesLayer
│   ├── shipsLayer
│   └── particlesLayer
├── bloomComposite     # filter stack applied to worldContainer
└── uiContainer        # untransformed, screen-fixed
    ├── hud            # ammo, speed, health
    └── minimap
```

### Camera
A single transform on `worldContainer` each frame, driven by the local player:
- `pivot = (player.x, player.y)`
- `rotation = -player.rotation`
- `scale = 1.2 - (speed / maxSpeed) / 3` (matches the prototype's feel)
- `position = (screen.width / 2, screen.height / 2)`

All per-object `context.save/translate/rotate/scale/restore` chains from the current prototype are eliminated in favor of this single transform.

### Wireframe
`PIXI.Graphics` with `lineStyle({ width: 2, color: 0xffffff })` and no fill. Existing shape code ports directly — the API is nearly one-to-one with the current Canvas 2D paths.

### Bloom / Glow
- `AdvancedBloomFilter` (from `pixi-filters`) applied to `worldContainer`. Replaces `context.shadowBlur` with real GPU Gaussian bloom. Tunable `threshold`, `bloomScale`, `blur`.
- Optional, shipped off by default: `CRTFilter` (scanlines + barrel distortion), `RGBSplitFilter` (chromatic aberration).

### Background
Full-screen gradient sprite rotated with `-player.rotation`, outside the bloom pass. Replicates the current `linear-gradient(${-rotation}deg, #250000, #000025)` body background.

### Grid
Single `PIXI.TilingSprite` of a small grid-cell texture, parented to `worldContainer`. `tilePosition = (-player.x, -player.y)`. Camera transform handles rotation and zoom for free.

### HUD
`PIXI.Graphics` and `PIXI.Text` in `uiContainer`. The ammo-bar difference blend effect uses `BLEND_MODES.DIFFERENCE`.

### Minimap
`PIXI.Graphics` in `uiContainer`, redrawn per frame from known entity positions. Draws the player at center, remote ships as dots at scaled relative positions, and structure footprints scaled down. Does not rotate with the camera by default (configurable).

### Sound
Existing `howler` usage wrapped in a `SoundBus` module with a `play(eventName, options)` API. Game code triggers named events; the bus maps events to audio files. Adding a sound for a new event becomes a one-line entry.

### Particles
`@pixi/particle-emitter`. Three emitters scaffolded in this cleanup:
- Engine thrust (attached to each ship, scales with speed)
- Projectile tracer (short fading trail)
- Hit spark (burst on projectile-ship contact)

Additional emitters (drift dust, shield ripple, explosion) are additive and live in the same particles layer.

---

## Hook Points for Near-Term Goals

| Goal | Where it slots in |
|---|---|
| Expansive worlds | `WorldGenerator` module in server package; entities carry `getPosition()` for future `StateView` filtering. |
| Real collision | Solved by the Planck integration itself. No further architecture work needed. |
| Real PVP (shields, boost, melee, health) | Additive server-side systems mutating `ShipSchema` fields, contact-listener handlers for hit resolution, sensor fixtures for shield/melee cones. No restructuring required. |
| Particles, drift, sound | Particle emitters scaffolded in this pass; drift emerges from Planck physics and is triggered off an `|velocity| > t AND angle-offset > t` test; sound plumbing complete via `SoundBus`. |
| Minimap | Scaffolded as empty UI element in this pass; implementation detail is drawing, not architecture. |

---

## Testing Strategy

Deliberately minimal. Tests in places where they catch classes of bugs that hurt most in a real-time multiplayer game.

- **Vitest unit tests in `shared/`:** math helpers, deterministic projectile trajectory (same inputs → identical outputs in Node and jsdom), collision filter bit logic.
- **Server sim tests:** fire synthetic input sequences at an isolated `ArenaRoom`, assert state transitions for damage, respawn, ammo, cooldowns.
- **No client rendering tests.**
- **No integration tests yet.** Revisit if netcode complexity warrants it.

---

## Migration — What's Deleted, What's Kept

**Deleted (preserved in git history):**
- Root `index.js` (Express + Socket.io server)
- `src/index.html`, `src/style.css`, `src/index.js`
- `src/rooms/intro.js`, `menu.js`, `arena.js`, `experiment.js`, `lobby.js`
- Root `package.json`, `package-lock.json` (already gone), `pnpm-lock.yaml` (regenerated at workspace root)
- Howler and Socket.io CDN `<script>` tags
- Tracked `.DS_Store` files (also `.gitignore`d properly)

**Kept:**
- `src/assets/*.wav` — relocated to `packages/client/public/audio/`
- `.git/` history — this is a refactor on `master`

---

## Migration Order (high level — detailed sequencing lives in the implementation plan)

1. Monorepo scaffold: pnpm workspaces, base TS config, lint/format config.
2. `shared/` package: Colyseus schemas, collision categories, physics constants, input message types.
3. Minimal Colyseus server: `ArenaRoom` accepts connections, runs an empty Planck world at 30 Hz, broadcasts state.
4. Minimal Pixi client: connects, renders a ship from authoritative state, sends inputs, sees server-authoritative motion. Game is playable end-to-end in a trivial form at this step.
5. Wireframe ship rendering + camera transform ported.
6. Structures (footprint + pseudo-3D extrusion) + static Planck bodies.
7. Projectile system: event-spawned, locally-simulated, server-authoritative hits.
8. HUD (ammo, speed) + `SoundBus` wiring.
9. `AdvancedBloomFilter` + background gradient + grid.
10. Particle emitters: thrust, tracer, hit spark.
11. Placeholder hooks for health, shields, boost, melee (fields + input commands wired, behavior stubbed).
12. Minimap scaffold.
13. Final cleanup: delete legacy files, update `.gitignore`, verify no dead paths remain.

Each step leaves the project in a runnable state. Later steps do not break earlier ones.

---

## Dev Loop

```
pnpm dev          # server + client concurrently
pnpm dev:server   # tsx watch on packages/server/src/index.ts
pnpm dev:client   # vite dev server on packages/client
pnpm build        # typecheck + build both
pnpm test         # vitest on shared + server
pnpm typecheck    # tsc --noEmit across packages
```

Server listens on `:2567`. Vite proxies WS traffic from `:5173` to `:2567` during dev.

---

## Dependencies

**Root (devDependencies):**
`typescript`, `@types/node`, `vitest`, `prettier`, `eslint`, `@types/ws`

**`packages/shared`:**
`@colyseus/schema`, `planck`

**`packages/server`:**
`colyseus`, `@colyseus/ws-transport`, `express`, `planck` (re-declared here to pin the same version as shared), `tsx` (dev)

**`packages/client`:**
`pixi.js`, `pixi-filters`, `@pixi/particle-emitter`, `colyseus.js`, `howler`, `@types/howler`, `vite` (dev)
