import Phaser from 'phaser';
import { CHUNK_H, DEPTH, H, ROAD_LEFT, ROAD_RIGHT, W } from '../config';
import { PropDef, PropLayer, THEMES, ThemeKey } from '../data';
import { CHUNK_VARIANTS, chunkKey, transitionKey } from '../gfx/textures';
import { PIXEL_FONT } from '../ui/pixelFont';

interface Prop {
  image: Phaser.GameObjects.Image;
  glow?: Phaser.GameObjects.Image;
}

interface Gantry {
  container: Phaser.GameObjects.Container;
  shadow: Phaser.GameObjects.Rectangle;
  bottom: number;
}

type StreamKind = PropLayer | 'lamp';

interface Stream {
  side: 0 | 1;
  kind: StreamKind;
  distance: number;
  next: number;
}

const TRANSITION_SEAM_OFFSET = 144; // seam within a transition chunk (see buildRoadChunk)

// Horizontal bands of each roadside strip (left side; the right mirrors it).
const INNER_BAND = { min: 40, max: ROAD_LEFT - 18 };

/**
 * The scrolling highway: three stacked road chunks recycled from the bottom
 * to the top, layered roadside scenery, and overhead gantry signs. Everything
 * moves down by the same `dy` each frame, which is how the player "drives north".
 */
export class Road {
  private readonly chunks: Phaser.GameObjects.Image[] = [];
  private readonly props: Prop[] = [];
  private readonly gantries: Gantry[] = [];
  private readonly streams: Stream[] = [];
  private theme: ThemeKey;
  private nextTheme: ThemeKey | null = null;
  private propTheme: ThemeKey;
  private seamY: number | null = null;
  private seamTheme: ThemeKey | null = null;
  private variant = 0;
  nightAmount = 0;

  constructor(private readonly scene: Phaser.Scene, theme: ThemeKey) {
    this.theme = theme;
    this.propTheme = theme;

    for (let i = 0; i < 3; i++) {
      const chunk = scene.add.image(0, H - CHUNK_H * (i + 1), chunkKey(theme, i % CHUNK_VARIANTS))
        .setOrigin(0)
        .setDepth(DEPTH.ground);
      this.chunks.push(chunk);
    }

    for (const side of [0, 1] as const) {
      for (const kind of ['outer', 'inner', 'lamp'] as const) {
        this.streams.push({ side, kind, distance: 0, next: Phaser.Math.Between(0, 60) });
      }
    }

    // Populate the visible roadside so the first frame isn't bare.
    for (let y = H + 40; y > -40; y -= 4) {
      this.stepProps(4, y);
    }
  }

  get currentTheme(): ThemeKey {
    return this.theme;
  }

  /** The next chunk that scrolls in will blend into the new theme. */
  changeTheme(theme: ThemeKey): void {
    if (theme !== this.theme) {
      this.nextTheme = theme;
    }
  }

  update(dy: number): void {
    for (const chunk of this.chunks) {
      chunk.y += dy;
    }

    for (const chunk of this.chunks) {
      if (chunk.y >= H) {
        const top = Math.min(...this.chunks.map((c) => c.y));
        chunk.y = top - CHUNK_H;
        chunk.setTexture(this.nextChunkTexture(chunk.y));
      }
    }

    if (this.seamY !== null) {
      this.seamY += dy;
      if (this.seamY > H + 120) {
        this.seamY = null;
        this.propTheme = this.seamTheme ?? this.propTheme;
        this.seamTheme = null;
      }
    }

    for (let i = this.props.length - 1; i >= 0; i--) {
      const prop = this.props[i];
      prop.image.y += dy;
      if (prop.glow) {
        prop.glow.y += dy;
        prop.glow.setAlpha(0.5 * this.nightAmount);
      }
      if (prop.image.y - prop.image.displayHeight / 2 > H + 8) {
        prop.image.destroy();
        prop.glow?.destroy();
        this.props.splice(i, 1);
      }
    }

    for (let i = this.gantries.length - 1; i >= 0; i--) {
      const gantry = this.gantries[i];
      gantry.container.y += dy;
      gantry.shadow.y += dy;
      if (gantry.container.y - gantry.bottom > H + 40) {
        gantry.container.destroy();
        gantry.shadow.destroy();
        this.gantries.splice(i, 1);
      }
    }

    this.stepProps(dy, -8);
  }

  private nextChunkTexture(top: number): string {
    if (this.nextTheme) {
      const from = this.theme;
      const to = this.nextTheme;
      this.theme = to;
      this.nextTheme = null;
      this.seamY = top + TRANSITION_SEAM_OFFSET;
      this.seamTheme = to;
      return transitionKey(from, to);
    }

    this.variant = (this.variant + 1) % CHUNK_VARIANTS;
    return chunkKey(this.theme, this.variant);
  }

  private themeAt(y: number): ThemeKey {
    if (this.seamY !== null && this.seamTheme && y < this.seamY) {
      return this.seamTheme;
    }
    return this.propTheme;
  }

  private stepProps(dy: number, spawnBottom: number): void {
    for (const stream of this.streams) {
      stream.distance += dy;
      if (stream.distance < stream.next) {
        continue;
      }

      const theme = THEMES[this.themeAt(spawnBottom)];
      let height = 0;
      let gap: [number, number];

      if (stream.kind === 'lamp') {
        if (theme.lampGap) {
          height = this.spawnLamp(stream.side, spawnBottom);
          gap = [theme.lampGap - 10, theme.lampGap + 10];
        } else {
          gap = [80, 120];
        }
      } else {
        const defs = stream.kind === 'outer' ? theme.outer : theme.inner;
        height = this.spawnProp(stream.side, stream.kind, defs, spawnBottom);
        gap = stream.kind === 'outer' ? theme.outerGap : theme.innerGap;
      }

      stream.distance = 0;
      stream.next = height + Phaser.Math.Between(gap[0], gap[1]);
    }
  }

  private spawnProp(side: 0 | 1, layer: PropLayer, defs: PropDef[], bottom: number): number {
    const available = defs.filter((def) => this.scene.textures.exists(def.key));
    if (available.length === 0) {
      return 20;
    }

    const def = this.pickProp(available);
    const image = this.scene.add.image(0, 0, def.key).setDepth(DEPTH.props);
    const half = image.width / 2;
    const building = def.key.startsWith('prop_building');
    let x: number;

    if (layer === 'outer') {
      // Hug the screen edge; big things may crop a little off-screen.
      const crop = building ? 10 : Math.min(6, half * 0.3);
      x = half - crop + Phaser.Math.Between(0, building ? 0 : 5);
    } else {
      const lo = INNER_BAND.min + half * 0.5;
      const hi = INNER_BAND.max - half;
      x = Phaser.Math.Between(Math.floor(Math.min(lo, hi)), Math.floor(Math.max(lo, hi)));
    }

    if (side === 1) {
      x = W - x;
    }

    if (!building && Math.random() < 0.5) {
      image.setFlipX(true);
    }

    image.setPosition(Math.round(x), Math.round(bottom - image.height / 2));
    this.props.push({ image });
    return image.height;
  }

  private spawnLamp(side: 0 | 1, bottom: number): number {
    const x = side === 0 ? ROAD_LEFT - 8 : ROAD_RIGHT + 8;
    const image = this.scene.add.image(x, bottom - 4, 'prop_streetlamp')
      .setDepth(DEPTH.props + 1)
      .setFlipX(side === 1);
    const headX = side === 0 ? x + 10 : x - 10;
    const glow = this.scene.add.image(headX, image.y, 'fx_softglow')
      .setDepth(DEPTH.lights)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xffd98a)
      .setScale(1.15)
      .setAlpha(0);

    this.props.push({ image, glow });
    return image.height;
  }

  private pickProp(defs: PropDef[]): PropDef {
    const total = defs.reduce((s, d) => s + d.weight, 0);
    let roll = Math.random() * total;
    for (const def of defs) {
      roll -= def.weight;
      if (roll <= 0) {
        return def;
      }
    }
    return defs[defs.length - 1];
  }

  /**
   * An overhead sign gantry spanning the highway, like the green signs on the
   * original game's roadside. It passes over the cars.
   */
  spawnGantry(title: string, subtitle: string, color = 0x1f7a3f): void {
    const scene = this.scene;
    const left = ROAD_LEFT - 20;
    const right = ROAD_RIGHT + 20;
    const width = right - left;
    const panelW = Math.max(title.length, subtitle.length) * 8 + 16;
    const panelH = subtitle ? 28 : 18;
    const items: Phaser.GameObjects.GameObject[] = [];

    items.push(
      scene.add.rectangle(left, 0, width, 5, 0x7a8294).setOrigin(0, 0.5).setStrokeStyle(1, 0x2b2f3a),
      scene.add.rectangle(left, 0, 8, 8, 0x4a505e).setStrokeStyle(1, 0x1b1d28),
      scene.add.rectangle(right, 0, 8, 8, 0x4a505e).setStrokeStyle(1, 0x1b1d28),
      scene.add.rectangle(W / 2, 0, panelW, panelH, color).setStrokeStyle(2, 0xf2f2ea),
      scene.add.bitmapText(W / 2, subtitle ? -10 : -4, PIXEL_FONT, title, 8).setOrigin(0.5, 0).setTint(0xffffff)
    );

    if (subtitle) {
      items.push(scene.add.bitmapText(W / 2, 2, PIXEL_FONT, subtitle, 8).setOrigin(0.5, 0).setTint(0xffe45c));
    }

    const container = scene.add.container(0, -40, items).setDepth(DEPTH.props + 2);
    const shadow = scene.add.rectangle(W / 2 + 4, -40 + 12, panelW, panelH, 0x000000, 0.25).setDepth(DEPTH.decal);
    this.gantries.push({ container, shadow, bottom: panelH / 2 });
  }
}
