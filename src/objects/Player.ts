import Phaser from 'phaser';
import { DEPTH, PLAYER, ROAD_LEFT, ROAD_RIGHT } from '../config';

export interface DriveInput {
  /** Keyboard / gamepad steering, -1..1 on each axis. */
  x: number;
  y: number;
  /** Relative touch drag since last frame, in world pixels. */
  dragX: number;
  dragY: number;
}

const TRACK_MIN_X = ROAD_LEFT + 11;
const TRACK_MAX_X = ROAD_RIGHT - 11;

export class Player {
  readonly sprite: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly cone: Phaser.GameObjects.Image;
  private readonly tailLights: Phaser.GameObjects.Image[];
  private readonly bubble: Phaser.GameObjects.Image;
  private readonly flame: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly exhaust: Phaser.GameObjects.Particles.ParticleEmitter;

  x: number;
  y: number;
  vx = 0;
  readonly hw = PLAYER.hitboxW / 2;
  readonly hh = PLAYER.hitboxH / 2;

  controls = false;
  invulnerableUntil = 0;
  shieldUntil = 0;
  nitroUntil = 0;
  private spinUntil = 0;
  private spinDir = 1;
  private spinDrift = 0;
  private scrapeCooldown = 0;
  /** Set when the car grinds the guardrail this frame. */
  scraping = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.x = x;
    this.y = y;

    this.shadow = scene.add.image(x + 3, y + 4, 'car_hero')
      .setTint(0x000000)
      .setAlpha(0.35)
      .setDepth(DEPTH.player - 1);

    this.cone = scene.add.image(x, y, 'fx_cone')
      .setOrigin(0.5, 1)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.lights)
      .setAlpha(0);

    this.tailLights = [-7, 7].map(() => scene.add.image(x, y, 'fx_glow')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xff2a2a)
      .setScale(0.35)
      .setDepth(DEPTH.lights)
      .setAlpha(0));

    this.exhaust = scene.add.particles(0, 0, 'dot', {
      speedY: { min: 30, max: 60 },
      speedX: { min: -8, max: 8 },
      lifespan: 420,
      scale: { start: 1, end: 2.5 },
      alpha: { start: 0.35, end: 0 },
      tint: [0x8a8f9c, 0xb5bac6],
      frequency: 70
    }).setDepth(DEPTH.player - 2);

    this.flame = scene.add.particles(0, 0, 'dot', {
      speedY: { min: 120, max: 220 },
      speedX: { min: -14, max: 14 },
      lifespan: { min: 120, max: 260 },
      scale: { start: 2.2, end: 0.4 },
      alpha: { start: 1, end: 0 },
      tint: [0xffffff, 0xfff08a, 0xffa22a, 0x5ce1ff],
      frequency: 12,
      emitting: false
    }).setDepth(DEPTH.player - 1);

    this.sprite = scene.add.image(x, y, 'car_hero').setDepth(DEPTH.player);

    this.bubble = scene.add.image(x, y, 'fx_shield')
      .setDepth(DEPTH.player + 1)
      .setVisible(false);
  }

  isShielded(time: number): boolean {
    return time < this.shieldUntil;
  }

  isNitro(time: number): boolean {
    return time < this.nitroUntil;
  }

  /** True while crashes shouldn't hurt (post-hit grace, shield or nitro). */
  isProtected(time: number): boolean {
    return time < this.invulnerableUntil || this.isShielded(time) || this.isNitro(time);
  }

  isSpinning(time: number): boolean {
    return time < this.spinUntil;
  }

  spinOut(time: number): void {
    this.spinUntil = time + 850;
    this.spinDir = Math.random() < 0.5 ? -1 : 1;
    this.spinDrift = Phaser.Math.Between(-70, 70);
  }

  update(time: number, dt: number, input: DriveInput, nightAmount: number): void {
    const spinning = this.isSpinning(time);
    this.scraping = false;

    if (this.controls && !spinning) {
      const targetVx = input.x * PLAYER.steerSpeed;
      const accel = PLAYER.steerAccel * dt;
      this.vx += Phaser.Math.Clamp(targetVx - this.vx, -accel, accel);
      this.x += this.vx * dt + input.dragX;

      const vy = input.y < 0 ? input.y * PLAYER.upSpeed : input.y * PLAYER.downSpeed;
      this.y += vy * dt + input.dragY;
    } else if (spinning) {
      this.vx = this.spinDrift;
      this.x += this.spinDrift * dt;
    } else {
      this.vx *= 0.85;
    }

    // Grinding the guardrail: clamp and let the scene throw sparks.
    if (this.x < TRACK_MIN_X || this.x > TRACK_MAX_X) {
      this.scraping = this.controls;
      this.x = Phaser.Math.Clamp(this.x, TRACK_MIN_X, TRACK_MAX_X);
      this.vx = 0;
    }

    if (this.controls) {
      this.y = Phaser.Math.Clamp(this.y, PLAYER.minY, PLAYER.maxY);
    }

    this.scrapeCooldown = Math.max(0, this.scrapeCooldown - dt);

    let angle = (this.vx / PLAYER.steerSpeed) * PLAYER.maxTilt;
    if (spinning) {
      const t = 1 - (this.spinUntil - time) / 850;
      angle = this.spinDir * Phaser.Math.Easing.Cubic.Out(t) * 720;
    }

    this.sprite.setPosition(this.x, this.y).setAngle(angle);
    this.shadow.setPosition(this.x + 3, this.y + 4).setAngle(angle);

    // Post-hit flicker.
    const flicker = time < this.invulnerableUntil && Math.floor(time / 70) % 2 === 0;
    this.sprite.setAlpha(flicker ? 0.35 : 1);

    const rad = Phaser.Math.DegToRad(angle);
    const sin = Math.sin(rad);
    const cos = Math.cos(rad);
    const rearX = this.x - sin * 23;
    const rearY = this.y + cos * 23;

    this.exhaust.setPosition(rearX + 5, rearY);
    this.flame.setPosition(rearX, rearY);
    this.flame.emitting = this.isNitro(time);

    this.cone.setPosition(this.x + sin * 20, this.y - cos * 20).setAngle(angle).setAlpha(nightAmount * 0.7);
    this.tailLights.forEach((light, i) => {
      const side = i === 0 ? -7 : 7;
      light.setPosition(rearX + cos * side, rearY + sin * side).setAlpha(nightAmount * 0.9);
    });

    const shielded = this.isShielded(time);
    const blinkOut = shielded && this.shieldUntil - time < 1500 && Math.floor(time / 100) % 2 === 0;
    this.bubble.setVisible(shielded && !blinkOut).setPosition(this.x, this.y).setAngle(angle);
    this.bubble.setScale(1 + Math.sin(time / 90) * 0.03);
  }

  canScrapeSpark(): boolean {
    if (this.scrapeCooldown > 0) {
      return false;
    }
    this.scrapeCooldown = 0.06;
    return true;
  }

  setVisible(visible: boolean): void {
    this.sprite.setVisible(visible);
    this.shadow.setVisible(visible);
    this.exhaust.emitting = visible;
    this.tailLights.forEach((light) => light.setVisible(visible));
    this.cone.setVisible(visible);
    if (!visible) {
      this.bubble.setVisible(false);
      this.flame.emitting = false;
    }
  }
}
