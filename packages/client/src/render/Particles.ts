import { Container, Graphics } from 'pixi.js';

interface Particle {
  localX: number;
  localY: number;
  localVx: number;
  localVy: number;
  age: number;
  life: number;
  size: number;
}

export class ThrustParticles {
  private gfx = new Graphics();
  private particles: Particle[] = [];

  constructor(shipContainer: Container) {
    shipContainer.addChild(this.gfx);
  }

  emit(): void {
    const jitterX = (Math.random() - 0.5) * 20;
    const jitterY = (Math.random() - 0.5) * 20;

    this.particles.push({
      localX: -25,
      localY: 0,
      localVx: -(400 + Math.random() * 200) + jitterX,
      localVy: (Math.random() - 0.5) * 40 + jitterY,
      age: 0,
      life: 0.2 + Math.random() * 0.15,
      size: 1.5 + Math.random() * 2,
    });
  }

  update(dtSec: number): void {
    for (const p of this.particles) {
      p.localX += p.localVx * dtSec;
      p.localY += p.localVy * dtSec;
      p.age += dtSec;
    }
    this.particles = this.particles.filter((p) => p.age < p.life);

    this.gfx.clear();
    for (const p of this.particles) {
      const t = p.age / p.life;
      const alpha = 1 - t;
      const radius = p.size * (1 - t * 0.6);
      this.gfx.circle(p.localX, p.localY, radius).fill({ color: 0xffffff, alpha });
    }
  }
}
