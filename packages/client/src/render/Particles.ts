import { Emitter } from '@pixi/particle-emitter';
import { Container, Graphics, Renderer } from 'pixi.js';

function makeDotTexture(renderer: Renderer) {
  const g = new Graphics().circle(0, 0, 2).fill(0xffffff);
  return renderer.generateTexture(g);
}

export class ThrustEmitter {
  private emitter: Emitter;

  constructor(parent: Container, renderer: Renderer) {
    const texture = makeDotTexture(renderer);
    this.emitter = new Emitter(parent as any, {
      lifetime: { min: 0.15, max: 0.35 },
      frequency: 0.02,
      emitterLifetime: -1,
      maxParticles: 200,
      pos: { x: 0, y: 0 },
      behaviors: [
        {
          type: 'alpha',
          config: { alpha: { list: [{ time: 0, value: 1 }, { time: 1, value: 0 }] } },
        },
        {
          type: 'scale',
          config: { scale: { list: [{ time: 0, value: 1 }, { time: 1, value: 0.2 }] } },
        },
        {
          type: 'moveSpeed',
          config: { speed: { list: [{ time: 0, value: 150 }, { time: 1, value: 0 }] } },
        },
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
