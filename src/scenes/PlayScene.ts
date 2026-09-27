import Phaser from 'phaser';
import { applyMute, isMuted, setMuted, Sfx } from '../audio/sfx';
import {
  COMBO_WINDOW_MS,
  DEPTH,
  FUEL,
  H,
  HONK_COOLDOWN_MS,
  LANE_X,
  PLAYER,
  STORAGE_KEYS,
  W
} from '../config';
import { STAGES, StageDef, TOTAL_DISTANCE } from '../data';
import { Effects } from '../gfx/Effects';
import { Player } from '../objects/Player';
import { Controls } from '../systems/Controls';
import { Items, PickupKind } from '../systems/Items';
import { Lighting } from '../systems/Lighting';
import { Road } from '../systems/Road';
import { Traffic, TrafficCar } from '../systems/Traffic';
import { Hud } from '../ui/Hud';
import { PIXEL_FONT } from '../ui/pixelFont';
import { textButton } from '../ui/widgets';
import { readNumber, writeStorage } from '../storage';
import { fitCamera } from '../viewport';

type Phase = 'intro' | 'drive' | 'transition' | 'finale' | 'over';

export interface RunSummary {
  score: number;
  coins: number;
  nearMisses: number;
  bestCombo: number;
  smashed: number;
}

// Timings of the countdown cues in game.mp3, preserved from the original game.
const COUNTDOWN = [
  { text: '3', at: 2775 },
  { text: '2', at: 3925 },
  { text: '1', at: 5025 },
  { text: 'GO!', at: 6025 }
];

const MUSIC_VOLUME = 0.45;
const SHIELD_MS = 6500;
const NITRO_MS = 3800;
const NITRO_BOOST = 1.6;

export class PlayScene extends Phaser.Scene {
  private road!: Road;
  private lighting!: Lighting;
  private effects!: Effects;
  private player!: Player;
  private traffic!: Traffic;
  private items!: Items;
  private hud!: Hud;
  private controls!: Controls;
  private music!: Phaser.Sound.BaseSound;

  private phase: Phase = 'intro';
  private stageIndex = 0;
  private stageDistance = 0;
  private totalDistance = 0;
  private score = 0;
  private lives = PLAYER.startLives;
  private fuel = FUEL.max;
  private combo = 0;
  private comboUntil = 0;
  private summary: RunSummary = { score: 0, coins: 0, nearMisses: 0, bestCombo: 0, smashed: 0 };
  private hitsThisStage = 0;
  private honkReadyAt = 0;
  private lowFuelBeepAt = 0;
  private scroll = 0;
  private targetScroll = 0;
  private sputterUntil = 0;
  private finaleScroll: number | null = null;
  private paused = false;
  private pauseLayer: Phaser.GameObjects.Container | null = null;
  private clock = 0;

  constructor() {
    super('Play');
  }

  private get stage(): StageDef {
    return STAGES[this.stageIndex];
  }

  create(): void {
    fitCamera(this);
    applyMute(this.game);
    this.resetState();

    const stage = this.stage;
    this.road = new Road(this, stage.theme);
    this.lighting = new Lighting(this, stage.lighting);
    this.effects = new Effects(this);
    this.player = new Player(this, LANE_X[2], H + 60);
    this.traffic = new Traffic(this, {
      onNearMiss: (car) => this.onNearMiss(car),
      onCrash: (car) => this.onCrash(car)
    });
    this.items = new Items(this, {
      onPickup: (kind, x, y) => this.onPickup(kind, x, y),
      onOil: (x, y) => this.onOil(x, y),
      onConeHit: (item, protectedHit) => this.onConeHit(item, protectedHit)
    });
    this.hud = new Hud(this);
    this.hud.pauseButton.on(Phaser.Input.Events.POINTER_UP, () => this.togglePause());
    this.controls = new Controls(this, {
      honk: () => this.honk(),
      pause: () => this.togglePause(),
      mute: () => this.toggleMute()
    });

    this.music = this.sound.add('music_game', { loop: true, volume: MUSIC_VOLUME });
    this.music.play();

    this.runIntro();

    this.game.events.on(Phaser.Core.Events.BLUR, this.onBlur, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.BLUR, this.onBlur, this);
      this.controls.destroy();
      this.sound.stopAll();
    });
  }

  private resetState(): void {
    this.phase = 'intro';
    this.stageIndex = 0;
    this.stageDistance = 0;
    this.totalDistance = 0;
    this.score = 0;
    this.lives = PLAYER.startLives;
    this.fuel = FUEL.max;
    this.combo = 0;
    this.comboUntil = 0;
    this.summary = { score: 0, coins: 0, nearMisses: 0, bestCombo: 0, smashed: 0 };
    this.hitsThisStage = 0;
    this.honkReadyAt = 0;
    this.lowFuelBeepAt = 0;
    this.scroll = 120;
    this.targetScroll = 120;
    this.sputterUntil = 0;
    this.finaleScroll = null;
    this.paused = false;
    this.pauseLayer = null;
    this.clock = 0;
  }

  // ---------------------------------------------------------------------------
  // Flow

  private runIntro(): void {
    this.player.controls = false;
    this.controls.enabled = false;

    // Slide up from below the screen, like the original.
    this.tweens.add({ targets: this.player, y: PLAYER.startY, duration: 2000, ease: 'Quad.easeOut' });

    this.road.spawnGantry('WILBER WORLD', 'STRAIGHT AHEAD');
    this.time.delayedCall(700, () => this.hud.banner(`STAGE 1`, this.stage.name));

    for (const step of COUNTDOWN) {
      this.time.delayedCall(step.at, () => {
        if (this.phase !== 'intro') return;
        this.hud.shout(step.text, step.text === 'GO!' ? 0x6ee06a : 0xffffff, 32, step.text === 'GO!' ? 500 : 420);
        if (step.text === 'GO!') this.startDriving();
      });
    }
  }

  private startDriving(): void {
    this.phase = 'drive';
    this.player.controls = true;
    this.controls.enabled = true;
    this.traffic.enabled = true;
    this.items.enabled = true;
  }

  private completeStage(): void {
    this.phase = 'transition';
    this.traffic.enabled = false;
    this.items.enabled = false;
    this.traffic.clearPending();

    const stageNumber = this.stageIndex + 1;
    const stageBonus = 1000 * stageNumber;
    const cleanBonus = this.hitsThisStage === 0 ? 1500 : 0;
    const fuelBonus = Math.floor(this.fuel) * 5;
    this.score += stageBonus + cleanBonus + fuelBonus;
    this.fuel = Math.min(FUEL.max, this.fuel + FUEL.checkpointAmount);

    Sfx.stageClear(this);
    this.showStageClear(stageNumber, stageBonus, cleanBonus, fuelBonus);

    if (this.stageIndex >= STAGES.length - 1) {
      this.time.delayedCall(1600, () => this.runFinale());
      return;
    }

    this.stageIndex += 1;
    this.stageDistance = 0;
    this.hitsThisStage = 0;
    const next = this.stage;

    this.road.changeTheme(next.theme);
    this.lighting.set(next.lighting, 5);
    this.time.delayedCall(900, () => this.road.spawnGantry(`STAGE ${this.stageIndex + 1}`, next.name));
    this.time.delayedCall(3300, () => {
      if (this.phase !== 'transition') return;
      this.hud.banner(`STAGE ${this.stageIndex + 1}`, next.name);
      this.time.delayedCall(900, () => {
        if (this.phase !== 'transition') return;
        this.hud.shout(next.subtitle.toUpperCase(), 0xffd23f, 8, 1300);
        this.phase = 'drive';
        this.traffic.enabled = true;
        this.items.enabled = true;
      });
    });
  }

  private showStageClear(stageNumber: number, stageBonus: number, cleanBonus: number, fuelBonus: number): void {
    const lines = [
      `STAGE ${stageNumber} BONUS  +${stageBonus}`,
      cleanBonus ? `NO SCRATCH BONUS +${cleanBonus}` : 'NO SCRATCH BONUS  --',
      `FUEL BONUS  +${fuelBonus}`,
      `FUEL REFILL  +${FUEL.checkpointAmount}%`
    ];
    const y = 250;
    const panel = this.add.rectangle(W / 2, y + 20, 290, 100, 0x07080f, 0.85).setStrokeStyle(2, 0xffd23f).setDepth(DEPTH.popup);
    const title = this.add.bitmapText(W / 2, y - 18, PIXEL_FONT, 'STAGE CLEAR!', 16)
      .setOrigin(0.5, 0)
      .setTint(0xffd23f, 0xffd23f, 0xff8a1f, 0xff8a1f)
      .setDepth(DEPTH.popup + 1)
      .setDropShadow(2, 2, 0x000000, 1);
    const body = this.add.bitmapText(W / 2, y + 8, PIXEL_FONT, lines.join('\n'), 8)
      .setOrigin(0.5, 0)
      .setCenterAlign()
      .setLineSpacing(5)
      .setDepth(DEPTH.popup + 1);

    const parts = [panel, title, body];
    parts.forEach((p) => p.setAlpha(0));
    this.tweens.add({ targets: parts, alpha: 1, duration: 200 });
    this.tweens.add({
      targets: parts,
      alpha: 0,
      delay: 2600,
      duration: 300,
      onComplete: () => parts.forEach((p) => p.destroy())
    });
  }

  private runFinale(): void {
    this.phase = 'finale';
    this.player.controls = false;
    this.controls.enabled = false;
    this.controls.setTouchUiVisible(false);
    this.items.enabled = false;
    this.traffic.enabled = false;
    this.finaleScroll = this.scroll;

    this.road.spawnGantry('WILBER WORLD', 'NEXT EXIT');

    // Nod to the original ending: the remaining cars go up in a chain of explosions.
    const cars = this.traffic.cars.filter((c) => c.y > -20 && c.y < H + 20).sort((a, b) => b.y - a.y);
    cars.forEach((car, i) => {
      this.time.delayedCall(i * 220, () => {
        if (car.dead) return;
        this.effects.explosion(car.x, car.y);
        this.sound.play('sfx_explosion', { volume: 0.2 });
        car.destroy();
      });
    });

    this.tweens.add({ targets: this.player, x: W / 2, duration: 900, ease: 'Sine.easeInOut' });
    // Wait for the stage-clear card to fade before the callout.
    this.time.delayedCall(1400, () => this.hud.shout('WILBER WORLD AHEAD!', 0xffd23f, 16, 1400));

    this.time.delayedCall(1800, () => {
      this.tweens.add({ targets: this.music, volume: 0, duration: 800, onComplete: () => this.music.stop() });
      // Ease back, then launch off the top of the screen with the rev sound.
      this.tweens.add({ targets: this.player, y: H - 40, duration: 750, ease: 'Quad.easeIn' });
    });

    this.time.delayedCall(3200, () => {
      this.sound.play('sfx_accelerate', { volume: MUSIC_VOLUME });
      this.player.nitroUntil = this.clock + 2000;
      this.tweens.add({ targets: this.player, y: -120, duration: 1200, ease: 'Quad.easeIn' });
      this.tweens.add({ targets: this, finaleScroll: 900, duration: 1200, ease: 'Quad.easeIn' });
    });

    this.time.delayedCall(4600, () => {
      this.hud.setVisible(false);
      this.cameras.main.fadeOut(1800, 0, 0, 0);
    });

    this.time.delayedCall(6600, () => {
      this.summary.score = Math.floor(this.score);
      this.scene.start('Arrival', { ...this.summary });
    });
  }

  private gameOver(): void {
    if (this.phase === 'over') return;

    this.phase = 'over';
    this.player.controls = false;
    this.controls.enabled = false;
    this.controls.setTouchUiVisible(false);
    this.traffic.enabled = false;
    this.items.enabled = false;
    this.traffic.clearPending();

    this.effects.explosion(this.player.x, this.player.y, true);
    this.effects.shake(0.02, 400);
    this.effects.flash(0xff4020, 250);
    this.player.setVisible(false);
    this.music.stop();
    this.sound.play('sfx_dead', { volume: 0.35 });
    this.tweens.add({ targets: this, targetScroll: 0, scroll: 0, duration: 1600, ease: 'Quad.easeOut' });

    const finalScore = Math.floor(this.score);
    const best = readNumber(STORAGE_KEYS.best, 0);
    const newBest = finalScore > best;
    if (newBest) {
      writeStorage(STORAGE_KEYS.best, String(finalScore));
    }

    // Matches the tuned cue in dead.mp3.
    this.time.delayedCall(2000, () => this.showGameOver(finalScore, Math.max(best, finalScore), newBest));
  }

  private showGameOver(score: number, best: number, newBest: boolean): void {
    const layer = this.add.container(0, 0).setDepth(DEPTH.overlay);
    layer.add(this.add.rectangle(0, 0, W, H, 0x000000, 0.55).setOrigin(0));
    layer.add(this.add.rectangle(W / 2, 306, 280, 204, 0x0b0d16, 0.95).setStrokeStyle(2, 0xff3b3b));
    layer.add(this.add.bitmapText(W / 2, 236, PIXEL_FONT, 'GAME OVER', 24)
      .setOrigin(0.5)
      .setTint(0xff6a5a, 0xff6a5a, 0xc0182a, 0xc0182a)
      .setDropShadow(2, 2, 0x000000, 1));

    const stageLine = `REACHED STAGE ${this.stageIndex + 1} OF ${STAGES.length}`;
    layer.add(this.add.bitmapText(W / 2, 266, PIXEL_FONT, stageLine, 8).setOrigin(0.5).setTint(0xd7dde6));
    layer.add(this.add.bitmapText(W / 2, 290, PIXEL_FONT, `SCORE ${String(score).padStart(6, '0')}`, 16).setOrigin(0.5));
    const bestText = this.add.bitmapText(W / 2, 314, PIXEL_FONT, newBest ? 'NEW BEST!' : `BEST ${String(best).padStart(6, '0')}`, 8)
      .setOrigin(0.5)
      .setTint(0xffd23f);
    layer.add(bestText);
    if (newBest) {
      this.tweens.add({ targets: bestText, scale: 1.25, duration: 300, yoyo: true, repeat: -1 });
    }

    const retry = textButton(this, W / 2, 348, 'RETRY', 150, () => this.scene.restart());
    const quit = textButton(this, W / 2, 376, 'TITLE', 150, () => this.scene.start('Title'));
    retry.setSelected(true);
    layer.add([retry.container, quit.container]);

    const keyboard = this.input.keyboard!;
    keyboard.once('keydown-SPACE', () => this.scene.restart());
    keyboard.once('keydown-R', () => this.scene.restart());
    keyboard.once('keydown-ENTER', () => this.scene.restart());
    keyboard.once('keydown-ESC', () => this.scene.start('Title'));

    layer.setAlpha(0);
    this.tweens.add({ targets: layer, alpha: 1, duration: 300 });
  }

  // ---------------------------------------------------------------------------
  // Events

  private onNearMiss(car: TrafficCar): void {
    if (this.phase !== 'drive' && this.phase !== 'transition') return;

    const now = this.clock;
    this.combo = now < this.comboUntil ? this.combo + 1 : 1;
    this.comboUntil = now + COMBO_WINDOW_MS;
    this.summary.nearMisses += 1;
    this.summary.bestCombo = Math.max(this.summary.bestCombo, this.combo);

    const points = 50 * this.combo;
    this.score += points;
    Sfx.nearMiss(this, this.combo);

    const midX = (car.x + this.player.x) / 2;
    this.effects.floatText(midX, this.player.y - 26, this.combo > 1 ? `NEAR MISS x${this.combo}` : 'NEAR MISS', 0x5ce1ff);
    this.effects.floatText(midX, this.player.y - 14, `+${points}`, 0xffffff);
    this.effects.sparksAt(midX, this.player.y, 4);
  }

  private onCrash(car: TrafficCar): void {
    if (this.phase === 'over' || this.phase === 'finale' || !this.player.controls) return;

    const now = this.clock;

    if (this.player.isShielded(now) || this.player.isNitro(now)) {
      this.smash(car);
      return;
    }

    if (now < this.player.invulnerableUntil) {
      return;
    }

    this.effects.explosion(car.x, car.y);
    this.sound.play('sfx_explosion', { volume: 0.25 });
    car.destroy();
    this.takeHit();
  }

  private smash(car: TrafficCar): void {
    this.effects.explosion(car.x, car.y);
    this.effects.shake(0.008, 150);
    Sfx.smash(this);
    this.sound.play('sfx_explosion', { volume: 0.15 });
    car.destroy();
    this.summary.smashed += 1;
    this.score += 150;
    this.effects.floatText(car.x, car.y - 20, 'SMASH! +150', 0xffa22a);
  }

  private takeHit(): void {
    this.lives -= 1;
    this.combo = 0;
    this.hitsThisStage += 1;
    this.player.invulnerableUntil = this.clock + PLAYER.invulnerableMs;
    this.effects.shake(0.014, 260);
    this.effects.flash(0xff2020, 140);

    if (this.lives <= 0) {
      this.gameOver();
    }
  }

  private onPickup(kind: PickupKind, x: number, y: number): void {
    const now = this.clock;

    switch (kind) {
      case 'coin':
        this.score += 25;
        this.summary.coins += 1;
        Sfx.coin(this);
        this.effects.glitterAt(x, y, 0xffe45c, 6);
        break;
      case 'fuel':
        this.fuel = Math.min(FUEL.max, this.fuel + FUEL.canAmount);
        this.score += 10;
        Sfx.fuel(this);
        this.effects.glitterAt(x, y, 0xff8a3a, 10);
        this.effects.floatText(x, y - 12, '+FUEL', 0xff8a3a);
        break;
      case 'wrench':
        this.lives = Math.min(PLAYER.maxLives, this.lives + 1);
        Sfx.repair(this);
        this.effects.glitterAt(x, y, 0xffffff, 12);
        this.effects.floatText(x, y - 12, '+1 LIFE', 0xff5a7a);
        break;
      case 'shield':
        this.player.shieldUntil = now + SHIELD_MS;
        Sfx.powerUp(this);
        this.effects.glitterAt(x, y, 0x5ce1ff, 14);
        this.effects.floatText(x, y - 12, 'SHIELD!', 0x5ce1ff);
        break;
      case 'nitro':
        this.player.nitroUntil = now + NITRO_MS;
        Sfx.powerUp(this);
        this.sound.play('sfx_accelerate', { volume: 0.25 });
        this.effects.glitterAt(x, y, 0x5c9dff, 14);
        this.effects.floatText(x, y - 12, 'NITRO!', 0xffa22a);
        this.effects.shake(0.004, 300);
        break;
    }
  }

  private onOil(x: number, y: number): void {
    if (this.player.isNitro(this.clock)) return;
    this.player.spinOut(this.clock);
    Sfx.skid(this);
    this.effects.floatText(x, y - 16, 'OIL SLICK!', 0xb266ff);
  }

  private onConeHit(item: { x: number; y: number }, protectedHit: boolean): void {
    this.effects.sparksAt(item.x, item.y, 8);
    if (protectedHit) {
      this.score += 20;
      this.effects.floatText(item.x, item.y - 12, '+20', 0xffa22a);
      Sfx.smash(this);
      return;
    }
    this.sound.play('sfx_explosion', { volume: 0.12 });
    this.takeHit();
  }

  private outOfGas(): void {
    this.hud.shout('OUT OF GAS!', 0xff3b3b, 16, 1200);
    this.fuel = 60;
    this.sputterUntil = this.clock + 1500;
    this.effects.puff(this.player.x, this.player.y + 20, 8);
    this.takeHit();
  }

  private honk(): void {
    const now = this.clock;
    if (this.phase !== 'drive' && this.phase !== 'transition') return;
    if (now < this.honkReadyAt || this.paused) return;
    this.honkReadyAt = now + HONK_COOLDOWN_MS;

    this.sound.play('sfx_horn', { volume: 0.3 });
    Sfx.honkWave(this);
    this.honkRings();

    const target = this.traffic.honk(this.player);
    if (target) {
      this.score += 10;
      this.effects.floatText(target.x, target.y - target.hh - 6, 'BEEP!', 0xffd23f);
    }
  }

  private honkRings(): void {
    for (let i = 0; i < 2; i++) {
      const ring = this.add.graphics().setDepth(DEPTH.fx);
      ring.lineStyle(2, 0xffd23f, 1);
      ring.beginPath();
      ring.arc(0, 0, 10, Phaser.Math.DegToRad(-150), Phaser.Math.DegToRad(-30));
      ring.strokePath();
      ring.setPosition(this.player.x, this.player.y - 24);
      this.tweens.add({
        targets: ring,
        scale: 3,
        alpha: 0,
        y: this.player.y - 44,
        delay: i * 110,
        duration: 380,
        onComplete: () => ring.destroy()
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Pause / mute

  private onBlur(): void {
    if (!this.paused && (this.phase === 'drive' || this.phase === 'transition')) {
      this.togglePause();
    }
  }

  private togglePause(): void {
    if (this.phase === 'over' || this.phase === 'finale' || this.phase === 'intro') return;

    this.paused = !this.paused;

    if (this.paused) {
      this.tweens.pauseAll();
      this.time.paused = true;
      this.music.pause();
      this.showPause();
    } else {
      this.tweens.resumeAll();
      this.time.paused = false;
      this.music.resume();
      this.pauseLayer?.destroy();
      this.pauseLayer = null;
    }
  }

  private showPause(): void {
    const layer = this.add.container(0, 0).setDepth(DEPTH.overlay);
    layer.add(this.add.rectangle(0, 0, W, H, 0x000000, 0.6).setOrigin(0).setInteractive());
    layer.add(this.add.bitmapText(W / 2, 240, PIXEL_FONT, 'PAUSED', 24).setOrigin(0.5).setDropShadow(2, 2, 0x000000, 1));
    const resume = textButton(this, W / 2, 290, 'RESUME', 150, () => this.togglePause());
    const mute = textButton(this, W / 2, 318, isMuted() ? 'SOUND: OFF' : 'SOUND: ON', 150, () => {
      this.toggleMute();
      // Rebuild so the label reflects the new state.
      this.pauseLayer?.destroy();
      this.showPause();
    });
    const quit = textButton(this, W / 2, 346, 'QUIT TO TITLE', 150, () => this.scene.start('Title'));
    layer.add([resume.container, mute.container, quit.container]);
    layer.add(this.add.bitmapText(W / 2, 384, PIXEL_FONT, 'P / ESC TO RESUME', 8).setOrigin(0.5).setTint(0x9aa3b5));
    this.pauseLayer = layer;
  }

  private toggleMute(): void {
    setMuted(this.game, !isMuted());
    Sfx.select(this);
  }

  // ---------------------------------------------------------------------------
  // Frame

  update(_time: number, delta: number): void {
    if (this.paused) {
      return;
    }

    // Gameplay runs on its own clock so power-up timers freeze while paused.
    const step = Math.min(delta, 50);
    this.clock += step;
    const time = this.clock;
    const dt = step / 1000;
    const stage = this.stage;
    const progress = Phaser.Math.Clamp(this.stageDistance / stage.length, 0, 1);

    this.lighting.update(dt);
    const night = this.lighting.nightAmount;
    this.road.nightAmount = night;

    // Road speed.
    if (this.finaleScroll !== null) {
      this.scroll = this.finaleScroll;
    } else if (this.phase !== 'over') {
      let target = this.phase === 'intro' ? 140 : Phaser.Math.Linear(stage.speed[0], stage.speed[1], progress);
      if (this.player.isNitro(time)) target *= NITRO_BOOST;
      if (this.player.isSpinning(time)) target *= 0.85;
      if (time < this.sputterUntil) target *= 0.55;
      this.targetScroll = target;
      this.scroll += (this.targetScroll - this.scroll) * Math.min(1, dt * 2.5);
    }

    const dy = this.scroll * dt;
    this.road.update(dy);

    if (this.phase === 'drive') {
      this.stageDistance += dy;
      this.totalDistance += dy;
      this.score += dy * 0.1;
    } else if (this.phase === 'transition') {
      this.score += dy * 0.1;
    }

    const input = this.controls.read();
    this.player.update(time, dt, input, night);

    if (this.player.scraping && this.player.canScrapeSpark()) {
      const side = this.player.x < W / 2 ? -1 : 1;
      this.effects.sparksAt(this.player.x + side * 12, this.player.y + Phaser.Math.Between(-12, 12), 2);
    }

    this.traffic.update(dt, time, this.scroll, stage, progress, this.phase === 'over' ? null : this.player, this.items.workZones, night);
    this.items.update(dt, time, this.scroll, stage, this.stageIndex, this.player, this.traffic, this.fuel, this.lives);

    if (this.phase === 'drive') {
      if (!this.player.isNitro(time)) {
        this.fuel -= FUEL.drainPerSecond * dt;
      }

      if (this.fuel <= 0) {
        this.fuel = 0;
        this.outOfGas();
      } else if (this.fuel < FUEL.lowThreshold && time > this.lowFuelBeepAt) {
        this.lowFuelBeepAt = time + 1400;
        Sfx.lowFuel(this);
      }

      if (this.stageDistance >= stage.length && this.phase === 'drive') {
        this.completeStage();
      }
    }

    if (this.combo > 0 && time > this.comboUntil) {
      this.combo = 0;
    }

    const power = this.player.isNitro(time) && this.phase !== 'finale'
      ? { kind: 'nitro' as const, remaining: this.player.nitroUntil - time, total: NITRO_MS }
      : this.player.isShielded(time)
        ? { kind: 'shield' as const, remaining: this.player.shieldUntil - time, total: SHIELD_MS }
        : null;

    this.hud.update(time, {
      score: this.score,
      lives: Math.max(0, this.lives),
      fuel: this.fuel,
      combo: this.combo,
      progress: this.totalDistance / TOTAL_DISTANCE,
      power
    });
  }
}
