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
    this.speedText = new Text({
      text: 'SPEED: 0',
      style: { fill: 0xffffff, fontSize: 20, fontFamily: 'monospace' },
    });
    this.ammoText = new Text({
      text: `AMMO ${DEFAULT_AMMO}`,
      style: { fill: 0xffffff, fontSize: 20, fontFamily: 'monospace' },
    });
    this.ammoBarFill = new Graphics();
    this.ammoBarOutline = new Graphics();
    this.healthBarFill = new Graphics();
    this.healthBarOutline = new Graphics();
    ui.addChild(
      this.ammoBarFill,
      this.ammoBarOutline,
      this.ammoText,
      this.speedText,
      this.healthBarFill,
      this.healthBarOutline,
    );
  }

  update(ammo: number, health: number, speed: number): void {
    const w = this.app.screen.width;
    const h = this.app.screen.height;

    this.speedText.position.set(w - 180, h - 40);
    this.speedText.text = `SPEED: ${speed >= SHIP_MAX_SPEED ? 'MAX' : Math.round(speed)}`;

    this.ammoText.position.set(30, h - 90);
    this.ammoText.text = ammo === 0 ? '[R] RELOAD' : `AMMO`;

    this.ammoBarFill.clear().rect(30, h - 70, (ammo / DEFAULT_AMMO) * 175, 30).fill(0xffffff);
    this.ammoBarOutline
      .clear()
      .rect(30, h - 70, 175, 30)
      .stroke({ width: 3, color: 0xffffff });

    this.healthBarFill
      .clear()
      .rect(30, h - 120, (health / DEFAULT_HEALTH) * 175, 10)
      .fill(0xffffff);
    this.healthBarOutline
      .clear()
      .rect(30, h - 120, 175, 10)
      .stroke({ width: 2, color: 0xffffff });
  }
}
