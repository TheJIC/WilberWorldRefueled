import Phaser from 'phaser';
import { DEPTH, H, W } from '../config';
import { Lighting as LightingKind } from '../data';

const PRESETS: Record<LightingKind, { color: number; night: number }> = {
  day: { color: 0xffffff, night: 0 },
  sunset: { color: 0xffbf86, night: 0.3 },
  night: { color: 0x4a5598, night: 1 },
  golden: { color: 0xffe9bf, night: 0.12 }
};

/**
 * Time of day as a full-screen MULTIPLY tint. Additive light sprites (lamps,
 * headlights, sirens) sit above it and fade in with `nightAmount`.
 */
export class Lighting {
  private readonly overlay: Phaser.GameObjects.Rectangle;
  private from = new Phaser.Display.Color(255, 255, 255);
  private to = new Phaser.Display.Color(255, 255, 255);
  private fromNight = 0;
  private toNight = 0;
  private t = 1;
  private duration = 1;
  nightAmount = 0;

  constructor(scene: Phaser.Scene, initial: LightingKind) {
    this.overlay = scene.add.rectangle(0, 0, W, H, 0xffffff, 1)
      .setOrigin(0)
      .setDepth(DEPTH.tint)
      .setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.set(initial, 0);
  }

  set(kind: LightingKind, seconds: number): void {
    const preset = PRESETS[kind];
    this.from = Phaser.Display.Color.IntegerToColor(this.overlay.fillColor);
    this.to = Phaser.Display.Color.IntegerToColor(preset.color);
    this.fromNight = this.nightAmount;
    this.toNight = preset.night;
    this.duration = Math.max(seconds, 0.0001);
    this.t = seconds <= 0 ? this.duration : 0;
    this.apply();
  }

  update(dt: number): void {
    if (this.t >= this.duration) {
      return;
    }
    this.t = Math.min(this.duration, this.t + dt);
    this.apply();
  }

  private apply(): void {
    const k = this.t / this.duration;
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(this.from, this.to, 100, k * 100);
    this.overlay.fillColor = Phaser.Display.Color.GetColor(c.r, c.g, c.b);
    this.overlay.setVisible(this.overlay.fillColor !== 0xffffff);
    this.nightAmount = Phaser.Math.Linear(this.fromNight, this.toNight, k);
  }
}
