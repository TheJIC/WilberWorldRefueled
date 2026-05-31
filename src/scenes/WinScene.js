import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_MUSIC_VOLUME, GAME_WIDTH, PIXEL_FONT } from '../constants.js';

export class WinScene extends Phaser.Scene {
  constructor() {
    super('WinScene');
  }

  create() {
    this.add.image(0, 0, 'win').setOrigin(0);
    const black = this.add.image(0, 0, 'black').setOrigin(0);
    const wilberWorldPhoto = this.createWilberWorldPhoto();
    const thanksText = this.createThanksText();
    this.winMusic = this.sound.add('winSound', {
      loop: true,
      volume: GAME_MUSIC_VOLUME / 2
    });
    this.winMusic.play();

    this.events.once('shutdown', () => {
      this.winMusic?.stop();
    });

    this.tweens.add({
      targets: black,
      alpha: 0,
      duration: 2000,
      ease: 'Linear'
    });

    const player = this.add.sprite(2000, 915, 'cherryred')
      .setAngle(-90)
      .setScale(0.7);

    this.time.delayedCall(2000, () => {
      this.tweens.add({
        targets: player,
        x: 400,
        duration: 2000,
        ease: 'Quad.easeOut'
      });
    });

    this.time.delayedCall(6000, () => {
      this.tweens.add({
        targets: player,
        x: -200,
        duration: 500,
        ease: 'Quad.easeIn'
      });
    });

    this.time.delayedCall(6500, () => {
      this.tweens.add({
        targets: black,
        alpha: 1,
        duration: 2000,
        ease: 'Linear'
      });
    });

    this.time.delayedCall(8500, () => {
      this.tweens.add({
        targets: wilberWorldPhoto,
        alpha: 1,
        duration: 2000,
        ease: 'Linear'
      });

      this.time.delayedCall(2000, () => {
        this.tweens.add({
          targets: wilberWorldPhoto,
          scaleX: wilberWorldPhoto.baseScale,
          scaleY: wilberWorldPhoto.baseScale,
          duration: 4000,
          ease: 'Quad.easeOut',
          onUpdate: () => this.positionWilberWorldPhoto(wilberWorldPhoto),
          onComplete: () => {
            this.tweens.add({
              targets: thanksText,
              alpha: 1,
              duration: 800,
              ease: 'Linear'
            });
          }
        });
      });
    });

    this.time.delayedCall(20000, () => {
      this.tweens.add({
        targets: wilberWorldPhoto,
        alpha: 0,
        duration: 2000,
        ease: 'Linear'
      });

      this.tweens.add({
        targets: thanksText,
        alpha: 0,
        duration: 2000,
        ease: 'Linear'
      });

      this.tweens.add({
        targets: this.winMusic,
        volume: 0,
        duration: 2000,
        ease: 'Linear'
      });
    });

    this.time.delayedCall(22500, () => this.scene.start('TitleScene'));
  }

  createWilberWorldPhoto() {
    const photo = this.add.image(0, 0, 'wilberWorldPhoto')
      .setOrigin(0)
      .setAlpha(0)
      .setDepth(20);
    photo.baseScale = Math.max(GAME_WIDTH / photo.width, GAME_HEIGHT / photo.height);

    photo.setScale(photo.baseScale * 1.65);
    this.positionWilberWorldPhoto(photo);

    return photo;
  }

  createThanksText() {
    return this.add.text(GAME_WIDTH / 2 + 60, 320, 'Thanks for playing!', {
      fontFamily: PIXEL_FONT,
      fontSize: '100px',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: GAME_WIDTH - 100 }
    })
      .setOrigin(0.5, 0)
      .setFixedSize(GAME_WIDTH, 0)
      .setAlpha(0)
      .setDepth(30);
  }

  positionWilberWorldPhoto(photo) {
    photo.setPosition(
      (GAME_WIDTH - photo.displayWidth) / 2,
      GAME_HEIGHT - photo.displayHeight
    );
  }
}
