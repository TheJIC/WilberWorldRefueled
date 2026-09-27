import Phaser from 'phaser';
import { DEPTH, H, LANE_COUNT, LANE_X, NEAR_MISS_GAP } from '../config';
import { StageDef, VEHICLES, VehicleDef, VehicleKind, weightedPick } from '../data';
import { Player } from '../objects/Player';

interface LaneChange {
  from: number;
  to: number;
  /** Seconds of blinker before the car starts to move. */
  signal: number;
  t: number;
  duration: number;
}

export class TrafficCar {
  readonly sprite: Phaser.GameObjects.Image;
  readonly shadow: Phaser.GameObjects.Image;
  readonly blinkers: Phaser.GameObjects.Image[];
  readonly lights: Phaser.GameObjects.Image[] = [];
  readonly siren: Phaser.GameObjects.Image[] = [];
  readonly def: VehicleDef;
  x: number;
  y: number;
  lane: number;
  pace: number;
  laneChange: LaneChange | null = null;
  /** Time (s) until this car tries a voluntary lane change; <0 = never. */
  wanderIn: number;
  relSide = 0;
  nearMissed = false;
  dead = false;

  constructor(scene: Phaser.Scene, readonly kind: VehicleKind, lane: number, y: number, pace: number) {
    this.def = VEHICLES[kind];
    this.lane = lane;
    this.x = LANE_X[lane];
    this.y = y;
    this.pace = pace;
    this.wanderIn = Math.random() < this.def.laneChangeChance ? Phaser.Math.FloatBetween(0.6, 2.6) : -1;

    this.shadow = scene.add.image(this.x + 3, y + 4, this.def.texture)
      .setTint(0x000000)
      .setAlpha(0.3)
      .setDepth(DEPTH.traffic - 1);
    this.sprite = scene.add.image(this.x, y, this.def.texture).setDepth(DEPTH.traffic);

    const blinkY = -this.def.hh + 2;
    this.blinkers = [-1, 1].map((side) => scene.add.image(this.x + side * 9, y + blinkY, 'dot')
      .setTint(0xffb000)
      .setDepth(DEPTH.traffic + 1)
      .setVisible(false));

    // Night lights: two tail glows and a headlight cone.
    for (const side of [-7, 7]) {
      this.lights.push(scene.add.image(this.x + side, y + this.def.hh, 'fx_glow')
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(0xff2020)
        .setScale(0.32)
        .setDepth(DEPTH.lights)
        .setAlpha(0));
    }
    this.lights.push(scene.add.image(this.x, y - this.def.hh, 'fx_cone')
      .setOrigin(0.5, 1)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(0.8)
      .setDepth(DEPTH.lights)
      .setAlpha(0));

    if (kind === 'police') {
      for (const tint of [0xff2030, 0x2060ff]) {
        this.siren.push(scene.add.image(this.x, y, 'fx_softglow')
          .setBlendMode(Phaser.BlendModes.ADD)
          .setTint(tint)
          .setScale(0.5)
          .setDepth(DEPTH.lights));
      }
    }
  }

  get hw(): number {
    return this.def.hw;
  }

  get hh(): number {
    return this.def.hh;
  }

  sync(time: number, nightAmount: number): void {
    this.sprite.setPosition(this.x, this.y);
    this.shadow.setPosition(this.x + 3, this.y + 4);

    const lc = this.laneChange;
    const blinkOn = lc !== null && Math.floor(time / 180) % 2 === 0;
    const dir = lc ? Math.sign(lc.to - lc.from) : 0;
    this.blinkers.forEach((b, i) => {
      b.setPosition(this.x + (i === 0 ? -9 : 9), this.y - this.def.hh + 3);
      b.setVisible(blinkOn && ((i === 0 && dir < 0) || (i === 1 && dir > 0)));
    });

    // Slight body lean while changing lanes.
    const lean = lc && lc.signal <= 0 ? dir * 5 * Math.sin((lc.t / lc.duration) * Math.PI) : 0;
    this.sprite.setAngle(lean);
    this.shadow.setAngle(lean);

    this.lights[0].setPosition(this.x - 7, this.y + this.def.hh - 1).setAlpha(nightAmount * 0.85);
    this.lights[1].setPosition(this.x + 7, this.y + this.def.hh - 1).setAlpha(nightAmount * 0.85);
    this.lights[2].setPosition(this.x, this.y - this.def.hh + 2).setAngle(lean).setAlpha(nightAmount * 0.4);

    if (this.siren.length) {
      const phase = Math.floor(time / 150) % 2;
      this.siren[0].setPosition(this.x - 5, this.y - 2).setAlpha(phase === 0 ? 0.9 : 0.15);
      this.siren[1].setPosition(this.x + 5, this.y - 2).setAlpha(phase === 1 ? 0.9 : 0.15);
    }
  }

  destroy(): void {
    this.dead = true;
    this.sprite.destroy();
    this.shadow.destroy();
    this.blinkers.forEach((b) => b.destroy());
    this.lights.forEach((l) => l.destroy());
    this.siren.forEach((s) => s.destroy());
  }
}

export interface WorkZoneRef {
  lane: number;
  top: number;
  bottom: number;
}

interface PendingSpeeder {
  lane: number;
  at: number;
  warning: Phaser.GameObjects.Image;
}

export interface TrafficEvents {
  onNearMiss(car: TrafficCar): void;
  onCrash(car: TrafficCar): void;
}

const SPAWN_Y = -70;
const EASE = Phaser.Math.Easing.Sine.InOut;

export class Traffic {
  readonly cars: TrafficCar[] = [];
  private spawnTimer = 0;
  private speederTimer = 6;
  private readonly pendingSpeeders: PendingSpeeder[] = [];
  enabled = false;
  /** Lanes traffic may use (the title screen keeps the middle clear for the logo car). */
  lanes: number[] = [...Array(LANE_COUNT).keys()];

  constructor(private readonly scene: Phaser.Scene, private readonly events: TrafficEvents) {}

  /** Seconds between spawns, driven by stage progress. */
  update(dt: number, time: number, scroll: number, stage: StageDef, progress: number, player: Player | null, zones: WorkZoneRef[], nightAmount: number): void {
    if (this.enabled) {
      this.spawnTimer -= dt * 1000;
      if (this.spawnTimer <= 0) {
        const interval = Phaser.Math.Linear(stage.spawnMs[0], stage.spawnMs[1], progress);
        this.spawnTimer = interval * Phaser.Math.FloatBetween(0.8, 1.2);
        this.trySpawn(stage, zones, progress);
      }

      if (stage.speeders) {
        this.speederTimer -= dt;
        if (this.speederTimer <= 0) {
          this.speederTimer = Phaser.Math.FloatBetween(7, 12);
          this.queueSpeeder(time);
        }
      }
    }

    this.updatePendingSpeeders(time);
    this.avoidZones(zones);
    this.keepDistance();

    for (let i = this.cars.length - 1; i >= 0; i--) {
      const car = this.cars[i];
      this.stepLaneChange(car, dt);
      car.y += scroll * (1 - car.pace) * dt;
      car.sync(time, nightAmount);

      if (!car.dead && player) {
        this.checkPlayer(car, player, time);
      }

      if (car.dead || car.y - car.hh > H + 80 || car.y + car.hh < -260) {
        if (!car.dead) {
          car.destroy();
        }
        this.cars.splice(i, 1);
      }
    }
  }

  private trySpawn(stage: StageDef, zones: WorkZoneRef[], progress: number): void {
    const kind = weightedPick(stage.traffic);
    const def = VEHICLES[kind];
    const lanes = Phaser.Utils.Array.Shuffle([...this.lanes]);
    const blockedTop = new Set<number>();

    // Lanes with a car (or a road-work closure) near the top band count
    // towards a possible wall; never let every lane close at once.
    for (const car of this.cars) {
      if (car.y < 170 && car.y > -220) {
        blockedTop.add(car.lane);
        if (car.laneChange) {
          blockedTop.add(car.laneChange.to);
        }
      }
    }
    for (const zone of zones) {
      if (zone.bottom > -220 && zone.top < 260) {
        blockedTop.add(zone.lane);
      }
    }

    for (const lane of lanes) {
      if (blockedTop.size >= LANE_COUNT - 1 && !blockedTop.has(lane)) {
        // Adding here would close every lane at once.
        continue;
      }

      if (!this.laneClear(lane, SPAWN_Y, def.hh + 34)) {
        continue;
      }

      if (zones.some((z) => z.lane === lane && z.bottom > -40 && z.top < 160)) {
        continue;
      }

      const pace = Phaser.Math.FloatBetween(def.pace[0], def.pace[1]) - progress * 0.05;
      const car = new TrafficCar(this.scene, kind, lane, SPAWN_Y - def.hh, pace);
      car.relSide = -1;
      this.cars.push(car);
      return;
    }
  }

  private laneClear(lane: number, y: number, margin: number): boolean {
    return !this.cars.some((car) => {
      const occupies = car.lane === lane || car.laneChange?.to === lane;
      return occupies && Math.abs(car.y - y) < car.hh + margin;
    });
  }

  private queueSpeeder(time: number): void {
    const lane = Phaser.Math.Between(0, LANE_COUNT - 1);
    const warning = this.scene.add.image(LANE_X[lane], H - 14, 'icon_warn')
      .setDepth(DEPTH.popup)
      .setScale(2);

    this.scene.tweens.add({
      targets: warning,
      alpha: 0.25,
      duration: 160,
      yoyo: true,
      repeat: -1
    });

    this.pendingSpeeders.push({ lane, at: time + 1300, warning });
  }

  private updatePendingSpeeders(time: number): void {
    for (let i = this.pendingSpeeders.length - 1; i >= 0; i--) {
      const pending = this.pendingSpeeders[i];
      if (time >= pending.at) {
        pending.warning.destroy();
        this.pendingSpeeders.splice(i, 1);

        if (this.enabled && this.laneClear(pending.lane, H + 40, 90)) {
          const def = VEHICLES.police;
          const car = new TrafficCar(this.scene, 'police', pending.lane, H + 30 + def.hh, Phaser.Math.FloatBetween(def.pace[0], def.pace[1]));
          car.relSide = 1;
          this.cars.push(car);
        }
      }
    }
  }

  clearPending(): void {
    this.pendingSpeeders.forEach((p) => p.warning.destroy());
    this.pendingSpeeders.length = 0;
  }

  /** Cars facing a closed lane either merge out or queue behind the cones. */
  private avoidZones(zones: WorkZoneRef[]): void {
    for (const zone of zones) {
      for (const car of this.cars) {
        if (car.lane !== zone.lane || car.laneChange || car.pace > 1) {
          continue;
        }

        const distanceAhead = car.y - car.hh - zone.bottom;
        if (distanceAhead > 0 && distanceAhead < 150) {
          if (!this.startLaneChange(car, 0.25)) {
            if (distanceAhead < 30) {
              car.pace = 0; // parked behind the barrier, moving with the road
            }
          }
        }
      }
    }
  }

  /** Faster cars behind slower ones brake to match speed (or overtake). */
  private keepDistance(): void {
    for (const a of this.cars) {
      for (const b of this.cars) {
        if (a === b || a.lane !== b.lane) {
          continue;
        }

        // a is ahead (north) of b.
        if (a.y >= b.y) {
          continue;
        }

        const gap = (b.y - b.hh) - (a.y + a.hh);
        if (gap < 30 && b.pace > a.pace) {
          if (b.pace > 1 || !(b.def.laneChangeChance > 0 && !b.laneChange && this.startLaneChange(b, 0.3))) {
            b.pace = a.pace;
          }
        }
      }
    }
  }

  private stepLaneChange(car: TrafficCar, dt: number): void {
    if (car.wanderIn > 0 && car.y > 0 && car.y < H - 120) {
      car.wanderIn -= dt;
      if (car.wanderIn <= 0) {
        this.startLaneChange(car, 0.55);
      }
    }

    const lc = car.laneChange;
    if (!lc) {
      return;
    }

    if (lc.signal > 0) {
      lc.signal -= dt;
      return;
    }

    lc.t = Math.min(lc.duration, lc.t + dt);
    car.x = Phaser.Math.Linear(LANE_X[lc.from], LANE_X[lc.to], EASE(lc.t / lc.duration));
    if (lc.t >= lc.duration) {
      car.lane = lc.to;
      car.x = LANE_X[lc.to];
      car.laneChange = null;
    }
  }

  /** Begin a signalled lane change into a free adjacent lane. */
  startLaneChange(car: TrafficCar, signal: number, prefer?: number): boolean {
    if (car.laneChange || car.dead) {
      return false;
    }

    const options = prefer !== undefined ? [prefer] : Phaser.Utils.Array.Shuffle([car.lane - 1, car.lane + 1]);

    for (const to of options) {
      if (!this.lanes.includes(to)) {
        continue;
      }

      const blocked = this.cars.some((other) => {
        if (other === car) return false;
        const inTarget = other.lane === to || other.laneChange?.to === to;
        return inTarget && Math.abs(other.y - car.y) < other.hh + car.hh + 26;
      });

      if (!blocked) {
        car.laneChange = { from: car.lane, to, signal, t: 0, duration: 0.75 };
        return true;
      }
    }

    return false;
  }

  /** Honk: the first car ahead in the player's lane gets out of the way. */
  honk(player: Player): TrafficCar | null {
    let target: TrafficCar | null = null;

    for (const car of this.cars) {
      const ahead = player.y - car.y;
      if (ahead > 0 && ahead < 230 && Math.abs(car.x - player.x) < car.hw + player.hw + 4 && car.pace < 1) {
        if (!target || car.y > target.y) {
          target = car;
        }
      }
    }

    if (!target) {
      return null;
    }

    if (target.laneChange) {
      target.laneChange.signal = 0;
      return target;
    }

    const preferredSide = player.x < target.x ? 1 : -1;
    const moved = this.startLaneChange(target, 0.05, target.lane + preferredSide)
      || this.startLaneChange(target, 0.05, target.lane - preferredSide);

    if (!moved) {
      // Boxed in: floor it instead.
      target.pace = Math.min(0.95, target.pace + 0.3);
    }

    return target;
  }

  private checkPlayer(car: TrafficCar, player: Player, time: number): void {
    const dx = Math.abs(car.x - player.x);
    const dy = Math.abs(car.y - player.y);

    if (dx < car.hw + player.hw && dy < car.hh + player.hh) {
      this.events.onCrash(car);
      return;
    }

    const side = Math.sign(car.y - player.y) || car.relSide;
    if (side !== car.relSide) {
      car.relSide = side;
      const gap = dx - (car.hw + player.hw);
      if (!car.nearMissed && gap >= 0 && gap < NEAR_MISS_GAP && player.controls && !player.isNitro(time)) {
        car.nearMissed = true;
        this.events.onNearMiss(car);
      }
    }
  }

  destroyCar(car: TrafficCar): void {
    car.destroy();
  }

  /** Scatter everything (stage clear / finale). Returns positions for fx. */
  clearAll(): Array<{ x: number; y: number }> {
    const positions = this.cars.filter((c) => c.y > -40 && c.y < H + 40).map((c) => ({ x: c.x, y: c.y }));
    this.cars.forEach((c) => c.destroy());
    this.cars.length = 0;
    this.clearPending();
    return positions;
  }
}
