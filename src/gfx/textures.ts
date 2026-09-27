import Phaser from 'phaser';
import { CHUNK_H, LANE_COUNT, LANE_W, ROAD_LEFT, ROAD_RIGHT, W } from '../config';
import { THEMES, ThemeDef, ThemeKey } from '../data';

// Procedural textures: road chunks assembled from the PixelLab ground tiles,
// plus small effect sprites and HUD icons drawn pixel-by-pixel.

const RAIL_W = 4;
const SHOULDER_W = 10;
const TILE = 32;

type Ctx = CanvasRenderingContext2D;

function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(width: number, height: number): [HTMLCanvasElement, Ctx] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D unavailable');
  }

  ctx.imageSmoothingEnabled = false;
  return [canvas, ctx];
}

function sourceImage(scene: Phaser.Scene, key: string): CanvasImageSource {
  return scene.textures.get(key).getSourceImage() as CanvasImageSource;
}

function addCanvasTexture(scene: Phaser.Scene, key: string, canvas: HTMLCanvasElement): void {
  if (scene.textures.exists(key)) {
    scene.textures.remove(key);
  }

  scene.textures.addCanvas(key, canvas);
}

// ---------------------------------------------------------------------------
// Ground detail sprinkles so the repeating PixelLab tile doesn't look stamped.

function sprinkleGround(ctx: Ctx, theme: ThemeKey, rand: () => number, y0: number, y1: number): void {
  const count = Math.floor((y1 - y0) * 0.9);

  for (let i = 0; i < count; i++) {
    const side = rand() < 0.5 ? 0 : 1;
    const x = side === 0
      ? Math.floor(rand() * (ROAD_LEFT - RAIL_W - SHOULDER_W - 2))
      : Math.floor(ROAD_RIGHT + RAIL_W + SHOULDER_W + 2 + rand() * (W - ROAD_RIGHT - RAIL_W - SHOULDER_W - 2));
    const y = Math.floor(y0 + rand() * (y1 - y0));
    const roll = rand();

    switch (theme) {
      case 'meadow':
        if (roll < 0.5) {
          ctx.fillStyle = '#3a9c14';
          ctx.fillRect(x, y, 1, 2);
          ctx.fillRect(x + 2, y + 1, 1, 2);
        } else if (roll < 0.62) {
          ctx.fillStyle = rand() < 0.5 ? '#ffe45c' : '#ffffff';
          ctx.fillRect(x, y, 1, 1);
        } else if (roll < 0.8) {
          ctx.fillStyle = '#62cc2c';
          ctx.fillRect(x, y, 2, 1);
        }
        break;
      case 'desert':
        if (roll < 0.35) {
          ctx.fillStyle = '#c96f12';
          ctx.fillRect(x, y, 2, 1);
        } else if (roll < 0.5) {
          ctx.fillStyle = '#ffc163';
          ctx.fillRect(x, y, 1, 1);
        }
        break;
      case 'city':
        if (roll < 0.08) {
          ctx.fillStyle = 'rgba(20,20,30,0.35)';
          ctx.fillRect(x, y, 3, 2);
        }
        break;
      case 'parkway':
        if (roll < 0.3) {
          const colors = ['#ff7eb6', '#ffffff', '#ffe45c', '#b98cff'];
          ctx.fillStyle = colors[Math.floor(rand() * colors.length)];
          ctx.fillRect(x, y, 1, 1);
        } else if (roll < 0.6) {
          ctx.fillStyle = '#3aa31c';
          ctx.fillRect(x, y, 1, 2);
        }
        break;
    }
  }
}

function drawGroundRows(ctx: Ctx, tile: CanvasImageSource, y0: number, y1: number): void {
  for (let y = y0; y < y1; y += TILE) {
    for (let x = 0; x < W; x += TILE) {
      ctx.drawImage(tile, x, y);
    }
  }
}

function speckle(ctx: Ctx, rand: () => number, x0: number, x1: number, y0: number, y1: number, colors: string[], density: number): void {
  const count = Math.floor((x1 - x0) * (y1 - y0) * density);

  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colors[Math.floor(rand() * colors.length)];
    ctx.fillRect(Math.floor(x0 + rand() * (x1 - x0)), Math.floor(y0 + rand() * (y1 - y0)), 1, 1);
  }
}

function drawRoad(ctx: Ctx, theme: ThemeDef, rand: () => number, y0: number, y1: number): void {
  const h = y1 - y0;
  const railL = ROAD_LEFT - SHOULDER_W - RAIL_W;
  const railR = ROAD_RIGHT + SHOULDER_W;

  // Shoulders
  ctx.fillStyle = hex(theme.shoulder);
  ctx.fillRect(ROAD_LEFT - SHOULDER_W, y0, SHOULDER_W, h);
  ctx.fillRect(ROAD_RIGHT, y0, SHOULDER_W, h);

  // Asphalt with speckle and tyre wear
  ctx.fillStyle = hex(theme.asphalt);
  ctx.fillRect(ROAD_LEFT, y0, ROAD_RIGHT - ROAD_LEFT, h);
  speckle(ctx, rand, ROAD_LEFT - SHOULDER_W, ROAD_RIGHT + SHOULDER_W, y0, y1, [hex(theme.asphaltDark), hex(theme.asphaltLight)], 0.06);

  ctx.fillStyle = 'rgba(0,0,0,0.10)';
  for (let lane = 0; lane < LANE_COUNT; lane++) {
    const cx = ROAD_LEFT + LANE_W * lane + LANE_W / 2;
    ctx.fillRect(cx - 12, y0, 5, h);
    ctx.fillRect(cx + 7, y0, 5, h);
  }

  // Edge lines
  ctx.fillStyle = hex(theme.edgeLeft);
  ctx.fillRect(ROAD_LEFT + 2, y0, 2, h);
  ctx.fillStyle = hex(theme.edgeRight);
  ctx.fillRect(ROAD_RIGHT - 4, y0, 2, h);

  // Dashed lane dividers (period 32 so chunks tile seamlessly)
  ctx.fillStyle = hex(theme.laneLine);
  for (let lane = 1; lane < LANE_COUNT; lane++) {
    const x = ROAD_LEFT + LANE_W * lane - 1;
    for (let y = y0; y < y1; y++) {
      if (y % 32 < 16) {
        ctx.fillRect(x, y, 2, 1);
      }
    }
  }

  if (theme.rail === 'guardrail') {
    for (const x of [railL, railR]) {
      ctx.fillStyle = '#2b2f3a';
      ctx.fillRect(x, y0, 1, h);
      ctx.fillRect(x + 3, y0, 1, h);
      ctx.fillStyle = '#d7dde6';
      ctx.fillRect(x + 1, y0, 1, h);
      ctx.fillStyle = '#a4acb9';
      ctx.fillRect(x + 2, y0, 1, h);

      for (let y = y0; y < y1; y++) {
        if (y % 32 < 3) {
          ctx.fillStyle = '#3d4250';
          ctx.fillRect(x - 1, y, 6, 1);
        }
      }
    }
    // Rail shadows on the shoulder
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(railL + RAIL_W, y0, 2, h);
    ctx.fillRect(railR + RAIL_W, y0, 1, h);
  } else {
    // City curb: light kerb stones with seams
    for (const x of [railL, railR]) {
      ctx.fillStyle = '#b9bdc8';
      ctx.fillRect(x, y0, RAIL_W, h);
      ctx.fillStyle = '#8b909c';
      ctx.fillRect(x + (x === railL ? RAIL_W - 1 : 0), y0, 1, h);
      for (let y = y0; y < y1; y++) {
        if (y % 16 === 0) {
          ctx.fillStyle = '#6f7480';
          ctx.fillRect(x, y, RAIL_W, 1);
        }
      }
    }
  }
}

export interface ChunkRecipe {
  key: string;
  theme: ThemeKey;
  from?: ThemeKey;
  edgeTile?: string;
  seed: number;
}

/**
 * A 360x320 slice of highway. Transition chunks put the new theme on the north
 * (top) half, the old theme on the south half, and the PixelLab Wang edge tile
 * on the seam so terrain changes look authored rather than cut.
 */
export function buildRoadChunk(scene: Phaser.Scene, recipe: ChunkRecipe): void {
  const [canvas, ctx] = makeCanvas(W, CHUNK_H);
  const rand = mulberry32(recipe.seed);
  const theme = THEMES[recipe.theme];

  if (recipe.from && recipe.edgeTile) {
    const seamY = TILE * 4;
    const oldTheme = THEMES[recipe.from];
    drawGroundRows(ctx, sourceImage(scene, theme.ground), 0, seamY);
    drawGroundRows(ctx, sourceImage(scene, recipe.edgeTile), seamY, seamY + TILE);
    drawGroundRows(ctx, sourceImage(scene, oldTheme.ground), seamY + TILE, CHUNK_H);
    sprinkleGround(ctx, recipe.theme, rand, 0, seamY);
    sprinkleGround(ctx, recipe.from, rand, seamY + TILE, CHUNK_H);

    const joint = seamY + TILE / 2;
    drawRoad(ctx, theme, rand, 0, joint);
    drawRoad(ctx, oldTheme, rand, joint, CHUNK_H);

    // Expansion joint across the carriageway where the road surface changes.
    ctx.fillStyle = '#1d1f27';
    ctx.fillRect(ROAD_LEFT - SHOULDER_W, joint - 1, ROAD_RIGHT - ROAD_LEFT + SHOULDER_W * 2, 2);
    ctx.fillStyle = '#8a8f9c';
    ctx.fillRect(ROAD_LEFT - SHOULDER_W, joint + 1, ROAD_RIGHT - ROAD_LEFT + SHOULDER_W * 2, 1);
  } else {
    drawGroundRows(ctx, sourceImage(scene, theme.ground), 0, CHUNK_H);
    sprinkleGround(ctx, recipe.theme, rand, 0, CHUNK_H);
    drawRoad(ctx, theme, rand, 0, CHUNK_H);
  }

  addCanvasTexture(scene, recipe.key, canvas);
}

export const EDGE_TILES: Partial<Record<string, string>> = {
  'meadow>desert': 'edge_meadow_desert',
  'desert>city': 'edge_desert_city',
  'city>parkway': 'edge_city_parkway'
};

export function chunkKey(theme: ThemeKey, variant: number): string {
  return `chunk_${theme}_${variant}`;
}

export function transitionKey(from: ThemeKey, to: ThemeKey): string {
  return `chunk_${from}_to_${to}`;
}

export const CHUNK_VARIANTS = 3;

export function buildAllRoadChunks(scene: Phaser.Scene): void {
  const themes = Object.keys(THEMES) as ThemeKey[];

  themes.forEach((theme, t) => {
    for (let v = 0; v < CHUNK_VARIANTS; v++) {
      buildRoadChunk(scene, { key: chunkKey(theme, v), theme, seed: 1000 + t * 97 + v * 13 });
    }
  });

  for (const pair of Object.keys(EDGE_TILES)) {
    const [from, to] = pair.split('>') as [ThemeKey, ThemeKey];
    buildRoadChunk(scene, {
      key: transitionKey(from, to),
      theme: to,
      from,
      edgeTile: EDGE_TILES[pair],
      seed: 4242 + from.length * 7 + to.length
    });
  }
}

/** An east-west stretch of the parkway for the arrival cutscene. */
export function buildArrivalRoad(scene: Phaser.Scene): void {
  const x0 = ROAD_LEFT - SHOULDER_W - RAIL_W - 1;
  const band = ROAD_RIGHT + SHOULDER_W + RAIL_W + 1 - x0;
  const length = 384;
  const [vertical, vctx] = makeCanvas(W, length);
  drawRoad(vctx, THEMES.parkway, mulberry32(77), 0, length);

  const [canvas, ctx] = makeCanvas(length, band);
  ctx.translate(0, band);
  ctx.rotate(-Math.PI / 2);
  ctx.drawImage(vertical, x0, 0, band, length, 0, 0, band, length);
  addCanvasTexture(scene, 'road_horizontal', canvas);
}

// ---------------------------------------------------------------------------
// Pixel icons defined as character grids.

function pixelIcon(scene: Phaser.Scene, key: string, rows: string[], palette: Record<string, string>): void {
  const width = Math.max(...rows.map((r) => r.length));
  const [canvas, ctx] = makeCanvas(width, rows.length);

  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const color = palette[ch];
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
      }
    });
  });

  addCanvasTexture(scene, key, canvas);
}

function radialGlow(scene: Phaser.Scene, key: string, size: number, stops: Array<[number, string]>): void {
  const [canvas, ctx] = makeCanvas(size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([at, color]) => g.addColorStop(at, color));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  addCanvasTexture(scene, key, canvas);
}

function headlightCone(scene: Phaser.Scene): void {
  const w = 64;
  const h = 110;
  const [canvas, ctx] = makeCanvas(w, h);
  // Beam fades as it travels up (away from the car at the bottom).
  const grad = ctx.createLinearGradient(0, h, 0, 0);
  grad.addColorStop(0, 'rgba(255,244,200,0.75)');
  grad.addColorStop(0.5, 'rgba(255,240,190,0.28)');
  grad.addColorStop(1, 'rgba(255,240,190,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(w / 2 - 7, h);
  ctx.lineTo(w / 2 + 7, h);
  ctx.lineTo(w, 0);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();
  addCanvasTexture(scene, 'fx_cone', canvas);
}

function shieldBubble(scene: Phaser.Scene): void {
  const w = 42;
  const h = 62;
  const [canvas, ctx] = makeCanvas(w, h);
  const cx = w / 2;
  const cy = h / 2;
  const rx = w / 2 - 1;
  const ry = h / 2 - 1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2;
      if (d <= 1) {
        if (d > 0.82) {
          ctx.fillStyle = 'rgba(160,240,255,0.95)';
        } else if (d > 0.65) {
          ctx.fillStyle = 'rgba(92,225,255,0.45)';
        } else {
          ctx.fillStyle = 'rgba(92,225,255,0.14)';
        }
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  // Specular glint
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillRect(9, 10, 5, 2);
  ctx.fillRect(8, 12, 2, 5);
  addCanvasTexture(scene, 'fx_shield', canvas);
}

export function buildEffectTextures(scene: Phaser.Scene): void {
  const white = '#ffffff';
  pixelIcon(scene, 'px', ['X'], { X: white });
  pixelIcon(scene, 'dot', ['XX', 'XX'], { X: white });
  pixelIcon(scene, 'dot3', ['.X.', 'XXX', '.X.'], { X: white });
  pixelIcon(scene, 'streak', ['X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X'], { X: white });
  pixelIcon(scene, 'skid', ['XXX', 'XXX', 'XXX', 'XXX'], { X: '#15161c' });

  radialGlow(scene, 'fx_glow', 32, [[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,0.45)'], [1, 'rgba(255,255,255,0)']]);
  radialGlow(scene, 'fx_softglow', 64, [[0, 'rgba(255,255,255,0.8)'], [1, 'rgba(255,255,255,0)']]);
  headlightCone(scene);
  shieldBubble(scene);

  const heartPalette = { X: '#1b0f1a', R: '#ff3b54', D: '#b3143a', W: '#ffd0da' };
  pixelIcon(scene, 'icon_heart', [
    '.XX.XX.',
    'XRRXRRX',
    'XWRRRRX',
    'XRRRRDX',
    '.XRRDX.',
    '..XDX..',
    '...X...'
  ], heartPalette);
  pixelIcon(scene, 'icon_heart_empty', [
    '.XX.XX.',
    'XDDXDDX',
    'XD...DX',
    'XD...DX',
    '.XD.DX.',
    '..XDX..',
    '...X...'
  ], { X: '#1b0f1a', D: '#5a3346' });

  pixelIcon(scene, 'icon_pump', [
    'XXXXX..',
    'XWWWX..',
    'XWWWXX.',
    'XRRRX.X',
    'XRRRX.X',
    'XRRRXX.',
    'XRRRX..',
    'XXXXX..'
  ], { X: '#1b0f1a', W: '#cfe8ff', R: '#ff5a3b' });

  pixelIcon(scene, 'icon_flag', [
    'XWBWBW',
    'XBWBWB',
    'XWBWBW',
    'X.....',
    'X.....',
    'X.....'
  ], { X: '#e8e8f0', W: '#ffffff', B: '#1b1d28' });

  pixelIcon(scene, 'icon_carmark', [
    '.RRR.',
    'RWWWR',
    'RRRRR',
    'RKKKR',
    'RRRRR',
    '.R.R.'
  ], { R: '#e0243a', W: '#9fd8ff', K: '#3a1020' });

  pixelIcon(scene, 'icon_warn', [
    '...XX...',
    '..XRRX..',
    '.XRRRRX.',
    'XRRWWRRX',
    'XXXXXXXX'
  ], { X: '#1b0f1a', R: '#ff3b3b', W: '#ffffff' });

  pixelIcon(scene, 'icon_arrow_up', [
    '...XX...',
    '..XWWX..',
    '.XWWWWX.',
    'XWWWWWWX',
    'XXXWWXXX',
    '..XWWX..',
    '..XWWX..',
    '..XXXX..'
  ], { X: '#1b1d28', W: '#ffd23f' });

  pixelIcon(scene, 'icon_honk', [
    '.X...X.',
    'X.X.X.X',
    'X.X.X.X',
    '.X...X.'
  ], { X: '#ffffff' });

  pixelIcon(scene, 'icon_pause', [
    'XX.XX',
    'XX.XX',
    'XX.XX',
    'XX.XX',
    'XX.XX',
    'XX.XX'
  ], { X: '#ffffff' });

  pixelIcon(scene, 'icon_sound_on', [
    '...X.....',
    '..XX..X..',
    'XXXX...X.',
    'XXXX.X.X.',
    'XXXX...X.',
    '..XX..X..',
    '...X.....'
  ], { X: '#ffffff' });

  // Street lamp seen from above: pole cap on the kerb, arm reaching over the road.
  pixelIcon(scene, 'prop_streetlamp', [
    '.XXXX.....................',
    'XGGGGX..............XXXXXX',
    'XGDDGX..............XLLLLX',
    'XGDDGXXXXXXXXXXXXXXXXLWWLX',
    'XGDDGXAAAAAAAAAAAAAAXLWWLX',
    'XGGGGXXXXXXXXXXXXXXXXLLLLX',
    '.XXXX...............XXXXXX'
  ], { X: '#1b1d28', G: '#7a8294', D: '#4a505e', A: '#9aa3b5', L: '#ffe9a8', W: '#ffffff' });

  pixelIcon(scene, 'icon_sound_off', [
    '...X.....',
    '..XX.....',
    'XXXX.X.X.',
    'XXXX..X..',
    'XXXX.X.X.',
    '..XX.....',
    '...X.....'
  ], { X: '#ffffff' });
}

/** Hard-edged panel texture used behind HUD/menus (9-slice-free: drawn at exact size). */
export function panelTexture(scene: Phaser.Scene, key: string, width: number, height: number, fill = '#141827', border = '#f2efe4', shadow = '#05060a'): void {
  const [canvas, ctx] = makeCanvas(width, height);
  ctx.fillStyle = shadow;
  ctx.fillRect(2, 2, width - 2, height - 2);
  ctx.fillStyle = border;
  ctx.fillRect(0, 1, width - 2, height - 4);
  ctx.fillRect(1, 0, width - 4, height - 2);
  ctx.fillStyle = fill;
  ctx.fillRect(2, 2, width - 6, height - 6);
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(2, 2, width - 6, 2);
  addCanvasTexture(scene, key, canvas);
}
