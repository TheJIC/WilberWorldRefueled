import Phaser from 'phaser';
import '@fontsource/press-start-2p';
import './styles.css';
import { ArrivalScene } from './scenes/ArrivalScene';
import { PlayScene } from './scenes/PlayScene';
import { PreloadScene } from './scenes/PreloadScene';
import { TitleScene } from './scenes/TitleScene';
import { waitForFontFace } from './ui/pixelFont';
import { devicePixelRatio, installWindowResize } from './viewport';

async function start(): Promise<void> {
  // The bitmap font is rasterised from Press Start 2P, so it must be ready first.
  await waitForFontFace();

  const dpr = devicePixelRatio();
  const game = new Phaser.Game({
    type: Phaser.WEBGL,
    parent: 'game',
    backgroundColor: '#0b0d16',
    render: {
      // Crisp pixels with smooth edges at any (non-integer) zoom level.
      smoothPixelArt: true
    },
    scale: {
      mode: Phaser.Scale.NONE,
      width: Math.round(window.innerWidth * dpr),
      height: Math.round(window.innerHeight * dpr),
      zoom: 1 / dpr
    },
    input: {
      activePointers: 3,
      gamepad: true
    },
    scene: [PreloadScene, TitleScene, PlayScene, ArrivalScene]
  });

  installWindowResize(game);

  if (import.meta.env.DEV) {
    (window as unknown as { __game: Phaser.Game }).__game = game;
  }
}

start();
