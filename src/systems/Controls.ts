import Phaser from 'phaser';
import { DEPTH, H, W } from '../config';
import { DriveInput } from '../objects/Player';
import { PIXEL_FONT } from '../ui/pixelFont';

export interface ControlHandlers {
  honk(): void;
  pause(): void;
  mute(): void;
}

const HONK_X = W - 44;
const HONK_Y = H - 50;
const HONK_R = 26;
const DRAG_GAIN = 1.25;

export function isTouchDevice(): boolean {
  const params = new URLSearchParams(window.location.search);
  if (params.has('touchControls')) return true;
  if (params.has('desktopControls')) return false;
  return navigator.maxTouchPoints > 0 && (window.matchMedia?.('(pointer: coarse)').matches ?? false);
}

/**
 * Merges keyboard (arrows/WASD), gamepad and touch into one DriveInput.
 * Touch steering is relative: drag anywhere and the car follows your finger's
 * motion, so your thumb never covers the car.
 */
export class Controls {
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly keys: Record<'w' | 'a' | 's' | 'd', Phaser.Input.Keyboard.Key>;
  private dragPointer: number | null = null;
  private lastDrag = { x: 0, y: 0 };
  private drag = { x: 0, y: 0 };
  private readonly touchUi: Phaser.GameObjects.GameObject[] = [];
  private honkButton: Phaser.GameObjects.Arc | null = null;
  private prevPad = { a: false, b: false, start: false };
  touchActive = false;
  enabled = true;

  constructor(private readonly scene: Phaser.Scene, private readonly handlers: ControlHandlers) {
    const keyboard = scene.input.keyboard!;
    this.cursors = keyboard.createCursorKeys();
    this.keys = keyboard.addKeys({ w: 'W', a: 'A', s: 'S', d: 'D' }) as Controls['keys'];
    keyboard.addCapture('SPACE,UP,DOWN,LEFT,RIGHT');

    keyboard.on('keydown-SPACE', (event: KeyboardEvent) => {
      if (!event.repeat && this.enabled) this.handlers.honk();
    });
    keyboard.on('keydown-H', () => this.enabled && this.handlers.honk());
    keyboard.on('keydown-P', () => this.handlers.pause());
    keyboard.on('keydown-ESC', () => this.handlers.pause());
    keyboard.on('keydown-M', () => this.handlers.mute());

    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onPointerUp, this);

    if (isTouchDevice()) {
      this.showTouchUi();
    }
  }

  private showTouchUi(): void {
    if (this.touchActive) {
      return;
    }

    this.touchActive = true;
    const scene = this.scene;
    this.honkButton = scene.add.circle(HONK_X, HONK_Y, HONK_R, 0xffffff, 0.16)
      .setStrokeStyle(2, 0xffffff, 0.6)
      .setDepth(DEPTH.touch);
    const icon = scene.add.image(HONK_X, HONK_Y - 5, 'icon_honk').setScale(2).setDepth(DEPTH.touch + 1);
    const label = scene.add.bitmapText(HONK_X, HONK_Y + 6, PIXEL_FONT, 'HONK', 8).setOrigin(0.5, 0).setDepth(DEPTH.touch + 1);
    this.touchUi.push(this.honkButton, icon, label);
  }

  setTouchUiVisible(visible: boolean): void {
    for (const obj of this.touchUi) {
      (obj as unknown as Phaser.GameObjects.Components.Visible).setVisible(visible);
    }
  }

  private isOnHonk(x: number, y: number): boolean {
    return Phaser.Math.Distance.Between(x, y, HONK_X, HONK_Y) < HONK_R + 8;
  }

  private onPointerDown(pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]): void {
    if (pointer.wasTouch) {
      this.showTouchUi();
    }

    if (!this.enabled || over.length > 0) {
      return;
    }

    if (this.touchActive && this.isOnHonk(pointer.worldX, pointer.worldY)) {
      this.handlers.honk();
      this.honkButton?.setFillStyle(0xffffff, 0.4);
      this.scene.time.delayedCall(120, () => this.honkButton?.setFillStyle(0xffffff, 0.16));
      return;
    }

    if (this.dragPointer === null && (pointer.wasTouch || this.touchActive)) {
      this.dragPointer = pointer.id;
      this.lastDrag = { x: pointer.worldX, y: pointer.worldY };
    }
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.dragPointer) {
      return;
    }
    this.drag.x += (pointer.worldX - this.lastDrag.x) * DRAG_GAIN;
    this.drag.y += (pointer.worldY - this.lastDrag.y) * DRAG_GAIN;
    this.lastDrag = { x: pointer.worldX, y: pointer.worldY };
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id === this.dragPointer) {
      this.dragPointer = null;
    }
  }

  read(): DriveInput {
    let x = 0;
    let y = 0;

    if (this.cursors.left.isDown || this.keys.a.isDown) x -= 1;
    if (this.cursors.right.isDown || this.keys.d.isDown) x += 1;
    if (this.cursors.up.isDown || this.keys.w.isDown) y -= 1;
    if (this.cursors.down.isDown || this.keys.s.isDown) y += 1;

    const pad = this.scene.input.gamepad?.pad1;
    if (pad) {
      const stickX = Math.abs(pad.leftStick.x) > 0.25 ? pad.leftStick.x : 0;
      const stickY = Math.abs(pad.leftStick.y) > 0.25 ? pad.leftStick.y : 0;
      x = Phaser.Math.Clamp(x + stickX + (pad.left ? -1 : 0) + (pad.right ? 1 : 0), -1, 1);
      y = Phaser.Math.Clamp(y + stickY + (pad.up ? -1 : 0) + (pad.down ? 1 : 0), -1, 1);

      const a = pad.A;
      const start = pad.buttons[9]?.pressed ?? false;
      if (a && !this.prevPad.a && this.enabled) this.handlers.honk();
      if (start && !this.prevPad.start) this.handlers.pause();
      this.prevPad = { a, b: pad.B, start };
    }

    const input: DriveInput = { x, y, dragX: this.enabled ? this.drag.x : 0, dragY: this.enabled ? this.drag.y : 0 };
    this.drag.x = 0;
    this.drag.y = 0;
    return input;
  }

  destroy(): void {
    const keyboard = this.scene.input.keyboard;
    keyboard?.removeAllListeners();
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onPointerUp, this);
  }
}
