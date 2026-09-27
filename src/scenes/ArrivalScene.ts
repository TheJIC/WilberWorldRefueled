import Phaser from 'phaser';
import { applyMute } from '../audio/sfx';
import { DEPTH, H, STORAGE_KEYS, W } from '../config';
import { Effects } from '../gfx/Effects';
import { isTouchDevice } from '../systems/Controls';
import { Lighting } from '../systems/Lighting';
import { hideFinale, revealFinale, showFinaleText, zoomFinale } from '../ui/finale';
import { PIXEL_FONT } from '../ui/pixelFont';
import type { RunSummary } from './PlayScene';
import { readNumber, writeStorage } from '../storage';
import { fitCamera } from '../viewport';

const ROAD_Y = 390;
const CAR_LANE_Y = 368;
const WIN_MUSIC_VOLUME = 0.25;

// Scenery placed around the arrival sign: [texture, x, y].
const SCENERY: Array<[string, number, number]> = [
  ['prop_blossom', 30, 60],
  ['prop_oak', 300, 40],
  ['prop_blossom', 330, 130],
  ['prop_tulips', 250, 170],
  ['prop_sunflowers', 214, 236],
  ['prop_flowers', 20, 240],
  ['prop_bush', 300, 240],
  ['prop_fountain', 250, 100],
  ['prop_oak', 40, 560],
  ['prop_blossom', 130, 590],
  ['prop_hedge', 230, 560],
  ['prop_tulips', 320, 600],
  ['prop_bench', 300, 530],
  ['prop_flowers', 180, 530]
];

/**
 * The pixel remake of the original win screen: pull up to the Wilber World
 * sign, honk, peel out, then reveal the original hand-painted town banner.
 */
export class ArrivalScene extends Phaser.Scene {
  private summary!: RunSummary;
  private canLeave = false;

  constructor() {
    super('Arrival');
  }

  init(data: Partial<RunSummary>): void {
    this.summary = { score: 0, coins: 0, nearMisses: 0, bestCombo: 0, smashed: 0, ...data };
    this.canLeave = false;
  }

  create(): void {
    fitCamera(this);
    applyMute(this.game);
    this.cameras.main.fadeIn(1500, 0, 0, 0);

    const best = readNumber(STORAGE_KEYS.best, 0);
    const newBest = this.summary.score > best;
    if (newBest) {
      writeStorage(STORAGE_KEYS.best, String(this.summary.score));
    }

    this.add.tileSprite(0, 0, W, H, 'ground_parkway').setOrigin(0).setDepth(DEPTH.ground);
    this.add.image(W / 2, ROAD_Y, 'road_horizontal').setDepth(DEPTH.ground + 1);

    for (const [key, x, y] of SCENERY) {
      this.add.image(x, y, key).setDepth(DEPTH.props);
    }

    this.buildSign();
    new Lighting(this, 'golden');
    const effects = new Effects(this);

    const music = this.sound.add('music_win', { loop: true, volume: WIN_MUSIC_VOLUME });
    music.play();

    const car = this.add.image(W + 60, CAR_LANE_Y, 'car_hero').setAngle(-90).setDepth(DEPTH.player);
    const shadow = this.add.image(W + 63, CAR_LANE_Y + 4, 'car_hero').setAngle(-90).setTint(0x000000).setAlpha(0.35).setDepth(DEPTH.player - 1);
    const moveCar = (x: number, duration: number, ease: string) => {
      this.tweens.add({ targets: car, x, duration, ease });
      this.tweens.add({ targets: shadow, x: x + 3, duration, ease });
    };

    // Timeline mirrors the original WinScene beats.
    this.time.delayedCall(1500, () => moveCar(200, 2000, 'Quad.easeOut'));

    this.time.delayedCall(3700, () => {
      this.sound.play('sfx_horn', { volume: 0.3 });
      effects.floatText(car.x, car.y - 26, 'BEEP BEEP!', 0xffd23f);
      this.fireworks(effects);
    });

    this.time.delayedCall(5600, () => {
      this.sound.play('sfx_accelerate', { volume: 0.3 });
      moveCar(-120, 700, 'Quad.easeIn');
    });

    this.time.delayedCall(6300, () => this.cameras.main.fadeOut(1500, 0, 0, 0));

    this.time.delayedCall(7900, () => revealFinale());
    this.time.delayedCall(9900, () => zoomFinale());
    this.time.delayedCall(14200, () => {
      showFinaleText({
        ...this.summary,
        best: Math.max(best, this.summary.score),
        newBest,
        prompt: isTouchDevice() ? 'TAP TO PLAY AGAIN' : 'PRESS SPACE TO PLAY AGAIN'
      });
      this.canLeave = true;
    });

    const leave = () => {
      if (!this.canLeave) return;
      this.canLeave = false;
      this.tweens.add({ targets: music, volume: 0, duration: 900 });
      hideFinale();
      this.time.delayedCall(1000, () => {
        music.stop();
        this.scene.start('Title');
      });
    };

    const keyboard = this.input.keyboard!;
    keyboard.addCapture('SPACE');
    keyboard.on('keydown-SPACE', leave);
    keyboard.on('keydown-ENTER', leave);
    this.input.on(Phaser.Input.Events.POINTER_UP, leave);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      hideFinale();
      this.sound.stopAll();
    });
  }

  private buildSign(): void {
    const scale = 2;
    const x = 104;
    const y = 214;
    this.add.image(x + 6, y + 44, 'fx_softglow').setTint(0x000000).setAlpha(0.3).setScale(3, 0.6).setDepth(DEPTH.props - 1);
    const sign = this.add.image(x, y, 'sign_welcome').setScale(scale).setDepth(DEPTH.props);

    // Blank face measured at x 17..66, y 11..35 of the 84x56 sprite.
    const faceX = sign.x + (41.5 - 42) * scale;
    const faceTop = sign.y + (11 - 28) * scale;
    const ink = 0x2b3350;

    this.add.bitmapText(faceX, faceTop + 5, PIXEL_FONT, 'WELCOME TO', 8)
      .setOrigin(0.5, 0)
      .setScale(0.75)
      .setTint(ink)
      .setDepth(DEPTH.props + 1);
    this.add.bitmapText(faceX, faceTop + 15, PIXEL_FONT, 'WILBER', 16)
      .setOrigin(0.5, 0)
      .setTint(ink)
      .setDepth(DEPTH.props + 1);
    this.add.bitmapText(faceX, faceTop + 32, PIXEL_FONT, 'WORLD', 16)
      .setOrigin(0.5, 0)
      .setTint(ink)
      .setDepth(DEPTH.props + 1);
  }

  private fireworks(effects: Effects): void {
    const colors = [0xffd23f, 0xff5a7a, 0x5ce1ff, 0x6ee06a, 0xb266ff];
    for (let i = 0; i < 8; i++) {
      this.time.delayedCall(i * 240, () => {
        const x = Phaser.Math.Between(50, W - 50);
        const y = Phaser.Math.Between(50, 250);
        effects.firework(x, y, colors[i % colors.length]);
      });
    }
  }
}
