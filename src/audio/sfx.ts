import Phaser from 'phaser';
import { STORAGE_KEYS } from '../config';
import { readStorage, writeStorage } from '../storage';

// Tiny chiptune synth for the new arcade sounds (coins, fuel, power-ups...).
// It rides on Phaser's WebAudio context so it shares the global mute and the
// browser's autoplay unlock with the original game's music and samples.

type Wave = OscillatorType;

interface ToneOptions {
  wave?: Wave;
  from: number;
  to?: number;
  duration: number;
  volume?: number;
  delay?: number;
}

let muted = readStorage(STORAGE_KEYS.muted) === '1';

export function isMuted(): boolean {
  return muted;
}

export function setMuted(game: Phaser.Game, value: boolean): void {
  muted = value;
  game.sound.mute = value;
  writeStorage(STORAGE_KEYS.muted, value ? '1' : '0');
}

export function applyMute(game: Phaser.Game): void {
  game.sound.mute = muted;
}

function context(scene: Phaser.Scene): AudioContext | null {
  const manager = scene.sound as Phaser.Sound.WebAudioSoundManager;
  const ctx = manager.context;

  if (!ctx || muted || ctx.state !== 'running') {
    return null;
  }

  return ctx;
}

function tone(ctx: AudioContext, opts: ToneOptions): void {
  const start = ctx.currentTime + (opts.delay ?? 0);
  const end = start + opts.duration;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const volume = (opts.volume ?? 0.12) * MASTER;

  osc.type = opts.wave ?? 'square';
  osc.frequency.setValueAtTime(opts.from, start);

  if (opts.to !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(opts.to, 1), end);
  }

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);

  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(end + 0.02);
}

let noiseBuffer: AudioBuffer | null = null;

function noise(ctx: AudioContext, duration: number, volume: number, filterFrom: number, filterTo: number, delay = 0): void {
  if (!noiseBuffer || noiseBuffer.sampleRate !== ctx.sampleRate) {
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const channel = noiseBuffer.getChannelData(0);
    for (let i = 0; i < channel.length; i++) {
      channel[i] = Math.random() * 2 - 1;
    }
  }

  const start = ctx.currentTime + delay;
  const end = start + duration;
  const src = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();

  src.buffer = noiseBuffer;
  filter.type = 'bandpass';
  filter.Q.value = 1.2;
  filter.frequency.setValueAtTime(filterFrom, start);
  filter.frequency.exponentialRampToValueAtTime(filterTo, end);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume * MASTER, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);

  src.connect(filter).connect(gain).connect(ctx.destination);
  src.start(start);
  src.stop(end + 0.02);
}

const MASTER = 0.9;

export const Sfx = {
  coin(scene: Phaser.Scene) {
    const ctx = context(scene);
    if (!ctx) return;
    tone(ctx, { from: 988, duration: 0.06, volume: 0.07 });
    tone(ctx, { from: 1319, duration: 0.14, volume: 0.07, delay: 0.06 });
  },

  fuel(scene: Phaser.Scene) {
    const ctx = context(scene);
    if (!ctx) return;
    for (let i = 0; i < 4; i++) {
      tone(ctx, { wave: 'triangle', from: 220 + i * 90, to: 520 + i * 120, duration: 0.07, volume: 0.16, delay: i * 0.07 });
    }
  },

  powerUp(scene: Phaser.Scene) {
    const ctx = context(scene);
    if (!ctx) return;
    [523, 659, 784, 1047].forEach((f, i) => {
      tone(ctx, { from: f, duration: 0.09, volume: 0.07, delay: i * 0.06 });
    });
  },

  repair(scene: Phaser.Scene) {
    const ctx = context(scene);
    if (!ctx) return;
    [392, 523, 659, 784].forEach((f, i) => {
      tone(ctx, { wave: 'triangle', from: f, duration: 0.12, volume: 0.14, delay: i * 0.05 });
    });
  },

  nearMiss(scene: Phaser.Scene, combo: number) {
    const ctx = context(scene);
    if (!ctx) return;
    noise(ctx, 0.22, 0.22, 600, 3200);
    const base = 600 + Math.min(combo, 8) * 70;
    tone(ctx, { wave: 'square', from: base, to: base * 1.5, duration: 0.1, volume: 0.04, delay: 0.04 });
  },

  honkWave(scene: Phaser.Scene) {
    const ctx = context(scene);
    if (!ctx) return;
    noise(ctx, 0.15, 0.05, 1800, 900);
  },

  lowFuel(scene: Phaser.Scene) {
    const ctx = context(scene);
    if (!ctx) return;
    tone(ctx, { from: 880, duration: 0.08, volume: 0.06 });
    tone(ctx, { from: 660, duration: 0.1, volume: 0.06, delay: 0.1 });
  },

  skid(scene: Phaser.Scene) {
    const ctx = context(scene);
    if (!ctx) return;
    noise(ctx, 0.6, 0.18, 2400, 700);
  },

  shieldBreak(scene: Phaser.Scene) {
    const ctx = context(scene);
    if (!ctx) return;
    noise(ctx, 0.25, 0.25, 3000, 400);
    tone(ctx, { wave: 'sawtooth', from: 440, to: 110, duration: 0.25, volume: 0.05 });
  },

  smash(scene: Phaser.Scene) {
    const ctx = context(scene);
    if (!ctx) return;
    noise(ctx, 0.3, 0.3, 1400, 200);
    tone(ctx, { wave: 'square', from: 200, to: 60, duration: 0.2, volume: 0.06 });
  },

  stageClear(scene: Phaser.Scene) {
    const ctx = context(scene);
    if (!ctx) return;
    [523, 659, 784, 659, 784, 1047].forEach((f, i) => {
      tone(ctx, { from: f, duration: i === 5 ? 0.35 : 0.1, volume: 0.07, delay: i * 0.1 });
    });
  },

  select(scene: Phaser.Scene) {
    const ctx = context(scene);
    if (!ctx) return;
    tone(ctx, { from: 660, to: 990, duration: 0.08, volume: 0.06 });
  },

  countdownTick(scene: Phaser.Scene, go: boolean) {
    const ctx = context(scene);
    if (!ctx) return;
    tone(ctx, { wave: 'square', from: go ? 880 : 440, duration: go ? 0.3 : 0.12, volume: 0.035 });
  }
};
