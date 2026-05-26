import Phaser from 'phaser';

export class InfoScene extends Phaser.Scene {
  constructor() {
    super('InfoScene');
  }

  create() {
    const wilberInfo = this.add.image(0, -2880, 'wilberinfo').setOrigin(0).setScale(1.5);

    this.time.delayedCall(1500, () => {
      this.tweens.add({
        targets: wilberInfo,
        x: -1800,
        duration: 5000,
        ease: 'Linear'
      });
    });

    this.time.delayedCall(8000, () => {
      this.tweens.add({
        targets: wilberInfo,
        x: -900,
        duration: 3500,
        ease: 'Linear'
      });
    });

    this.time.delayedCall(13000, () => {
      this.tweens.add({
        targets: wilberInfo,
        scaleX: 1,
        scaleY: 1,
        x: -400,
        y: -1275,
        duration: 5000,
        ease: 'Linear'
      });
    });
  }
}
