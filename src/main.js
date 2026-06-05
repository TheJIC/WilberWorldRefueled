import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, PIXEL_FONT } from './constants.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { PlayScene } from './scenes/PlayScene.js';
import { WinScene } from './scenes/WinScene.js';
import { usesTouchControls } from './inputMode.js';

window.__wilberSpaceAction = null;
window.__wilberTouchAction = null;
window.__wilberTouchControlAction = null;

// Capture Space at the window level so it never scrolls or refreshes the page.
// Scenes replace this callback with their current Space-bar behavior.
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

function installTouchGestureGuards() {
  if (!usesTouchControls()) {
    return;
  }

  const handleTouch = (event) => {
    event.preventDefault();
    window.__wilberTouchControlAction?.(event);

    if (event.type === 'touchstart') {
      window.__wilberTouchAction?.();
    }
  };
  const options = {
    capture: true,
    passive: false
  };

  window.addEventListener('touchstart', handleTouch, options);
  window.addEventListener('touchmove', handleTouch, options);
  window.addEventListener('touchend', handleTouch, options);
  window.addEventListener('gesturestart', handleTouch, options);
}

function focusGameSurface() {
  window.focus();

  // Keeping focus on the Phaser canvas makes keyboard input work after refresh.
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

async function startGame() {
  installSpaceKeyCapture();
  installTouchGestureGuards();
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
      activePointers: 4
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [PreloadScene, TitleScene, PlayScene, WinScene]
  });

  setTimeout(focusGameSurface, 0);
  setTimeout(focusGameSurface, 500);
}

startGame();
