# Wilber World: Refueled

A modern remake of [Wilber World](https://github.com/TheJIC/WilberWorld): a portrait, top-down highway
dash to Wilber World, rebuilt with 16-bit pixel art in Phaser 4 + TypeScript.

## Run locally

```sh
npm install
npm run dev
```

Open the Vite URL shown in the terminal. `npm run build` type-checks and produces a static site in `dist/`.

## How to play

Drive four stages to reach Wilber World, then enjoy the arrival.

| Stage | Setting | New twist |
| --- | --- | --- |
| 1. Sunny Suburbs | Daytime meadow | Warm-up traffic |
| 2. Dusty Desert | Sunset | Oil slicks, semi trucks |
| 3. Neon Night City | Night, street lights | Police coming up from behind, road-work lane closures |
| 4. Wilber World Parkway | Golden hour | Everything, faster |

- **Fuel** drains while you drive. Grab red fuel cans; running dry costs a life. Each stage clear refills 45%.
- **Near misses** (squeezing past a car) score points and build a combo.
- **Honk** at the car ahead and it will signal and move over (or speed up if boxed in).
- **Power-ups:** shield (smash through traffic), nitro (boost + invincible), wrench (+1 life), coins.
- Three lives; the best score is saved in the browser.

### Controls

| | Keyboard | Touch | Gamepad |
| --- | --- | --- | --- |
| Steer / speed | Arrows or WASD | Drag anywhere | Left stick / D-pad |
| Honk | Space (or H) | HONK button | A |
| Pause | P / Esc | Pause button (top right) | Start |
| Mute | M | Pause menu | |

Add `?touchControls` or `?desktopControls` to the URL to force a control scheme.

## Project layout

```
src/
  main.ts            game config (WebGL, smoothPixelArt, DPR-aware canvas)
  viewport.ts        letterboxed 360x640 camera that fills any window crisply
  config.ts          tuning constants (lanes, player, fuel, depths)
  data.ts            vehicles, themes, props and the four stage definitions
  scenes/            Preload, Title, Play (gameplay), Arrival (ending)
  systems/           Road (chunks, scenery, gantries), Traffic, Items, Lighting, Controls
  objects/Player.ts  the cherry red hero car
  gfx/               procedural textures (road chunks, icons) and Effects (particles)
  audio/sfx.ts       tiny WebAudio chiptune synth for the new sound effects
  ui/                HUD, pixel bitmap font, widgets, DOM finale overlay
public/
  art/               PixelLab-generated sprites, tiles and props
  audio/             music and sounds from the original game
```

## Art & audio

- Cars, pickups, hazards, scenery, ground tilesets and the welcome sign were generated with
  [PixelLab](https://www.pixellab.ai) using the hero car as a style reference, then trimmed.
  Road surfaces, markings, guardrails, street lamps and HUD icons are drawn procedurally
  (`src/gfx/textures.ts`) so they tile perfectly.
- Stage-to-stage terrain seams use chained PixelLab Wang tilesets (grass → sand → pavement → lawn).
- Music, horn, explosion and engine sounds are carried over from the original game, and the
  countdown keeps the original's timing against `game.mp3`. The ending reveals the original
  hand-painted Wilber World banner.
