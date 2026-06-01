export const GAME_WIDTH = 1080;
export const GAME_HEIGHT = 1920;

// X coordinates for the center of each drivable highway lane.
export const LANES = [296, 455, 623, 786];

// Enemy vehicle texture keys. Each key maps to assets/art/<key>.png.
export const ENEMY_KEYS = [
  'car1',
  'car2',
  'car3',
  'car4',
  'car5',
  'car6',
  'car7',
  'car8',
  'car9',
  'car10'
];

export const LEVEL_SECONDS = 60;

// The intro countdown and player entrance finish before controls unlock.
export const START_DELAY = 7000;
export const PLAYER_SPEED_X = 600;
export const PLAYER_SPEED_UP = 500;
export const PLAYER_SPEED_DOWN = 700;
export const HIT_INVULNERABILITY = 1200;
export const PIXEL_FONT = '"Press Start 2P", "Courier New", monospace';
export const GAME_MUSIC_VOLUME = 0.45;

const BASE_URL = import.meta.env?.BASE_URL ?? './';

export function artPath(name) {
  return `${BASE_URL}art/${name}`;
}

export function soundPath(name) {
  return `${BASE_URL}sounds/${name}`;
}
