import Phaser from 'phaser';
import { H, W } from '../config';
import { PROP_FILES } from '../data';
import { buildAllRoadChunks, buildArrivalRoad, buildEffectTextures } from '../gfx/textures';
import { PIXEL_FONT, registerPixelFont } from '../ui/pixelFont';
import { fitCamera } from '../viewport';

const CARS = ['hero', 'sedan', 'sedan_teal', 'sky', 'hatch', 'taxi', 'pickup', 'van', 'police', 'muscle', 'semi'];
const ITEMS: Array<[string, string]> = [
  ['item_coin', 'coin'],
  ['item_fuel', 'fuel'],
  ['item_wrench', 'wrench'],
  ['item_shield', 'shield'],
  ['item_nitro', 'nitro'],
  ['hazard_cone', 'cone'],
  ['hazard_barrier', 'barrier'],
  ['hazard_oil', 'oil']
];
const GROUND = ['meadow', 'desert', 'city', 'parkway', 'edge_meadow_desert', 'edge_desert_city', 'edge_city_parkway'];
const AUDIO: Array<[string, string]> = [
  ['music_game', 'game.mp3'],
  ['music_win', 'win.mp3'],
  ['sfx_horn', 'horn.mp3'],
  ['sfx_explosion', 'explosion.mp3'],
  ['sfx_dead', 'dead.mp3'],
  ['sfx_accelerate', 'accelerate.mp3']
];

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload(): void {
    fitCamera(this);
    registerPixelFont(this);

    this.add.bitmapText(W / 2, H / 2 - 16, PIXEL_FONT, 'LOADING', 8).setOrigin(0.5);
    this.add.rectangle(W / 2, H / 2 + 4, 162, 10, 0x1b1d28).setStrokeStyle(1, 0xf2efe4);
    const bar = this.add.rectangle(W / 2 - 80, H / 2 + 4, 0, 6, 0xffd23f).setOrigin(0, 0.5);
    this.load.on(Phaser.Loader.Events.PROGRESS, (value: number) => {
      bar.width = 160 * value;
    });

    for (const car of CARS) {
      this.load.image(`car_${car}`, `art/cars/${car}.png`);
    }

    for (const [key, file] of ITEMS) {
      this.load.image(key, `art/items/${file}.png`);
    }

    for (const ground of GROUND) {
      const key = ground.startsWith('edge_') ? ground : `ground_${ground}`;
      this.load.image(key, `art/ground/${ground}.png`);
    }

    for (const prop of PROP_FILES) {
      this.load.image(`prop_${prop}`, `art/props/${prop}.png`);
    }

    this.load.image('sign_welcome', 'art/sign_welcome.png');

    for (const [key, file] of AUDIO) {
      this.load.audio(key, `audio/${file}`);
    }
  }

  create(): void {
    buildEffectTextures(this);
    buildAllRoadChunks(this);
    buildArrivalRoad(this);
    this.scene.start('Title');
  }
}
