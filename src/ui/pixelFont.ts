import Phaser from 'phaser';

export const PIXEL_FONT = 'pixel';
const FONT_FAMILY = '"Press Start 2P"';
const CELL = 8;
const CHARS_PER_ROW = 16;

export async function waitForFontFace(): Promise<void> {
  if (!document.fonts?.load) {
    return;
  }

  await Promise.race([
    document.fonts.load(`8px ${FONT_FAMILY}`),
    new Promise((resolve) => setTimeout(resolve, 3000))
  ]);
}

/**
 * Rasterises Press Start 2P into an 8x8 grid with hard-thresholded alpha and
 * registers it as a retro bitmap font. Bitmap text never blurs and tints
 * cleanly, which a browser-rendered Text object can't guarantee when zoomed.
 */
export function registerPixelFont(scene: Phaser.Scene): void {
  if (scene.cache.bitmapFont.exists(PIXEL_FONT)) {
    return;
  }

  const chars = Phaser.GameObjects.RetroFont.TEXT_SET1;
  const rows = Math.ceil(chars.length / CHARS_PER_ROW);

  // Press Start 2P is drawn on an 8x8 grid. Rendering at 8px lets the browser
  // antialias it off-grid, so draw each glyph at 4x (one design pixel = 4x4
  // device pixels, baseline at the bottom of the cell) and sample the centre
  // of every design pixel instead.
  const SCALE = 4;
  const big = document.createElement('canvas');
  big.width = CELL * SCALE;
  big.height = CELL * SCALE;
  const bigCtx = big.getContext('2d', { willReadFrequently: true });

  const canvas = document.createElement('canvas');
  canvas.width = CELL * CHARS_PER_ROW;
  canvas.height = CELL * rows;
  const ctx = canvas.getContext('2d');

  if (!bigCtx || !ctx) {
    throw new Error('Canvas 2D unavailable for font rasterising');
  }

  bigCtx.fillStyle = '#ffffff';
  bigCtx.font = `${CELL * SCALE}px ${FONT_FAMILY}`;
  bigCtx.textBaseline = 'alphabetic';
  const out = ctx.createImageData(canvas.width, canvas.height);

  for (let i = 0; i < chars.length; i++) {
    bigCtx.clearRect(0, 0, big.width, big.height);
    bigCtx.fillText(chars[i], 0, big.height);
    const glyph = bigCtx.getImageData(0, 0, big.width, big.height).data;
    const cellX = (i % CHARS_PER_ROW) * CELL;
    const cellY = Math.floor(i / CHARS_PER_ROW) * CELL;

    for (let gy = 0; gy < CELL; gy++) {
      for (let gx = 0; gx < CELL; gx++) {
        const sx = gx * SCALE + SCALE / 2;
        const sy = gy * SCALE + SCALE / 2;
        if (glyph[(sy * big.width + sx) * 4 + 3] > 127) {
          const o = ((cellY + gy) * canvas.width + cellX + gx) * 4;
          out.data[o] = 255;
          out.data[o + 1] = 255;
          out.data[o + 2] = 255;
          out.data[o + 3] = 255;
        }
      }
    }
  }

  ctx.putImageData(out, 0, 0);
  scene.textures.addCanvas(PIXEL_FONT, canvas);

  const entry = Phaser.GameObjects.RetroFont.Parse(scene, {
    image: PIXEL_FONT,
    width: CELL,
    height: CELL,
    chars,
    charsPerRow: CHARS_PER_ROW,
    'spacing.x': 0,
    'spacing.y': 0,
    'offset.x': 0,
    'offset.y': 0,
    lineSpacing: 4
  });

  scene.cache.bitmapFont.add(PIXEL_FONT, entry);
}
