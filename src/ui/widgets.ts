import Phaser from 'phaser';
import { PIXEL_FONT } from './pixelFont';

export interface OutlineStyle {
  top: number;
  bottom: number;
  outline?: number;
  shadow?: number;
  thickness?: number;
}

/**
 * Chunky arcade lettering: a gradient-tinted bitmap text with a solid pixel
 * outline (eight offset copies) and a hard drop shadow.
 */
export function outlinedText(scene: Phaser.Scene, x: number, y: number, text: string, size: number, style: OutlineStyle): Phaser.GameObjects.Container {
  const t = style.thickness ?? Math.max(1, Math.round(size / 16));
  const outline = style.outline ?? 0x14101f;
  const parts: Phaser.GameObjects.BitmapText[] = [];

  if (style.shadow !== undefined) {
    parts.push(scene.add.bitmapText(t * 2, t * 3, PIXEL_FONT, text, size).setOrigin(0.5).setTint(style.shadow));
  }

  for (let dx = -t; dx <= t; dx += t) {
    for (let dy = -t; dy <= t; dy += t) {
      if (dx !== 0 || dy !== 0) {
        parts.push(scene.add.bitmapText(dx, dy, PIXEL_FONT, text, size).setOrigin(0.5).setTint(outline));
      }
    }
  }

  parts.push(scene.add.bitmapText(0, 0, PIXEL_FONT, text, size)
    .setOrigin(0.5)
    .setTint(style.top, style.top, style.bottom, style.bottom));

  return scene.add.container(x, y, parts);
}

export interface Button {
  container: Phaser.GameObjects.Container;
  setSelected(selected: boolean): void;
}

export function textButton(scene: Phaser.Scene, x: number, y: number, label: string, width: number, onClick: () => void): Button {
  const bg = scene.add.rectangle(0, 0, width, 22, 0x141827, 0.92).setStrokeStyle(2, 0xf2efe4);
  const text = scene.add.bitmapText(0, 0, PIXEL_FONT, label, 8).setOrigin(0.5);
  const container = scene.add.container(x, y, [bg, text]);

  bg.setInteractive({ useHandCursor: true });
  bg.on(Phaser.Input.Events.POINTER_OVER, () => setSelected(true));
  bg.on(Phaser.Input.Events.POINTER_OUT, () => setSelected(false));
  bg.on(Phaser.Input.Events.POINTER_UP, onClick);

  function setSelected(selected: boolean): void {
    bg.setFillStyle(selected ? 0xffd23f : 0x141827, 0.92);
    text.setTint(selected ? 0x141827 : 0xffffff);
  }

  return { container, setSelected };
}
