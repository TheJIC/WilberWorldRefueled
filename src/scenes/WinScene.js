import Phaser from 'phaser';
import { GAME_MUSIC_VOLUME } from '../constants.js';

export class WinScene extends Phaser.Scene {
  constructor() {
    super('WinScene');
  }

  create() {
    this.add.image(0, 0, 'win').setOrigin(0);
    const black = this.add.image(0, 0, 'black').setOrigin(0);
    this.winMusic = this.sound.add('winSound', { volume: GAME_MUSIC_VOLUME / 2 });
    this.winMusic.play();

    this.events.once('shutdown', () => {
      this.winMusic?.stop();
    });

    this.tweens.add({
      targets: black,
      alpha: 0,
      duration: 3000,
      ease: 'Linear'
    });

    const player = this.add.sprite(2000, 915, 'cherryred')
      .setAngle(-90)
      .setScale(0.7);

    this.time.delayedCall(3000, () => {
      this.tweens.add({
        targets: player,
        x: 400,
        duration: 3000,
        ease: 'Quad.easeOut'
      });
    });

    this.time.delayedCall(8000, () => {
      this.tweens.add({
        targets: player,
        x: -200,
        duration: 500,
        ease: 'Quad.easeIn'
      });
    });

    this.time.delayedCall(9000, () => {
      this.tweens.add({
        targets: black,
        alpha: 1,
        duration: 2000,
        ease: 'Linear'
      });
    });

    this.time.delayedCall(11250, () => this.scene.start('TitleScene'));
  }
}
