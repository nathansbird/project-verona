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
import { HUD } from './ui/HUD.js';
import { Minimap } from './ui/Minimap.js';
import { SoundBus } from './audio/SoundBus.js';
import { ThrustEmitter } from './render/Particles.js';

async function boot(): Promise<void> {
  const stage = await createStage();
  const camera = new Camera(stage.app, stage.worldContainer);
  const background = new Background(stage.app, stage.bgLayer, stage.gridLayer);
  const hud = new HUD(stage.app, stage.uiContainer);
  const minimap = new Minimap(stage.app, stage.uiContainer);
  const sound = new SoundBus();
  const thrust = new ThrustEmitter(stage.particlesLayer, stage.app.renderer);
  const keyboard = new KeyboardInput();
  const prediction = new Prediction();
  const projectileSim = new LocalProjectileSim();
  const inputSendIntervalMs = 1000 / INPUT_SEND_HZ;

  const net = new NetClient({
    onAck: (lastSeq) => prediction.onAck(lastSeq),
  });
  const room = await net.join();

  room.onMessage(PROJECTILE_SPAWN, (e: ProjectileSpawnEvent) => {
    projectileSim.spawn(e);
    if (e.ownerSessionId === net.sessionId) sound.play('shoot', 0.4);
  });
  room.onMessage(PROJECTILE_HIT, (_e: ProjectileHitEvent) => sound.play('hit', 0.5));
  room.onMessage(PROJECTILE_CANCEL, (e: ProjectileCancelEvent) => projectileSim.cancel(e.id));

  const ownShipView = new ShipView();
  stage.shipsLayer.addChild(ownShipView.container);

  const remoteShips = new Map<string, { view: ShipView; interp: InterpolationBuffer }>();
  const structureViews = new Map<string, StructureView>();
  const projectileViews = new Map<string, ProjectileView>();

  const pendingInputs: InputFrame[] = [];
  let lastInputSendAt = 0;
  let lastFrame: InputFrame = {
    seq: 0,
    accel: false,
    left: false,
    right: false,
    brake: false,
    shoot: false,
  };

  stage.app.ticker.add(() => {
    const frame = keyboard.sampleFrame();
    lastFrame = frame;
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

    const ammo = ownSchema?.ammo ?? 0;
    const health = ownSchema?.health ?? 0;
    hud.update(ammo, health, speed);
    minimap.update(state, own.x, own.y, net.sessionId);

    thrust.setActive(lastFrame.accel, own.x, own.y, own.rotation);
    thrust.update(stage.app.ticker.deltaMS / 1000);

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
