import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_MUSIC_VOLUME, GAME_WIDTH, PIXEL_FONT } from '../constants.js';

const WIN_MUSIC_VOLUME = GAME_MUSIC_VOLUME / 2;
const SCENE_FADE_IN_DURATION = 2000;
const PLAYER_ENTER_DELAY = 2000;
const PLAYER_ENTER_DURATION = 2000;
const PLAYER_EXIT_DELAY = 6000;
const PLAYER_EXIT_DURATION = 500;
const FIRST_SCREEN_FADE_OUT_DELAY = 6500;
const FIRST_SCREEN_FADE_OUT_DURATION = 2000;
const BANNER_FADE_IN_DELAY = 8500;
const BANNER_FADE_IN_DURATION = 2000;
const BANNER_ZOOM_DELAY = 2000;
const BANNER_ZOOM_DURATION = 4000;
const BANNER_START_SCALE_MULTIPLIER = 1.65;
const THANKS_TEXT_FADE_DURATION = 800;
const END_FADE_OUT_DELAY = 20000;
const END_FADE_OUT_DURATION = 2000;
const TITLE_RETURN_DELAY = 22500;
const THANKS_TEXT_X_OFFSET = 60;
const THANKS_TEXT_Y = 320;
const THANKS_TEXT_SIZE = '100px';

// The win scene is a timed epilogue: arrive at the sign, fade into the final
// banner, zoom out, show the thanks message, then loop back to the title.
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
      volume: WIN_MUSIC_VOLUME
    });
    this.winMusic.play();

    this.events.once('shutdown', () => {
      this.winMusic?.stop();
    });

    // Fade up from the black transition created at the end of PlayScene.
    this.tweens.add({
      targets: black,
      alpha: 0,
      duration: SCENE_FADE_IN_DURATION,
      ease: 'Linear'
    });

    const player = this.add.sprite(2000, 915, 'cherryred')
      .setAngle(-90)
      .setScale(0.7);

    this.time.delayedCall(PLAYER_ENTER_DELAY, () => {
      this.tweens.add({
        targets: player,
        x: 400,
        duration: PLAYER_ENTER_DURATION,
        ease: 'Quad.easeOut'
      });
    });

    this.time.delayedCall(PLAYER_EXIT_DELAY, () => {
      this.tweens.add({
        targets: player,
        x: -200,
        duration: PLAYER_EXIT_DURATION,
        ease: 'Quad.easeIn'
      });
    });

    this.time.delayedCall(FIRST_SCREEN_FADE_OUT_DELAY, () => {
      this.tweens.add({
        targets: black,
        alpha: 1,
        duration: FIRST_SCREEN_FADE_OUT_DURATION,
        ease: 'Linear'
      });
    });

    this.time.delayedCall(BANNER_FADE_IN_DELAY, () => {
      // The banner starts zoomed in and bottom-anchored, then eases out to show
      // the full final image.
      this.tweens.add({
        targets: wilberWorldPhoto,
        alpha: 1,
        duration: BANNER_FADE_IN_DURATION,
        ease: 'Linear'
      });

      this.time.delayedCall(BANNER_ZOOM_DELAY, () => {
        this.tweens.add({
          targets: wilberWorldPhoto,
          scaleX: wilberWorldPhoto.baseScale,
          scaleY: wilberWorldPhoto.baseScale,
          duration: BANNER_ZOOM_DURATION,
          ease: 'Quad.easeOut',
          onUpdate: () => this.positionWilberWorldPhoto(wilberWorldPhoto),
          onComplete: () => {
            this.tweens.add({
              targets: thanksText,
              alpha: 1,
              duration: THANKS_TEXT_FADE_DURATION,
              ease: 'Linear'
            });
          }
        });
      });
    });

    this.time.delayedCall(END_FADE_OUT_DELAY, () => {
      this.tweens.add({
        targets: wilberWorldPhoto,
        alpha: 0,
        duration: END_FADE_OUT_DURATION,
        ease: 'Linear'
      });

      this.tweens.add({
        targets: thanksText,
        alpha: 0,
        duration: END_FADE_OUT_DURATION,
        ease: 'Linear'
      });

      this.tweens.add({
        targets: this.winMusic,
        volume: 0,
        duration: END_FADE_OUT_DURATION,
        ease: 'Linear'
      });
    });

    this.time.delayedCall(TITLE_RETURN_DELAY, () => this.scene.start('TitleScene'));
  }

  createWilberWorldPhoto() {
    const photo = this.add.image(0, 0, 'wilberWorldPhoto')
      .setOrigin(0)
      .setAlpha(0)
      .setDepth(20);
    photo.baseScale = Math.max(GAME_WIDTH / photo.width, GAME_HEIGHT / photo.height);

    photo.setScale(photo.baseScale * BANNER_START_SCALE_MULTIPLIER);
    this.positionWilberWorldPhoto(photo);

    return photo;
  }

  createThanksText() {
    return this.add.text(GAME_WIDTH / 2 + THANKS_TEXT_X_OFFSET, THANKS_TEXT_Y, 'Thanks for playing!', {
      fontFamily: PIXEL_FONT,
      fontSize: THANKS_TEXT_SIZE,
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
    // Recalculate position during the zoom so the bottom edge stays pinned.
    photo.setPosition(
      (GAME_WIDTH - photo.displayWidth) / 2,
      GAME_HEIGHT - photo.displayHeight
    );
  }
}
