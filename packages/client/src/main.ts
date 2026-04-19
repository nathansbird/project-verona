import { INPUT_SEND_HZ, InputFrame } from '@glide/shared';
import { createStage } from './render/Stage.js';
import { Camera } from './render/Camera.js';
import { Background } from './render/Background.js';
import { NetClient } from './net/NetClient.js';
import { KeyboardInput } from './input/Keyboard.js';
import { Prediction } from './net/Prediction.js';
import { InterpolationBuffer } from './net/Interpolation.js';
import { ShipView } from './entities/ShipView.js';
import { StructureView } from './entities/StructureView.js';

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
