import Phaser from 'phaser';
import { DEPTH, FUEL, H, PLAYER, W } from '../config';
import { STAGES, TOTAL_DISTANCE } from '../data';
import { PIXEL_FONT } from './pixelFont';

const BAR_H = 22;
const TRACK_X = 7;
const TRACK_TOP = 44;
const TRACK_BOTTOM = H - 60;
const FUEL_X = 272;
const FUEL_W = 56;

export class Hud {
  private readonly hearts: Phaser.GameObjects.Image[] = [];
  private readonly score: Phaser.GameObjects.BitmapText;
  private readonly combo: Phaser.GameObjects.BitmapText;
  private readonly fuelFill: Phaser.GameObjects.Rectangle;
  private readonly fuelFrame: Phaser.GameObjects.Rectangle;
  private readonly fuelIcon: Phaser.GameObjects.Image;
  private readonly lowFuel: Phaser.GameObjects.BitmapText;
  private readonly carMark: Phaser.GameObjects.Image;
  private readonly powerIcon: Phaser.GameObjects.Image;
  private readonly powerBar: Phaser.GameObjects.Rectangle;
  private readonly powerBack: Phaser.GameObjects.Rectangle;
  readonly pauseButton: Phaser.GameObjects.Zone;
  private readonly root: Phaser.GameObjects.GameObject[] = [];
  private shownScore = 0;

  constructor(private readonly scene: Phaser.Scene) {
    const add = <T extends Phaser.GameObjects.GameObject>(obj: T): T => {
      this.root.push(obj);
      return obj;
    };

    add(scene.add.rectangle(0, 0, W, BAR_H, 0x07080f, 0.72).setOrigin(0).setDepth(DEPTH.hud));
    add(scene.add.rectangle(0, BAR_H, W, 1, 0xf2efe4, 0.25).setOrigin(0).setDepth(DEPTH.hud));

    for (let i = 0; i < PLAYER.maxLives; i++) {
      this.hearts.push(add(scene.add.image(10 + i * 10, 11, 'icon_heart').setDepth(DEPTH.hud + 1)));
    }

    this.score = add(scene.add.bitmapText(W / 2, 3, PIXEL_FONT, '000000', 16)
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.hud + 1)
      .setDropShadow(1, 1, 0x000000, 1));

    this.combo = add(scene.add.bitmapText(W / 2, BAR_H + 5, PIXEL_FONT, '', 8)
      .setOrigin(0.5, 0)
      .setTint(0xffd23f)
      .setDepth(DEPTH.hud + 1)
      .setDropShadow(1, 1, 0x000000, 1));

    this.fuelIcon = add(scene.add.image(FUEL_X - 8, 11, 'icon_pump').setDepth(DEPTH.hud + 1));
    this.fuelFrame = add(scene.add.rectangle(FUEL_X, 7, FUEL_W, 8, 0x1b1d28).setOrigin(0).setStrokeStyle(1, 0xf2efe4).setDepth(DEPTH.hud + 1));
    this.fuelFill = add(scene.add.rectangle(FUEL_X + 1, 8, FUEL_W - 2, 6, 0x6ee06a).setOrigin(0).setDepth(DEPTH.hud + 2));
    this.lowFuel = add(scene.add.bitmapText(FUEL_X + FUEL_W / 2, BAR_H + 5, PIXEL_FONT, 'LOW FUEL', 8)
      .setOrigin(0.5, 0)
      .setTint(0xff3b3b)
      .setDepth(DEPTH.hud + 1)
      .setDropShadow(1, 1, 0x000000, 1)
      .setVisible(false));

    add(scene.add.image(W - 10, 11, 'icon_pause').setDepth(DEPTH.hud + 1).setAlpha(0.9));
    this.pauseButton = add(scene.add.zone(W - 12, 11, 26, 24).setDepth(DEPTH.hud + 2).setInteractive({ useHandCursor: true }));

    // Progress track to Wilber World along the left edge.
    add(scene.add.rectangle(TRACK_X, TRACK_TOP, 4, TRACK_BOTTOM - TRACK_TOP, 0x07080f, 0.6).setOrigin(0.5, 0).setDepth(DEPTH.hud));
    add(scene.add.rectangle(TRACK_X, TRACK_TOP, 2, TRACK_BOTTOM - TRACK_TOP, 0xf2efe4, 0.5).setOrigin(0.5, 0).setDepth(DEPTH.hud));
    let acc = 0;
    for (let i = 0; i < STAGES.length - 1; i++) {
      acc += STAGES[i].length;
      const y = this.trackY(acc / TOTAL_DISTANCE);
      add(scene.add.rectangle(TRACK_X, y, 6, 2, 0xffd23f).setDepth(DEPTH.hud + 1));
    }
    add(scene.add.image(TRACK_X + 2, TRACK_TOP - 5, 'icon_flag').setDepth(DEPTH.hud + 1));
    this.carMark = add(scene.add.image(TRACK_X, TRACK_BOTTOM, 'icon_carmark').setDepth(DEPTH.hud + 2));

    this.powerBack = add(scene.add.rectangle(W - 40, BAR_H + 22, 36, 4, 0x1b1d28).setOrigin(0, 0.5).setStrokeStyle(1, 0xf2efe4, 0.6).setDepth(DEPTH.hud).setVisible(false));
    this.powerBar = add(scene.add.rectangle(W - 40, BAR_H + 22, 36, 4, 0x5ce1ff).setOrigin(0, 0.5).setDepth(DEPTH.hud + 1).setVisible(false));
    this.powerIcon = add(scene.add.image(W - 50, BAR_H + 22, 'item_shield').setScale(0.75).setDepth(DEPTH.hud + 1).setVisible(false));
  }

  private trackY(progress: number): number {
    return Phaser.Math.Linear(TRACK_BOTTOM, TRACK_TOP, Phaser.Math.Clamp(progress, 0, 1));
  }

  update(time: number, state: { score: number; lives: number; fuel: number; combo: number; progress: number; power: { kind: 'shield' | 'nitro'; remaining: number; total: number } | null }): void {
    // Roll the score counter up smoothly.
    const diff = state.score - this.shownScore;
    this.shownScore += diff > 0 ? Math.max(1, Math.ceil(diff * 0.2)) : diff;
    this.score.setText(String(Math.floor(this.shownScore)).padStart(6, '0'));

    this.hearts.forEach((heart, i) => {
      if (i < state.lives) {
        heart.setTexture('icon_heart').setVisible(true);
      } else if (i < PLAYER.startLives) {
        heart.setTexture('icon_heart_empty').setVisible(true);
      } else {
        heart.setVisible(false);
      }
    });

    const ratio = Phaser.Math.Clamp(state.fuel / FUEL.max, 0, 1);
    const low = state.fuel < FUEL.lowThreshold;
    const blink = low && Math.floor(time / 220) % 2 === 0;
    this.fuelFill.width = Math.max(0, (FUEL_W - 2) * ratio);
    this.fuelFill.fillColor = ratio > 0.5 ? 0x6ee06a : ratio > 0.25 ? 0xffd23f : 0xff3b3b;
    this.fuelFrame.setStrokeStyle(1, blink ? 0xff3b3b : 0xf2efe4);
    this.fuelIcon.setTint(blink ? 0xff8080 : 0xffffff);
    this.lowFuel.setVisible(blink);

    if (state.combo >= 2) {
      this.combo.setText(`COMBO x${state.combo}`).setVisible(true);
      this.combo.setScale(1 + Math.max(0, Math.sin(time / 80)) * 0.08);
    } else {
      this.combo.setVisible(false);
    }

    this.carMark.y = Math.round(this.trackY(state.progress));

    const power = state.power;
    this.powerBack.setVisible(!!power);
    this.powerBar.setVisible(!!power);
    this.powerIcon.setVisible(!!power);
    if (power) {
      this.powerIcon.setTexture(power.kind === 'shield' ? 'item_shield' : 'item_nitro');
      this.powerBar.width = 36 * Phaser.Math.Clamp(power.remaining / power.total, 0, 1);
      this.powerBar.fillColor = power.kind === 'shield' ? 0x5ce1ff : 0xffa22a;
    }
  }

  /** Slide a stage title card across the screen. */
  banner(title: string, subtitle: string, color = 0xffd23f): void {
    const scene = this.scene;
    const y = 200;
    const band = scene.add.rectangle(W / 2, y, W, 54, 0x07080f, 0.8).setDepth(DEPTH.popup).setScale(1, 0);
    const edgeTop = scene.add.rectangle(W / 2, y - 27, W, 2, color).setDepth(DEPTH.popup + 1).setScale(0, 1);
    const edgeBottom = scene.add.rectangle(W / 2, y + 26, W, 2, color).setDepth(DEPTH.popup + 1).setScale(0, 1);
    const titleText = scene.add.bitmapText(W + 200, y - 14, PIXEL_FONT, title, 16)
      .setOrigin(0.5, 0)
      .setTint(color)
      .setDepth(DEPTH.popup + 2)
      .setDropShadow(2, 2, 0x000000, 1);
    const subText = scene.add.bitmapText(-200, y + 8, PIXEL_FONT, subtitle, 8)
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.popup + 2)
      .setDropShadow(1, 1, 0x000000, 1);

    if (titleText.width > W - 16) {
      titleText.setFontSize(8);
      titleText.y = y - 10;
    }

    const parts = [band, edgeTop, edgeBottom, titleText, subText];
    scene.tweens.add({ targets: band, scaleY: 1, duration: 180, ease: 'Quad.easeOut' });
    scene.tweens.add({ targets: [edgeTop, edgeBottom], scaleX: 1, duration: 260, ease: 'Quad.easeOut' });
    scene.tweens.add({ targets: titleText, x: W / 2, duration: 420, ease: 'Back.easeOut', delay: 80 });
    scene.tweens.add({ targets: subText, x: W / 2, duration: 420, ease: 'Back.easeOut', delay: 160 });

    scene.time.delayedCall(2300, () => {
      scene.tweens.add({ targets: titleText, x: -220, duration: 300, ease: 'Quad.easeIn' });
      scene.tweens.add({ targets: subText, x: W + 220, duration: 300, ease: 'Quad.easeIn' });
      scene.tweens.add({
        targets: [band, edgeTop, edgeBottom],
        alpha: 0,
        duration: 350,
        delay: 120,
        onComplete: () => parts.forEach((p) => p.destroy())
      });
    });
  }

  /** Big centred callout ("3", "GO!", "OUT OF GAS!"). */
  shout(text: string, color = 0xffffff, size = 32, hold = 550): void {
    const label = this.scene.add.bitmapText(W / 2, 290, PIXEL_FONT, text, size)
      .setOrigin(0.5)
      .setTint(color)
      .setDepth(DEPTH.popup + 3)
      .setDropShadow(3, 3, 0x000000, 1)
      .setScale(1.8)
      .setAlpha(0);

    if (label.width > W - 20) {
      label.setFontSize(Math.floor(size / 2));
    }

    this.scene.tweens.add({ targets: label, scale: 1, alpha: 1, duration: 160, ease: 'Back.easeOut' });
    this.scene.tweens.add({
      targets: label,
      alpha: 0,
      scale: 0.8,
      delay: hold,
      duration: 200,
      onComplete: () => label.destroy()
    });
  }

  setVisible(visible: boolean): void {
    for (const obj of this.root) {
      (obj as unknown as Phaser.GameObjects.Components.Visible).setVisible(visible);
    }
    if (visible) {
      this.lowFuel.setVisible(false);
      this.combo.setVisible(false);
      this.powerBack.setVisible(false);
      this.powerBar.setVisible(false);
      this.powerIcon.setVisible(false);
    }
  }
}
