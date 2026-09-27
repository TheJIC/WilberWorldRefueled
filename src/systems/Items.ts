import Phaser from 'phaser';
import { DEPTH, FUEL, H, LANE_COUNT, LANE_X, PLAYER } from '../config';
import { StageDef } from '../data';
import { Player } from '../objects/Player';
import { Traffic, WorkZoneRef } from './Traffic';

export type PickupKind = 'coin' | 'fuel' | 'wrench' | 'shield' | 'nitro';
export type HazardKind = 'oil' | 'cone' | 'barrier';

interface Item<K> {
  kind: K;
  sprite: Phaser.GameObjects.Image;
  glow?: Phaser.GameObjects.Image;
  x: number;
  y: number;
  hw: number;
  hh: number;
  done: boolean;
  bob: number;
}

interface WorkZone extends WorkZoneRef {
  cones: Array<Item<HazardKind>>;
}

const PICKUP_TEXTURES: Record<PickupKind, string> = {
  coin: 'item_coin',
  fuel: 'item_fuel',
  wrench: 'item_wrench',
  shield: 'item_shield',
  nitro: 'item_nitro'
};

const GLOW_TINTS: Partial<Record<PickupKind, number>> = {
  fuel: 0xff6a3a,
  wrench: 0xffffff,
  shield: 0x5ce1ff,
  nitro: 0x5c9dff
};

export interface ItemEvents {
  onPickup(kind: PickupKind, x: number, y: number): void;
  onOil(x: number, y: number): void;
  onConeHit(item: { x: number; y: number }, protectedHit: boolean): void;
}

export class Items {
  private readonly pickups: Array<Item<PickupKind>> = [];
  private readonly hazards: Array<Item<HazardKind>> = [];
  private readonly zones: WorkZone[] = [];
  enabled = false;

  private coinTimer = 2.5;
  private fuelTimer = 4;
  private powerTimer = 14;
  private oilTimer = 3;
  private zoneTimer = 6;

  constructor(private readonly scene: Phaser.Scene, private readonly events: ItemEvents) {}

  get workZones(): WorkZoneRef[] {
    return this.zones;
  }

  update(dt: number, time: number, scroll: number, stage: StageDef, stageIndex: number, player: Player, traffic: Traffic, fuel: number, lives: number): void {
    if (this.enabled) {
      this.runSpawners(dt, stage, stageIndex, traffic, fuel, lives);
    }

    const dy = scroll * dt;

    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const item = this.pickups[i];
      item.y += dy;
      item.bob += dt;
      const bobY = item.kind === 'coin' ? 0 : Math.sin(item.bob * 5) * 1.5;
      item.sprite.setPosition(item.x, item.y + bobY);

      if (item.kind === 'coin') {
        // Fake a spin by squashing horizontally.
        item.sprite.scaleX = Math.max(0.15, Math.abs(Math.cos(item.bob * 5)));
      }

      if (item.glow) {
        item.glow.setPosition(item.x, item.y + bobY).setAlpha(0.35 + Math.sin(item.bob * 6) * 0.15);
      }

      if (!item.done && this.overlaps(item, player)) {
        item.done = true;
        this.events.onPickup(item.kind, item.x, item.y);
      }

      if (item.done || item.y - item.hh > H + 20) {
        item.sprite.destroy();
        item.glow?.destroy();
        this.pickups.splice(i, 1);
      }
    }

    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const item = this.hazards[i];
      item.y += dy;
      if (!item.done) {
        item.sprite.setPosition(item.x, item.y);
      }
      item.glow?.setPosition(item.x, item.y - 5).setAlpha(Math.floor(time / 300) % 2 === 0 ? 0.9 : 0.2);

      if (!item.done && player.controls && this.overlaps(item, player)) {
        if (item.kind === 'oil') {
          item.done = true;
          this.events.onOil(item.x, item.y);
          this.scene.tweens.add({ targets: item.sprite, alpha: 0.4, duration: 200 });
        } else {
          item.done = true;
          this.knockAway(item, player);
          this.events.onConeHit(item, player.isProtected(time));
        }
      }

      if (item.y - item.hh > H + 30) {
        item.sprite.destroy();
        item.glow?.destroy();
        this.hazards.splice(i, 1);
      }
    }

    for (let i = this.zones.length - 1; i >= 0; i--) {
      const zone = this.zones[i];
      zone.top += dy;
      zone.bottom += dy;
      if (zone.top > H + 40) {
        this.zones.splice(i, 1);
      }
    }
  }

  private overlaps(item: { x: number; y: number; hw: number; hh: number }, player: Player): boolean {
    return Math.abs(item.x - player.x) < item.hw + player.hw && Math.abs(item.y - player.y) < item.hh + player.hh;
  }

  private runSpawners(dt: number, stage: StageDef, stageIndex: number, traffic: Traffic, fuel: number, lives: number): void {
    this.coinTimer -= dt;
    if (this.coinTimer <= 0) {
      this.coinTimer = Phaser.Math.FloatBetween(3.2, 5.2);
      this.spawnCoinTrail(traffic);
    }

    // Fuel shows up more often the emptier the tank.
    this.fuelTimer -= dt * (fuel < FUEL.lowThreshold ? 2.2 : fuel < 55 ? 1.3 : 1);
    if (this.fuelTimer <= 0) {
      this.fuelTimer = Phaser.Math.FloatBetween(6.5, 9);
      this.spawnPickup('fuel', traffic);
    }

    this.powerTimer -= dt;
    if (this.powerTimer <= 0) {
      this.powerTimer = Phaser.Math.FloatBetween(13, 19);
      const options: Array<[PickupKind, number]> = [['shield', 3]];
      if (stageIndex >= 1) options.push(['nitro', 3]);
      if (lives < PLAYER.maxLives) options.push(['wrench', lives <= 1 ? 4 : 2]);
      const total = options.reduce((s, [, w]) => s + w, 0);
      let roll = Math.random() * total;
      const kind = options.find(([, w]) => (roll -= w) <= 0)?.[0] ?? 'shield';
      this.spawnPickup(kind, traffic);
    }

    if (stage.oilEveryMs > 0) {
      this.oilTimer -= dt;
      if (this.oilTimer <= 0) {
        this.oilTimer = (stage.oilEveryMs / 1000) * Phaser.Math.FloatBetween(0.7, 1.3);
        this.spawnOil(traffic);
      }
    }

    if (stage.workZoneEveryMs > 0) {
      this.zoneTimer -= dt;
      if (this.zoneTimer <= 0) {
        this.zoneTimer = (stage.workZoneEveryMs / 1000) * Phaser.Math.FloatBetween(0.8, 1.25);
        this.spawnWorkZone(traffic);
      }
    }
  }

  private laneFree(lane: number, traffic: Traffic, top: number, bottom: number): boolean {
    const carBlocks = traffic.cars.some((car) => (car.lane === lane || car.laneChange?.to === lane) && car.y + car.hh > top - 20 && car.y - car.hh < bottom + 20);
    const zoneBlocks = this.zones.some((z) => z.lane === lane && z.bottom > top - 40 && z.top < bottom + 40);
    const hazardBlocks = this.hazards.some((h) => Math.abs(h.x - LANE_X[lane]) < 20 && h.y > top - 30 && h.y < bottom + 30);
    return !carBlocks && !zoneBlocks && !hazardBlocks;
  }

  private freeLane(traffic: Traffic, top: number, bottom: number): number | null {
    const lanes = Phaser.Utils.Array.Shuffle([...Array(LANE_COUNT).keys()]);
    return lanes.find((lane) => this.laneFree(lane, traffic, top, bottom)) ?? null;
  }

  spawnPickup(kind: PickupKind, traffic: Traffic, lane?: number, y = -24): void {
    const useLane = lane ?? this.freeLane(traffic, y - 20, y + 20);
    if (useLane === null) {
      return;
    }

    const x = LANE_X[useLane];
    const tint = GLOW_TINTS[kind];
    const glow = tint !== undefined
      ? this.scene.add.image(x, y, 'fx_glow').setBlendMode(Phaser.BlendModes.ADD).setTint(tint).setScale(1.3).setDepth(DEPTH.pickup - 1)
      : undefined;
    const sprite = this.scene.add.image(x, y, PICKUP_TEXTURES[kind]).setDepth(DEPTH.pickup);
    const size = kind === 'coin' ? 7 : 10;

    this.pickups.push({ kind, sprite, glow, x, y, hw: size, hh: size, done: false, bob: Math.random() * 10 });
  }

  private spawnCoinTrail(traffic: Traffic): void {
    const count = 5;
    const spacing = 22;
    const top = -24 - spacing * (count - 1);
    const lane = this.freeLane(traffic, top, -24);

    if (lane === null) {
      return;
    }

    // Sometimes the trail weaves into a neighbouring lane to tempt a risky move.
    const weave = Math.random() < 0.35;
    const neighbour = lane === 0 ? 1 : lane === LANE_COUNT - 1 ? lane - 1 : lane + (Math.random() < 0.5 ? -1 : 1);
    const weaveOk = weave && this.laneFree(neighbour, traffic, top, -24);

    for (let i = 0; i < count; i++) {
      const y = -24 - i * spacing;
      if (weaveOk && i >= 2) {
        const t = Math.min(1, (i - 1) / 2);
        const x = Phaser.Math.Linear(LANE_X[lane], LANE_X[neighbour], t);
        this.spawnPickupAt('coin', x, y);
      } else {
        this.spawnPickupAt('coin', LANE_X[lane], y);
      }
    }
  }

  private spawnPickupAt(kind: PickupKind, x: number, y: number): void {
    const sprite = this.scene.add.image(x, y, PICKUP_TEXTURES[kind]).setDepth(DEPTH.pickup);
    this.pickups.push({ kind, sprite, x, y, hw: 7, hh: 7, done: false, bob: y * 0.05 });
  }

  private spawnOil(traffic: Traffic): void {
    const lane = this.freeLane(traffic, -60, 20);
    if (lane === null) {
      return;
    }

    const x = LANE_X[lane] + Phaser.Math.Between(-6, 6);
    const sprite = this.scene.add.image(x, -20, 'hazard_oil').setDepth(DEPTH.decal).setFlipX(Math.random() < 0.5);
    this.hazards.push({ kind: 'oil', sprite, x, y: -20, hw: 12, hh: 8, done: false, bob: 0 });
  }

  /** A closed lane: a striped barrier followed by a taper of cones. */
  private spawnWorkZone(traffic: Traffic): void {
    const lane = this.freeLane(traffic, -220, 30);
    if (lane === null) {
      return;
    }

    // Never close a lane if another zone is already on screen: always leave room.
    if (this.zones.some((z) => z.top < H)) {
      return;
    }

    const x = LANE_X[lane];
    const top = -210;
    const zone: WorkZone = { lane, top, bottom: -10, cones: [] };
    const barrier = this.scene.add.image(x, -16, 'hazard_barrier').setDepth(DEPTH.traffic - 2);
    const lamp = this.scene.add.image(x + 12, -21, 'fx_glow')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xffb000)
      .setScale(0.5)
      .setDepth(DEPTH.lights);
    const barrierItem: Item<HazardKind> = { kind: 'barrier', sprite: barrier, glow: lamp, x, y: -16, hw: 12, hh: 6, done: false, bob: 0 };
    this.hazards.push(barrierItem);
    zone.cones.push(barrierItem);

    for (let i = 1; i <= 4; i++) {
      const cy = -16 - i * 44;
      for (const offset of [-13, 13]) {
        const cone = this.scene.add.image(x + offset, cy, 'hazard_cone').setDepth(DEPTH.traffic - 2);
        const item: Item<HazardKind> = { kind: 'cone', sprite: cone, x: x + offset, y: cy, hw: 6, hh: 6, done: false, bob: 0 };
        this.hazards.push(item);
        zone.cones.push(item);
      }
    }

    this.zones.push(zone);
  }

  private knockAway(item: Item<HazardKind>, player: Player): void {
    const dir = Math.sign(item.x - player.x) || 1;
    this.scene.tweens.add({
      targets: item.sprite,
      x: item.sprite.x + dir * Phaser.Math.Between(30, 60),
      y: item.sprite.y - Phaser.Math.Between(20, 50),
      angle: dir * 540,
      alpha: 0,
      duration: 500,
      ease: 'Quad.easeOut'
    });
    item.glow?.destroy();
    item.glow = undefined;
  }

  clearAll(): void {
    for (const item of [...this.pickups, ...this.hazards]) {
      item.sprite.destroy();
      item.glow?.destroy();
    }
    this.pickups.length = 0;
    this.hazards.length = 0;
    this.zones.length = 0;
  }
}
