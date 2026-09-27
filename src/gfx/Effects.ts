import Phaser from 'phaser';
import { DEPTH } from '../config';
import { PIXEL_FONT } from '../ui/pixelFont';

// One place for particles, explosions and floating score text so gameplay
// code can just say "boom here".

export class Effects {
  private readonly sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly fire: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly smoke: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly debris: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly glitter: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly fireworkEmitter: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(private readonly scene: Phaser.Scene) {
    this.fireworkEmitter = scene.add.particles(0, 0, 'dot', {
      speed: { min: 40, max: 150 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 700, max: 1200 },
      gravityY: 70,
      scale: { start: 1.5, end: 0.5 },
      alpha: { start: 1, end: 0 },
      emitting: false
    }).setDepth(DEPTH.fx + 3);

    this.sparks = scene.add.particles(0, 0, 'px', {
      speed: { min: 60, max: 180 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 180, max: 420 },
      scale: { start: 2, end: 1 },
      tint: [0xffffff, 0xffe066, 0xffb030],
      emitting: false
    }).setDepth(DEPTH.fx);

    this.fire = scene.add.particles(0, 0, 'dot', {
      speed: { min: 20, max: 140 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 250, max: 650 },
      scale: { start: 3, end: 0.5 },
      alpha: { start: 1, end: 0 },
      tint: [0xfff3a0, 0xffc233, 0xff7a1a, 0xe63b1a],
      emitting: false
    }).setDepth(DEPTH.fx + 1);

    this.smoke = scene.add.particles(0, 0, 'dot', {
      speed: { min: 10, max: 45 },
      angle: { min: 200, max: 340 },
      lifespan: { min: 500, max: 1100 },
      scale: { start: 2.5, end: 5 },
      alpha: { start: 0.55, end: 0 },
      tint: [0x3a3d48, 0x55596a, 0x6d7285],
      emitting: false
    }).setDepth(DEPTH.fx);

    this.debris = scene.add.particles(0, 0, 'dot', {
      speed: { min: 80, max: 220 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 300, max: 700 },
      scale: { start: 1.5, end: 1 },
      rotate: { min: 0, max: 360 },
      tint: [0x1b1d28, 0x9aa3b5, 0xd7dde6],
      emitting: false
    }).setDepth(DEPTH.fx);

    this.glitter = scene.add.particles(0, 0, 'px', {
      speed: { min: 30, max: 90 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 250, max: 500 },
      scale: { start: 2, end: 1 },
      alpha: { start: 1, end: 0 },
      emitting: false
    }).setDepth(DEPTH.fx + 2);
  }

  explosion(x: number, y: number, big = false): void {
    const scale = big ? 1.6 : 1;
    this.fire.explode(Math.round(28 * scale), x, y);
    this.smoke.explode(Math.round(14 * scale), x, y);
    this.debris.explode(Math.round(12 * scale), x, y);
    this.sparks.explode(Math.round(10 * scale), x, y);

    const flash = this.scene.add.image(x, y, 'fx_softglow')
      .setDepth(DEPTH.lights)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xffc060)
      .setScale(0.6 * scale);

    this.scene.tweens.add({
      targets: flash,
      scale: 2.2 * scale,
      alpha: 0,
      duration: 380,
      ease: 'Quad.easeOut',
      onComplete: () => flash.destroy()
    });

    const ring = this.scene.add.image(x, y, 'fx_shield')
      .setDepth(DEPTH.fx + 3)
      .setTint(0xffe6a0)
      .setAlpha(0.8)
      .setScale(0.3 * scale);

    this.scene.tweens.add({
      targets: ring,
      scale: 1.6 * scale,
      alpha: 0,
      duration: 300,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy()
    });
  }

  sparksAt(x: number, y: number, count = 6): void {
    this.sparks.explode(count, x, y);
  }

  puff(x: number, y: number, count = 1): void {
    this.smoke.explode(count, x, y);
  }

  glitterAt(x: number, y: number, color: number, count = 10): void {
    this.glitter.setParticleTint(color);
    this.glitter.explode(count, x, y);
  }

  firework(x: number, y: number, color: number): void {
    this.fireworkEmitter.setParticleTint(color);
    this.fireworkEmitter.explode(48, x, y);
    this.sparks.explode(10, x, y);

    const flash = this.scene.add.image(x, y, 'fx_softglow')
      .setDepth(DEPTH.lights)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(color)
      .setScale(0.5);
    this.scene.tweens.add({ targets: flash, scale: 2, alpha: 0, duration: 450, onComplete: () => flash.destroy() });
  }

  floatText(x: number, y: number, text: string, color: number, size = 8, rise = 26): void {
    const label = this.scene.add.bitmapText(Math.round(x), Math.round(y), PIXEL_FONT, text, size)
      .setOrigin(0.5)
      .setTint(color)
      .setDepth(DEPTH.popup)
      .setDropShadow(1, 1, 0x000000, 1);

    this.scene.tweens.add({
      targets: label,
      y: y - rise,
      duration: 750,
      ease: 'Quad.easeOut'
    });

    this.scene.tweens.add({
      targets: label,
      alpha: 0,
      delay: 450,
      duration: 350,
      onComplete: () => label.destroy()
    });
  }

  shake(intensity = 0.006, duration = 180): void {
    this.scene.cameras.main.shake(duration, intensity);
  }

  flash(color = 0xffffff, duration = 120): void {
    const c = Phaser.Display.Color.IntegerToColor(color);
    this.scene.cameras.main.flash(duration, c.red, c.green, c.blue);
  }
}
