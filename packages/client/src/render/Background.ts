import { Application, Container, Graphics, Sprite, FillGradient, TilingSprite } from 'pixi.js';

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
