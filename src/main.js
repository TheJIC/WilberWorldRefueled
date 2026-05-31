import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, PIXEL_FONT } from './constants.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { PlayScene } from './scenes/PlayScene.js';
import { WinScene } from './scenes/WinScene.js';

window.__wilberSpaceAction = null;

function isSpaceKey(event) {
  return event.code === 'Space' || event.key === ' ' || event.key === 'Spacebar';
}

function installSpaceKeyCapture() {
  const handleSpace = (event) => {
    if (!isSpaceKey(event)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (event.type === 'keydown' && !event.repeat) {
      window.__wilberSpaceAction?.();
    }
  };

  window.addEventListener('keydown', handleSpace, true);
  window.addEventListener('keyup', handleSpace, true);
}

function focusGameSurface() {
  window.focus();

  const gameElement = document.getElementById('game');
  gameElement?.focus({ preventScroll: true });

  requestAnimationFrame(() => {
    const canvas = document.querySelector('canvas');
    if (canvas instanceof HTMLCanvasElement) {
      canvas.tabIndex = 0;
      canvas.focus({ preventScroll: true });
    }
  });
}

async function waitForFonts() {
  if (!document.fonts?.load) {
    return;
  }

  await Promise.race([
    document.fonts.load(`16px ${PIXEL_FONT}`),
    new Promise((resolve) => setTimeout(resolve, 2500))
  ]);
}

installSpaceKeyCapture();
focusGameSurface();
await waitForFonts();

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#050505',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 200 }
    }
  },
  input: {
    gamepad: true
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [PreloadScene, TitleScene, PlayScene, WinScene]
});

setTimeout(focusGameSurface, 0);
setTimeout(focusGameSurface, 500);
