import Phaser from 'phaser';
import { applyMute, isMuted, setMuted, Sfx } from '../audio/sfx';
import { DEPTH, H, STORAGE_KEYS, W } from '../config';
import { STAGES } from '../data';
import { isTouchDevice } from '../systems/Controls';
import { Road } from '../systems/Road';
import { Traffic } from '../systems/Traffic';
import { PIXEL_FONT } from '../ui/pixelFont';
import { outlinedText } from '../ui/widgets';
import { readNumber } from '../storage';
import { fitCamera } from '../viewport';

const ATTRACT_SCROLL = 160;

export class TitleScene extends Phaser.Scene {
  private road!: Road;
  private traffic!: Traffic;
  private starting = false;
  private muteIcon!: Phaser.GameObjects.Image;

  constructor() {
    super('Title');
  }

  create(): void {
    fitCamera(this);
    applyMute(this.game);
    this.starting = false;
    this.cameras.main.fadeIn(400, 0, 0, 0);

    // Attract mode: the road and traffic keep rolling behind the logo, like the original title.
    this.road = new Road(this, 'meadow');
    this.traffic = new Traffic(this, { onNearMiss: () => {}, onCrash: () => {} });
    this.traffic.enabled = true;
    this.traffic.lanes = [0, 3];

    this.add.rectangle(0, 0, W, H, 0x07080f, 0.45).setOrigin(0).setDepth(DEPTH.hud - 1);

    this.buildLogo();
    this.buildPrompt();
    this.buildFooter();

    const keyboard = this.input.keyboard!;
    keyboard.addCapture('SPACE');
    keyboard.on('keydown-SPACE', () => this.startGame());
    keyboard.on('keydown-ENTER', () => this.startGame());
    keyboard.on('keydown-M', () => this.toggleMute());
    this.input.on(Phaser.Input.Events.POINTER_UP, (_pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length === 0) {
        this.startGame();
      }
    });
  }

  private buildLogo(): void {
    const glow = this.add.image(W / 2, 150, 'fx_softglow')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xff8a1f)
      .setScale(6, 3)
      .setAlpha(0.35)
      .setDepth(DEPTH.hud);

    this.tweens.add({ targets: glow, alpha: 0.2, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const wilber = outlinedText(this, W / 2, 96, 'WILBER', 32, { top: 0xfff4d6, bottom: 0xffb03b, shadow: 0x000000, thickness: 2 }).setDepth(DEPTH.hud + 1);
    const world = outlinedText(this, W / 2, 136, 'WORLD', 32, { top: 0xfff4d6, bottom: 0xffb03b, shadow: 0x000000, thickness: 2 }).setDepth(DEPTH.hud + 1);
    const refueled = outlinedText(this, W / 2, 180, 'REFUELED', 16, { top: 0xffe45c, bottom: 0xff3b1f, shadow: 0x000000, thickness: 2 }).setDepth(DEPTH.hud + 1);

    // Drop-in entrance for the logo.
    [wilber, world].forEach((part, i) => {
      part.y -= 200;
      this.tweens.add({ targets: part, y: part.y + 200, duration: 700, delay: 150 + i * 120, ease: 'Bounce.easeOut' });
    });
    refueled.setScale(0);
    this.tweens.add({
      targets: refueled,
      scale: 1,
      duration: 500,
      delay: 900,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({ targets: refueled, scale: 1.06, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    });

    // The hero car, blasting nitro under the logo.
    const hero = this.add.image(W / 2, 282, 'car_hero').setScale(2).setDepth(DEPTH.hud + 1);
    this.add.particles(W / 2, 282 + 46, 'dot', {
      speedY: { min: 80, max: 160 },
      speedX: { min: -16, max: 16 },
      lifespan: { min: 150, max: 320 },
      scale: { start: 3, end: 0.5 },
      alpha: { start: 1, end: 0 },
      tint: [0xffffff, 0xfff08a, 0xffa22a, 0x5ce1ff],
      frequency: 14
    }).setDepth(DEPTH.hud);
    this.tweens.add({ targets: hero, y: 276, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private buildPrompt(): void {
    const touch = isTouchDevice();
    const prompt = this.add.bitmapText(W / 2, 392, PIXEL_FONT, touch ? 'TAP TO START' : 'PRESS SPACE TO START', 8)
      .setOrigin(0.5)
      .setTint(0xffffff)
      .setDepth(DEPTH.hud + 1)
      .setDropShadow(1, 1, 0x000000, 1);
    this.tweens.add({ targets: prompt, alpha: 0.15, duration: 520, yoyo: true, repeat: -1 });

    const best = readNumber(STORAGE_KEYS.best, 0);
    this.add.bitmapText(W / 2, 414, PIXEL_FONT, `BEST ${String(best).padStart(6, '0')}`, 8)
      .setOrigin(0.5)
      .setTint(0xffd23f)
      .setDepth(DEPTH.hud + 1)
      .setDropShadow(1, 1, 0x000000, 1);

    const lines = touch
      ? ['DRAG ANYWHERE TO STEER', 'TAP HONK TO CLEAR THE LANE', '', 'GRAB FUEL - DODGE TRAFFIC', `${STAGES.length} STAGES TO WILBER WORLD`]
      : ['ARROWS / WASD  STEER', 'SPACE  HONK    P  PAUSE', '', 'GRAB FUEL - DODGE TRAFFIC', `${STAGES.length} STAGES TO WILBER WORLD`];

    this.add.rectangle(W / 2, 486, 250, 78, 0x07080f, 0.7).setStrokeStyle(1, 0xf2efe4, 0.4).setDepth(DEPTH.hud);
    this.add.bitmapText(W / 2, 486, PIXEL_FONT, lines.join('\n'), 8)
      .setOrigin(0.5)
      .setCenterAlign()
      .setLineSpacing(4)
      .setTint(0xd7dde6)
      .setDepth(DEPTH.hud + 1);
  }

  private buildFooter(): void {
    this.add.bitmapText(W / 2, H - 14, PIXEL_FONT, 'A REMAKE OF THE ORIGINAL WILBER WORLD', 8)
      .setOrigin(0.5)
      .setTint(0x7a8294)
      .setScale(0.75)
      .setDepth(DEPTH.hud + 1);

    this.muteIcon = this.add.image(W - 16, H - 38, isMuted() ? 'icon_sound_off' : 'icon_sound_on')
      .setScale(2)
      .setDepth(DEPTH.hud + 1)
      .setInteractive({ useHandCursor: true });
    this.muteIcon.on(Phaser.Input.Events.POINTER_UP, () => this.toggleMute());
  }

  private toggleMute(): void {
    setMuted(this.game, !isMuted());
    this.muteIcon.setTexture(isMuted() ? 'icon_sound_off' : 'icon_sound_on');
    Sfx.select(this);
  }

  private startGame(): void {
    if (this.starting) {
      return;
    }

    this.starting = true;
    Sfx.select(this);
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Play');
    });
  }

  update(time: number, delta: number): void {
    const dt = Math.min(delta, 50) / 1000;
    this.road.update(ATTRACT_SCROLL * dt);
    this.traffic.update(dt, time, ATTRACT_SCROLL, STAGES[0], 0.2, null, [], 0);
  }
}
