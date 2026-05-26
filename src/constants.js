export const GAME_WIDTH = 1080;
export const GAME_HEIGHT = 1920;

export const LANES = [238, 398, 568, 728];
export const POWERUP_LANES = [285, 445, 610, 775];
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
export const START_DELAY = 7000;
export const PLAYER_SPEED_X = 600;
export const PLAYER_SPEED_UP = 500;
export const PLAYER_SPEED_DOWN = 700;
export const HIT_INVULNERABILITY = 1200;
export const PIXEL_FONT = '"Press Start 2P", "Courier New", monospace';

export function artPath(name) {
  return `/art/${name}`;
}

export function soundPath(name) {
  return `/sounds/${name}`;
}
