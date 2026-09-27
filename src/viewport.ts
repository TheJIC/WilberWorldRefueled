import Phaser from 'phaser';
import { H, W } from './config';

// The canvas always fills the window at device resolution. Each scene's main
// camera is letterboxed to a 9:16 viewport and zoomed so the 360x640 logical
// world fills it. With smoothPixelArt this keeps pixels crisp at any scale.

export function devicePixelRatio(): number {
  return Math.min(window.devicePixelRatio || 1, 3);
}

export interface ViewportRect {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number;
}

export function computeViewport(canvasWidth: number, canvasHeight: number): ViewportRect {
  const zoom = Math.min(canvasWidth / W, canvasHeight / H);
  const width = Math.round(W * zoom);
  const height = Math.round(H * zoom);

  return {
    x: Math.round((canvasWidth - width) / 2),
    y: Math.round((canvasHeight - height) / 2),
    width,
    height,
    zoom
  };
}

export function installWindowResize(game: Phaser.Game): void {
  const resize = () => {
    const dpr = devicePixelRatio();
    game.scale.resize(Math.round(window.innerWidth * dpr), Math.round(window.innerHeight * dpr));
    game.scale.setZoom(1 / dpr);
  };

  window.addEventListener('resize', resize);
  window.visualViewport?.addEventListener('resize', resize);
}

function positionFinale(rect: ViewportRect): void {
  const finale = document.getElementById('finale');

  if (!finale) {
    return;
  }

  const dpr = devicePixelRatio();
  finale.style.left = `${rect.x / dpr}px`;
  finale.style.top = `${rect.y / dpr}px`;
  finale.style.width = `${rect.width / dpr}px`;
  finale.style.height = `${rect.height / dpr}px`;
  finale.style.setProperty('--u', `${rect.width / dpr / W}px`);
}

/** Letterbox + zoom the scene's main camera, and keep it fitted on resize. */
export function fitCamera(scene: Phaser.Scene, background = '#0b0d16'): void {
  const camera = scene.cameras.main;
  camera.setBackgroundColor(background);

  const apply = () => {
    const rect = computeViewport(scene.scale.width, scene.scale.height);
    camera.setViewport(rect.x, rect.y, rect.width, rect.height);
    camera.setZoom(rect.zoom);
    camera.centerOn(W / 2, H / 2);
    positionFinale(rect);
  };

  apply();
  scene.scale.on(Phaser.Scale.Events.RESIZE, apply);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.scale.off(Phaser.Scale.Events.RESIZE, apply);
  });
}
