import Phaser from 'phaser';
import { ENEMY_KEYS, GAME_HEIGHT, GAME_WIDTH, LANES, PIXEL_FONT } from '../constants.js';

const ROAD_SCROLL_SPEED = 18;
const OVERLAY_DEPTH = 20;
const ENEMY_DEPTH = 5;
const TITLE_OVERLAY_ALPHA = 0.25;
const PROMPT_Y = 1000;
const PROMPT_GAP = 38;
const PROMPT_OFFSET_X = 7;
const SPACE_BAR_SCALE = 1.25;
const SPACE_BAR_Y_OFFSET = 22;
const ENEMY_SPAWN_DELAY = 1000;
const ENEMY_SPAWN_Y = -350;
const ENEMY_CLEANUP_Y = GAME_HEIGHT + 500;
const ENEMY_SCALE = 0.8;

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create() {
    this.starting = false;

    // The title screen reuses the gameplay road and falling cars so it feels alive
    // before the player starts the actual round.
    this.highway = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'highway3').setOrigin(0);
    this.physics.world.gravity.y = 200;
    this.enemies = this.physics.add.group();
    this.time.addEvent({
      delay: ENEMY_SPAWN_DELAY,
      loop: true,
      callback: () => this.spawnEnemy()
    });

    this.add.image(0, 0, 'black').setOrigin(0).setAlpha(TITLE_OVERLAY_ALPHA).setDepth(10);

    // The prompt is built from text plus the animated Space bar sprite so spacing
    // can be tuned independently from the art.
    const pressText = this.add.text(0, PROMPT_Y, 'Press', this.titleTextStyle()).setDepth(OVERLAY_DEPTH);
    const spaceBar = this.add.sprite(0, PROMPT_Y + 20, 'spaceBar').setScale(SPACE_BAR_SCALE).setDepth(OVERLAY_DEPTH);
    const startText = this.add.text(0, PROMPT_Y, 'To Start', this.titleTextStyle()).setDepth(OVERLAY_DEPTH);
    const totalWidth = pressText.width + PROMPT_GAP + spaceBar.displayWidth + PROMPT_GAP + startText.width;
    const promptLeft = (GAME_WIDTH - totalWidth) / 2 + PROMPT_OFFSET_X;

    pressText.setPosition(promptLeft, PROMPT_Y);
    spaceBar.setPosition(promptLeft + pressText.width + PROMPT_GAP + spaceBar.displayWidth / 2, PROMPT_Y + SPACE_BAR_Y_OFFSET);
    startText.setPosition(promptLeft + pressText.width + PROMPT_GAP + spaceBar.displayWidth + PROMPT_GAP, PROMPT_Y);
    spaceBar.play('press');

    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.input.keyboard.addCapture?.(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // main.js routes captured Space presses to whichever scene owns this callback.
    this.spaceAction = () => this.startGame();
    window.__wilberSpaceAction = this.spaceAction;
    this.events.once('shutdown', () => {
      if (window.__wilberSpaceAction === this.spaceAction) {
        window.__wilberSpaceAction = null;
      }
    });
  }

  update() {
    this.highway.tilePositionY -= ROAD_SCROLL_SPEED;
    this.cleanupEnemies();

    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.startGame();
    }
  }

  startGame() {
    if (this.starting) {
      return;
    }

    this.starting = true;
    this.scene.start('PlayScene');
  }

  spawnEnemy() {
    const x = Phaser.Math.RND.pick(LANES);
    const key = Phaser.Math.RND.pick(ENEMY_KEYS);
    const enemy = this.enemies.create(x, ENEMY_SPAWN_Y, key).setScale(ENEMY_SCALE);
    enemy.body.setImmovable(true);
    enemy.setDepth(ENEMY_DEPTH);
  }

  cleanupEnemies() {
    this.enemies.getChildren().forEach((enemy) => {
      if (enemy && enemy.y > ENEMY_CLEANUP_Y) {
        enemy.destroy();
      }
    });
  }

  titleTextStyle() {
    return {
      fontFamily: PIXEL_FONT,
      fontSize: '35px',
      color: '#ffffff'
    };
  }
}
