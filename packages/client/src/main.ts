import {
  INPUT_SEND_HZ,
  InputFrame,
  PROJECTILE_CANCEL,
  PROJECTILE_HIT,
  PROJECTILE_LIFETIME_SECONDS,
  PROJECTILE_NOSE_OFFSET,
  PROJECTILE_SPAWN,
  PROJECTILE_SPAWN_COOLDOWN_SECONDS,
  PROJECTILE_SPEED,
  ProjectileCancelEvent,
  ProjectileHitEvent,
  ProjectileSpawnEvent,
  SHIP_DEATH,
  SHIP_RESPAWN,
  ShipDeathEvent,
  ShipRespawnEvent,
  SIM_TICK_HZ,
  SIM_TICK_SECONDS,
} from '@glide/shared';
import { SoundBus } from './audio/SoundBus.js';
import { ProjectileView } from './entities/ProjectileView.js';
import { ShipShatter } from './entities/ShipShatter.js';
import { ShipView } from './entities/ShipView.js';
import { StructureView } from './entities/StructureView.js';
import { KeyboardInput } from './input/Keyboard.js';
import { InterpolationBuffer } from './net/Interpolation.js';
import { NetClient } from './net/NetClient.js';
import { Prediction } from './net/Prediction.js';
import { Background } from './render/Background.js';
import { Camera } from './render/Camera.js';
import { ThrustParticles } from './render/Particles.js';
import { createStage } from './render/Stage.js';
import { LocalProjectileSim } from './sim/LocalProjectileSim.js';
import { FpsCounter } from './ui/FpsCounter.js';
import { HUD } from './ui/HUD.js';
import { Minimap } from './ui/Minimap.js';

async function boot(): Promise<void> {
  const stage = await createStage();
  const camera = new Camera(stage.app, stage.worldContainer);
  const background = new Background(stage.app, stage.bgLayer, stage.gridLayer);
  const hud = new HUD(stage.app, stage.uiContainer);
  const minimap = new Minimap(stage.app, stage.uiContainer);
  const sound = new SoundBus();
  const fpsCounter = new FpsCounter(stage.app, stage.uiContainer);
  // (particles get their container assigned after ownShipView is created)
  const keyboard = new KeyboardInput();
  const prediction = new Prediction();
  const projectileSim = new LocalProjectileSim();

  const startMusic = (): void => {
    sound.start('music', 0.1);
    window.removeEventListener('keydown', startMusic);
    window.removeEventListener('pointerdown', startMusic);
  };
  window.addEventListener('keydown', startMusic);
  window.addEventListener('pointerdown', startMusic);

  const simTickMs = 1000 / SIM_TICK_HZ;
  const inputSendIntervalMs = 1000 / INPUT_SEND_HZ;

  const net = new NetClient({
    onAck: (lastSeq) => prediction.onAck(lastSeq),
  });
  const room = await net.join();

  room.onMessage(PROJECTILE_SPAWN, (e: ProjectileSpawnEvent) => {
    if (e.ownerSessionId === net.sessionId) {
      const localId = pendingOwnProjectileIds.shift();
      if (localId && projectileSim.rename(localId, e.id)) {
        const view = projectileViews.get(localId);
        if (view) {
          projectileViews.delete(localId);
          projectileViews.set(e.id, view);
        }
      } else {
        const pred = prediction.getRenderState(simAccumulatorMs / simTickMs);
        const fx = Math.cos(pred.rotation);
        const fy = Math.sin(pred.rotation);
        projectileSim.spawn({
          ...e,
          x: pred.x + fx * PROJECTILE_NOSE_OFFSET,
          y: pred.y + fy * PROJECTILE_NOSE_OFFSET,
        });
      }
    } else {
      projectileSim.spawn(e);
    }
  });
  room.onMessage(PROJECTILE_HIT, (_e: ProjectileHitEvent) => sound.play('hit', 0.5));
  room.onMessage(PROJECTILE_CANCEL, (e: ProjectileCancelEvent) => projectileSim.cancel(e.id));

  room.onMessage(SHIP_DEATH, (e: ShipDeathEvent) => {
    sound.play('hit', 0.9);
    const shatter = new ShipShatter({ x: e.x, y: e.y, vx: e.vx, vy: e.vy, rotation: e.rotation });
    stage.shipsLayer.addChild(shatter.container);
    shatters.push(shatter);

    if (e.sessionId === net.sessionId) {
      localDead = true;
      spectX = e.x;
      spectY = e.y;
      spectVX = e.vx;
      spectVY = e.vy;
      spectRotation = e.rotation;
      ownShipView.container.visible = false;
      thrustHeld = false;
      pendingOwnProjectileIds.length = 0;
      clientShotCooldownSec = 0;
      sound.stop('shoot');
      sound.play('die', 0.8);
    } else {
      deadRemoteSessions.add(e.sessionId);
      const entry = remoteShips.get(e.sessionId);
      if (entry) {
        stage.shipsLayer.removeChild(entry.view.container);
        remoteShips.delete(e.sessionId);
      }
    }
  });

  room.onMessage(SHIP_RESPAWN, (e: ShipRespawnEvent) => {
    if (e.sessionId === net.sessionId) {
      localDead = false;
      prediction.snap({
        x: e.x,
        y: e.y,
        vx: 0,
        vy: 0,
        rotation: e.rotation,
        rotationV: 0,
      });
      ownShipView.container.visible = true;
    } else {
      deadRemoteSessions.delete(e.sessionId);
    }
  });

  const ownShipView = new ShipView();
  stage.shipsLayer.addChild(ownShipView.container);

  const thrustParticles = new ThrustParticles(ownShipView.container);

  const remoteShips = new Map<string, { view: ShipView; interp: InterpolationBuffer }>();
  const structureViews = new Map<string, StructureView>();
  const projectileViews = new Map<string, ProjectileView>();

  const pendingInputs: InputFrame[] = [];
  let lastInputSendAt = 0;
  let simAccumulatorMs = 0;
  let lastSeenServerTick = -1;
  let lastShootState = false;
  let lastReloadState = false;
  let thrustHeld = false;
  let hasSnappedSpawn = false;
  let thrustEmitAccumMs = 0;
  const thrustEmitIntervalMs = 1000 / 80;

  const shatters: ShipShatter[] = [];
  const deadRemoteSessions = new Set<string>();
  const pendingOwnProjectileIds: string[] = [];
  let nextLocalShotN = 1;
  let clientShotCooldownSec = 0;
  const projectileLifetimeTicks = Math.round(PROJECTILE_LIFETIME_SECONDS * SIM_TICK_HZ);
  let localDead = false;
  let spectX = 0;
  let spectY = 0;
  let spectVX = 0;
  let spectVY = 0;
  let spectRotation = 0;
  const SPECT_DAMPING = 0.8;

  stage.app.ticker.add(() => {
    fpsCounter.update();
    const deltaMs = stage.app.ticker.deltaMS;
    simAccumulatorMs += deltaMs;

    let shotsPendingThisFrame = 0;

    while (simAccumulatorMs >= simTickMs) {
      simAccumulatorMs -= simTickMs;
      const frame = keyboard.sampleFrame();
      if (!localDead) prediction.pushInput(frame);
      pendingInputs.push(frame);
      projectileSim.step();

      if (clientShotCooldownSec > 0) clientShotCooldownSec -= SIM_TICK_SECONDS;

      thrustHeld = !localDead && frame.accel;

      const ownSchemaNow = net.state?.ships.get(net.sessionId);
      const hasAmmo = (ownSchemaNow?.ammo ?? 0) > 0;
      const canShoot = !localDead && hasAmmo;

      if (frame.shoot !== lastShootState || !canShoot) {
        lastShootState = frame.shoot;
        if (frame.shoot && canShoot) sound.start('shoot', 0.4);
        else sound.stop('shoot');
      }

      if (frame.shoot && canShoot && clientShotCooldownSec <= 0) {
        shotsPendingThisFrame += 1;
        clientShotCooldownSec = PROJECTILE_SPAWN_COOLDOWN_SECONDS;
      }

      if (frame.reload && !lastReloadState && !localDead) sound.play('reload', 0.6);
      lastReloadState = frame.reload;
    }


    const now = performance.now();
    if (now - lastInputSendAt >= inputSendIntervalMs) {
      if (pendingInputs.length > 0) {
        net.sendInputs(pendingInputs.slice(-6));
        pendingInputs.length = 0;
      }
      lastInputSendAt = now;
    }

    const state = net.state;
    if (!state) return;

    if (state.serverTick !== lastSeenServerTick) {
      lastSeenServerTick = state.serverTick;

      const ownSchema = state.ships.get(net.sessionId);
      if (ownSchema && ownSchema.alive && !localDead) {
        const snapshot = {
          x: ownSchema.x,
          y: ownSchema.y,
          vx: ownSchema.vx,
          vy: ownSchema.vy,
          rotation: ownSchema.rotation,
          rotationV: ownSchema.rotationV,
        };
        if (!hasSnappedSpawn) {
          prediction.snap(snapshot);
          hasSnappedSpawn = true;
        } else {
          prediction.reconcile(snapshot, simAccumulatorMs / simTickMs);
        }
      }

      for (const [sid, ship] of state.ships) {
        if (sid === net.sessionId) continue;
        if (!ship.alive) continue;
        if (deadRemoteSessions.has(sid)) continue;
        let entry = remoteShips.get(sid);
        if (!entry) {
          const view = new ShipView();
          stage.shipsLayer.addChild(view.container);
          entry = { view, interp: new InterpolationBuffer() };
          remoteShips.set(sid, entry);
        }
        entry.interp.push(ship.x, ship.y, ship.rotation);
      }
      for (const sid of remoteShips.keys()) {
        if (!state.ships.has(sid)) {
          const entry = remoteShips.get(sid)!;
          stage.shipsLayer.removeChild(entry.view.container);
          remoteShips.delete(sid);
        }
      }
    }

    prediction.decayError(deltaMs / 1000);
    const dtSec = deltaMs / 1000;
    const alpha = simAccumulatorMs / simTickMs;

    let camX: number, camY: number, camRot: number, camSpeed: number;
    if (localDead) {
      spectX += spectVX * dtSec;
      spectY += spectVY * dtSec;
      const damp = Math.max(0, 1 - SPECT_DAMPING * dtSec);
      spectVX *= damp;
      spectVY *= damp;
      camX = spectX;
      camY = spectY;
      camRot = spectRotation;
      camSpeed = Math.hypot(spectVX, spectVY);
      thrustEmitAccumMs = 0;
    } else {
      const own = prediction.getRenderState(alpha);
      const ownSpeed = Math.hypot(own.vx, own.vy);
      if (thrustHeld) {
        thrustEmitAccumMs += deltaMs;
        while (thrustEmitAccumMs >= thrustEmitIntervalMs) {
          thrustEmitAccumMs -= thrustEmitIntervalMs;
          thrustParticles.emit();
        }
      } else {
        thrustEmitAccumMs = 0;
      }
      ownShipView.setTransform(own.x, own.y, own.rotation, ownSpeed, own.rotationV);
      if (shotsPendingThisFrame > 0) {
        const fx = Math.cos(own.rotation);
        const fy = Math.sin(own.rotation);
        const spawnX = own.x + fx * PROJECTILE_NOSE_OFFSET;
        const spawnY = own.y + fy * PROJECTILE_NOSE_OFFSET;
        for (let i = 0; i < shotsPendingThisFrame; i++) {
          const id = `own-${nextLocalShotN++}`;
          projectileSim.spawn({
            id,
            ownerSessionId: net.sessionId,
            x: spawnX,
            y: spawnY,
            vx: own.vx + fx * PROJECTILE_SPEED,
            vy: own.vy + fy * PROJECTILE_SPEED,
            spawnTick: projectileSim.currentTick,
            despawnTick: projectileSim.currentTick + projectileLifetimeTicks,
          });
          pendingOwnProjectileIds.push(id);
        }
      }
      camX = own.x;
      camY = own.y;
      camRot = own.rotation;
      camSpeed = ownSpeed;
    }
    thrustParticles.update(dtSec);

    for (let i = shatters.length - 1; i >= 0; i--) {
      shatters[i].update(dtSec);
      if (shatters[i].finished) shatters.splice(i, 1);
    }

    camera.update(camX, camY, camRot, camSpeed);
    background.update(stage.app, camX, camY, camRot);

    const ownSchemaRead = state.ships.get(net.sessionId);
    const ammo = ownSchemaRead?.ammo ?? 0;
    const health = ownSchemaRead?.health ?? 0;
    hud.update(ammo, health, camSpeed);
    minimap.update(state, camX, camY, camRot, net.sessionId);


    const nowPerf = performance.now();
    for (const [sid, entry] of remoteShips) {
      const sampled = entry.interp.sample(nowPerf);
      if (sampled) {
        const schema = state.ships.get(sid);
        const speed = schema ? Math.hypot(schema.vx, schema.vy) : 0;
        const rotV = schema?.rotationV ?? 0;
        entry.view.setTransform(sampled.x, sampled.y, sampled.rotation, speed, rotV);
      }
    }

    for (const [id, schema] of state.structures) {
      let view = structureViews.get(id);
      if (!view) {
        const pts = schema.footprint.map((p) => ({ x: p.x, y: p.y }));
        view = new StructureView(pts, schema.depth);
        stage.structuresLayer.addChild(view.container);
        structureViews.set(id, view);
        projectileSim.addStructure(pts);
      }
      view.updateExtrusion(camX, camY);
    }

    const seenIds = new Set<string>();
    for (const [id, p] of projectileSim.entries()) {
      seenIds.add(id);
      let view = projectileViews.get(id);
      if (!view) {
        const color = p.ownerSessionId === net.sessionId ? 0xffffff : 0xff6060;
        view = new ProjectileView(color);
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
