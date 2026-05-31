import Phaser from 'phaser';
import { artPath, ENEMY_KEYS, soundPath } from '../constants.js';

const IMAGE_ASSETS = [
  ['highway3', 'road3.png'],
  ['wall', 'wall.png'],
  ['black', 'black.png'],
  ['win', 'win.png'],
  ['wilberWorldPhoto', 'banner.jpg'],
  ['cherryred', 'cherryred.png']
];

// Keeping asset keys in one place makes the scene code read like game logic,
// while this preload scene stays responsible for file paths.
const AUDIO_ASSETS = [
  ['gameMusic', 'game.mp3'],
  ['hornSound', 'horn.mp3'],
  ['explosionSound', 'explosion.mp3'],
  ['deadSound', 'dead.mp3'],
  ['winSound', 'win.mp3'],
  ['accelerateSound', 'accelerate.mp3']
];

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload() {
    IMAGE_ASSETS.forEach(([key, file]) => {
      this.load.image(key, artPath(file));
    });

    ENEMY_KEYS.forEach((key) => {
      this.load.image(key, artPath(`${key}.png`));
    });

    this.load.spritesheet('explosion', artPath('explosion.png'), {
      frameWidth: 96,
      frameHeight: 96
    });
    this.load.spritesheet('spaceBar', artPath('space-bar.png'), {
      frameWidth: 200,
      frameHeight: 48
    });

    AUDIO_ASSETS.forEach(([key, file]) => {
      this.load.audio(key, soundPath(file));
    });
  }

  create() {
    this.anims.create({
      key: 'boom',
      frames: this.anims.generateFrameNumbers('explosion'),
      frameRate: 30,
      hideOnComplete: true
    });

    this.anims.create({
      key: 'press',
      frames: this.anims.generateFrameNumbers('spaceBar'),
      frameRate: 2,
      repeat: -1
    });

    this.scene.start('TitleScene');
  }
}
