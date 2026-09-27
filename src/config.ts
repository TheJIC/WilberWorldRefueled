// Logical game resolution. Everything is authored in these units; the camera
// zooms to fill the window (see GameViewport) so pixels stay crisp at any size.
export const W = 360;
export const H = 640;

// Four northbound lanes. The asphalt spans ROAD_LEFT..ROAD_RIGHT.
export const LANE_W = 44;
export const LANE_COUNT = 4;
export const ROAD_LEFT = 92;
export const ROAD_RIGHT = ROAD_LEFT + LANE_W * LANE_COUNT;
export const LANE_X = Array.from({ length: LANE_COUNT }, (_, i) => ROAD_LEFT + LANE_W * i + LANE_W / 2);

// Roadside strips where scenery props live.
export const SIDE_LEFT = { min: 18, max: ROAD_LEFT - 16 };
export const SIDE_RIGHT = { min: ROAD_RIGHT + 16, max: W - 8 };

export const CHUNK_H = 320;

export const PLAYER = {
  startY: 520,
  minY: 150,
  maxY: H - 40,
  steerSpeed: 175,
  steerAccel: 1500,
  upSpeed: 150,
  downSpeed: 200,
  maxTilt: 9,
  hitboxW: 18,
  hitboxH: 40,
  invulnerableMs: 1600,
  maxLives: 5,
  startLives: 3
};

export const FUEL = {
  max: 100,
  drainPerSecond: 2.6,
  canAmount: 35,
  checkpointAmount: 45,
  lowThreshold: 25
};

export const HONK_COOLDOWN_MS = 900;
export const NEAR_MISS_GAP = 9;
export const COMBO_WINDOW_MS = 3200;

export const DEPTH = {
  ground: 0,
  decal: 4,
  pickup: 8,
  traffic: 10,
  player: 12,
  props: 14,
  fx: 20,
  tint: 30,
  lights: 32,
  hud: 50,
  popup: 60,
  touch: 70,
  overlay: 100
};

export const COLORS = {
  white: 0xffffff,
  cream: 0xfff4d6,
  yellow: 0xffd23f,
  orange: 0xff8a1f,
  red: 0xff3b3b,
  cherry: 0xe0243a,
  green: 0x6ee06a,
  cyan: 0x5ce1ff,
  blue: 0x3b7bff,
  purple: 0xb266ff,
  grey: 0x9aa3b5,
  dark: 0x0b0d16,
  ink: 0x151826
};

export const STORAGE_KEYS = {
  best: 'wwr.best',
  muted: 'wwr.muted'
};
