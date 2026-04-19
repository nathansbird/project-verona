import { Application, Container } from 'pixi.js';
import { applyBloom, applyCRT } from './Filters.js';

export interface GlideStage {
  app: Application;
  bgLayer: Container;
  worldContainer: Container;
  gridLayer: Container;
  structuresLayer: Container;
  glowLayer: Container;
  shipsLayer: Container;
  projectilesLayer: Container;
  particlesLayer: Container;
  uiContainer: Container;
}

export async function createStage(): Promise<GlideStage> {
  const app = new Application();
  await app.init({
    resizeTo: window,
    antialias: true,
    background: '#000000',
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });
  document.getElementById('app')!.appendChild(app.canvas);

  const bgLayer = new Container();
  const worldContainer = new Container();
  const gridLayer = new Container();
  const structuresLayer = new Container();
  const glowLayer = new Container();
  const projectilesLayer = new Container();
  const shipsLayer = new Container();
  const particlesLayer = new Container();
  const uiContainer = new Container();

  glowLayer.addChild(projectilesLayer, shipsLayer, particlesLayer);
  worldContainer.addChild(gridLayer, structuresLayer, glowLayer);
  app.stage.addChild(bgLayer, worldContainer, uiContainer);

  applyBloom(glowLayer);
  applyCRT(app.stage);

  return {
    app,
    bgLayer,
    worldContainer,
    gridLayer,
    structuresLayer,
    glowLayer,
    shipsLayer,
    projectilesLayer,
    particlesLayer,
    uiContainer,
  };
}
