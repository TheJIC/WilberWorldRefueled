import Phaser from 'phaser';
import { artPath, ENEMY_KEYS, soundPath } from '../constants.js';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload() {
    this.load.image('highway', artPath('road.png'));
    this.load.image('highway2', artPath('road2.png'));
    this.load.image('highway3', artPath('road3.png'));
    this.load.image('wall', artPath('wall.png'));
    this.load.image('wall2', artPath('wall2.png'));
    this.load.image('black', artPath('black.png'));
    this.load.image('win', artPath('win.png'));
    this.load.image('wilberinfo', artPath('wilberworldinfo.jpg'));
    this.load.image('cherryred', artPath('cherryred.png'));
    this.load.image('power', artPath('placeholder.png'));

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

    this.load.audio('gameMusic', soundPath('game.mp3'));
    this.load.audio('hornSound', soundPath('horn.mp3'));
    this.load.audio('explosionSound', soundPath('explosion.mp3'));
    this.load.audio('deadSound', soundPath('dead.mp3'));
    this.load.audio('winSound', soundPath('win.mp3'));
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
