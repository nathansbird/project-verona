import { Application, Container } from 'pixi.js';
import { applyBloom } from './Filters.js';

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
  applyBloom(worldContainer);

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
