// Static game data: vehicles, themes and the four stages of the drive to Wilber World.

export type VehicleKind = 'sedan' | 'sedanTeal' | 'hatch' | 'sky' | 'taxi' | 'pickup' | 'van' | 'police' | 'muscle' | 'semi';

export interface VehicleDef {
  texture: string;
  /** Collision half-extents in logical pixels. */
  hw: number;
  hh: number;
  /** Forward speed as a fraction of the road's scroll speed (lower = slower traffic). */
  pace: [number, number];
  laneChangeChance: number;
}

export const VEHICLES: Record<VehicleKind, VehicleDef> = {
  sedan: { texture: 'car_sedan', hw: 10, hh: 20, pace: [0.45, 0.62], laneChangeChance: 0.18 },
  sedanTeal: { texture: 'car_sedan_teal', hw: 10, hh: 20, pace: [0.45, 0.62], laneChangeChance: 0.18 },
  hatch: { texture: 'car_hatch', hw: 10, hh: 18, pace: [0.4, 0.58], laneChangeChance: 0.22 },
  sky: { texture: 'car_sky', hw: 10, hh: 20, pace: [0.42, 0.6], laneChangeChance: 0.2 },
  taxi: { texture: 'car_taxi', hw: 10, hh: 20, pace: [0.5, 0.68], laneChangeChance: 0.35 },
  pickup: { texture: 'car_pickup', hw: 10, hh: 21, pace: [0.38, 0.55], laneChangeChance: 0.15 },
  van: { texture: 'car_van', hw: 11, hh: 22, pace: [0.32, 0.48], laneChangeChance: 0.08 },
  police: { texture: 'car_police', hw: 10, hh: 20, pace: [1.35, 1.55], laneChangeChance: 0 },
  muscle: { texture: 'car_muscle', hw: 10, hh: 21, pace: [0.55, 0.72], laneChangeChance: 0.3 },
  semi: { texture: 'car_semi', hw: 11, hh: 42, pace: [0.25, 0.36], laneChangeChance: 0 }
};

export type ThemeKey = 'meadow' | 'desert' | 'city' | 'parkway';
export type RailStyle = 'guardrail' | 'curb';

export type PropLayer = 'outer' | 'inner';

export interface PropDef {
  key: string;
  weight: number;
}

export interface ThemeDef {
  ground: string;
  asphalt: number;
  asphaltDark: number;
  asphaltLight: number;
  shoulder: number;
  laneLine: number;
  edgeLeft: number;
  edgeRight: number;
  rail: RailStyle;
  /** Big scenery hugging the screen edge (trees, buildings). */
  outer: PropDef[];
  /** Small scenery between the big stuff and the road. */
  inner: PropDef[];
  /** Vertical gap ranges (px) between props in each layer. */
  outerGap: [number, number];
  innerGap: [number, number];
  /** Spacing of street lamps along the kerb, if any. */
  lampGap?: number;
}

export const PROP_FILES = [
  'oak', 'pine', 'blossom', 'bush', 'flowers', 'rock', 'haybale', 'stump', 'tulips', 'mailbox', 'fountain',
  'sunflowers', 'hedge', 'bench', 'autumn',
  'saguaro', 'saguaro2', 'barrel_cactus', 'desert_rock', 'skull', 'tumbleweed', 'dry_bush', 'prickly_pear',
  'oil_drum', 'dead_tree', 'tire', 'mesa', 'cow_sign', 'stones', 'agave',
  'building_a', 'building_b', 'building_c', 'building_d', 'hydrant', 'trashcan', 'planter', 'newsbox',
  'bus_shelter', 'hotdog_cart', 'bollard', 'cafe_table', 'crates', 'road_barrel', 'power_box'
];

export const THEMES: Record<ThemeKey, ThemeDef> = {
  meadow: {
    ground: 'ground_meadow',
    asphalt: 0x3e4250,
    asphaltDark: 0x353844,
    asphaltLight: 0x4a4e5c,
    shoulder: 0x34363f,
    laneLine: 0xf2f2ea,
    edgeLeft: 0xf5c542,
    edgeRight: 0xf2f2ea,
    rail: 'guardrail',
    outer: [
      { key: 'prop_oak', weight: 5 },
      { key: 'prop_pine', weight: 4 },
      { key: 'prop_autumn', weight: 2 },
      { key: 'prop_bush', weight: 2 }
    ],
    inner: [
      { key: 'prop_bush', weight: 3 },
      { key: 'prop_flowers', weight: 4 },
      { key: 'prop_rock', weight: 2 },
      { key: 'prop_haybale', weight: 2 },
      { key: 'prop_stump', weight: 1 },
      { key: 'prop_mailbox', weight: 1 }
    ],
    outerGap: [6, 40],
    innerGap: [40, 110]
  },
  desert: {
    ground: 'ground_desert',
    asphalt: 0x4a4648,
    asphaltDark: 0x403c3f,
    asphaltLight: 0x575254,
    shoulder: 0x3d393b,
    laneLine: 0xf2eee0,
    edgeLeft: 0xf5c542,
    edgeRight: 0xf2eee0,
    rail: 'guardrail',
    outer: [
      { key: 'prop_saguaro', weight: 4 },
      { key: 'prop_saguaro2', weight: 3 },
      { key: 'prop_mesa', weight: 2 },
      { key: 'prop_dead_tree', weight: 2 },
      { key: 'prop_desert_rock', weight: 2 },
      { key: 'prop_agave', weight: 2 }
    ],
    inner: [
      { key: 'prop_barrel_cactus', weight: 3 },
      { key: 'prop_prickly_pear', weight: 2 },
      { key: 'prop_dry_bush', weight: 3 },
      { key: 'prop_tumbleweed', weight: 2 },
      { key: 'prop_skull', weight: 1 },
      { key: 'prop_stones', weight: 2 },
      { key: 'prop_tire', weight: 1 },
      { key: 'prop_oil_drum', weight: 1 },
      { key: 'prop_cow_sign', weight: 1 }
    ],
    outerGap: [30, 90],
    innerGap: [60, 150]
  },
  city: {
    ground: 'ground_city',
    asphalt: 0x2f323d,
    asphaltDark: 0x282a33,
    asphaltLight: 0x3a3d49,
    shoulder: 0x2a2c35,
    laneLine: 0xe8e8f0,
    edgeLeft: 0xf5c542,
    edgeRight: 0xe8e8f0,
    rail: 'curb',
    outer: [
      { key: 'prop_building_a', weight: 3 },
      { key: 'prop_building_b', weight: 3 },
      { key: 'prop_building_c', weight: 3 },
      { key: 'prop_building_d', weight: 3 }
    ],
    inner: [
      { key: 'prop_hydrant', weight: 2 },
      { key: 'prop_trashcan', weight: 2 },
      { key: 'prop_planter', weight: 3 },
      { key: 'prop_newsbox', weight: 2 },
      { key: 'prop_bus_shelter', weight: 1 },
      { key: 'prop_hotdog_cart', weight: 1 },
      { key: 'prop_bollard', weight: 2 },
      { key: 'prop_cafe_table', weight: 1 },
      { key: 'prop_power_box', weight: 1 }
    ],
    outerGap: [2, 10],
    innerGap: [30, 80],
    lampGap: 120
  },
  parkway: {
    ground: 'ground_parkway',
    asphalt: 0x40434f,
    asphaltDark: 0x373a45,
    asphaltLight: 0x4c505d,
    shoulder: 0x363842,
    laneLine: 0xf6f3e8,
    edgeLeft: 0xf5c542,
    edgeRight: 0xf6f3e8,
    rail: 'guardrail',
    outer: [
      { key: 'prop_blossom', weight: 5 },
      { key: 'prop_oak', weight: 3 },
      { key: 'prop_hedge', weight: 2 },
      { key: 'prop_fountain', weight: 1 }
    ],
    inner: [
      { key: 'prop_tulips', weight: 4 },
      { key: 'prop_sunflowers', weight: 3 },
      { key: 'prop_flowers', weight: 3 },
      { key: 'prop_bench', weight: 2 },
      { key: 'prop_bush', weight: 2 }
    ],
    outerGap: [4, 36],
    innerGap: [36, 100]
  }
};

export type Lighting = 'day' | 'sunset' | 'night' | 'golden';

export interface StageDef {
  name: string;
  subtitle: string;
  theme: ThemeKey;
  /** Distance to cover in logical pixels. */
  length: number;
  /** Road scroll speed (px/s) at the start and end of the stage. */
  speed: [number, number];
  /** Traffic spawn interval (ms) at the start and end of the stage. */
  spawnMs: [number, number];
  traffic: Array<[VehicleKind, number]>;
  /** Police cruisers that come up fast from behind (with a warning). */
  speeders: boolean;
  oilEveryMs: number;
  workZoneEveryMs: number;
  lighting: Lighting;
}

export const STAGES: StageDef[] = [
  {
    name: 'SUNNY SUBURBS',
    subtitle: 'Warm up those tires!',
    theme: 'meadow',
    length: 11000,
    speed: [215, 275],
    spawnMs: [1150, 800],
    traffic: [['sedan', 4], ['hatch', 4], ['sedanTeal', 2], ['van', 2], ['pickup', 2]],
    speeders: false,
    oilEveryMs: 0,
    workZoneEveryMs: 0,
    lighting: 'day'
  },
  {
    name: 'DUSTY DESERT',
    subtitle: 'Watch for oil slicks!',
    theme: 'desert',
    length: 13000,
    speed: [245, 305],
    spawnMs: [950, 680],
    traffic: [['pickup', 4], ['sedan', 2], ['sky', 2], ['van', 2], ['semi', 2], ['muscle', 2]],
    speeders: false,
    oilEveryMs: 4200,
    workZoneEveryMs: 0,
    lighting: 'sunset'
  },
  {
    name: 'NEON NIGHT CITY',
    subtitle: 'Cops are on patrol!',
    theme: 'city',
    length: 14500,
    speed: [270, 335],
    spawnMs: [860, 620],
    traffic: [['taxi', 5], ['sedanTeal', 2], ['hatch', 2], ['van', 2], ['muscle', 2], ['semi', 1]],
    speeders: true,
    oilEveryMs: 7000,
    workZoneEveryMs: 9000,
    lighting: 'night'
  },
  {
    name: 'WILBER WORLD PARKWAY',
    subtitle: 'The final stretch!',
    theme: 'parkway',
    length: 16000,
    speed: [295, 365],
    spawnMs: [760, 540],
    traffic: [['sedan', 3], ['hatch', 2], ['sky', 2], ['taxi', 2], ['muscle', 3], ['pickup', 2], ['semi', 2], ['van', 1]],
    speeders: true,
    oilEveryMs: 5200,
    workZoneEveryMs: 8000,
    lighting: 'golden'
  }
];

export const TOTAL_DISTANCE = STAGES.reduce((sum, stage) => sum + stage.length, 0);

export function weightedPick<T>(entries: Array<[T, number]>, rand: () => number = Math.random): T {
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = rand() * total;

  for (const [value, weight] of entries) {
    roll -= weight;
    if (roll <= 0) {
      return value;
    }
  }

  return entries[entries.length - 1][0];
}
