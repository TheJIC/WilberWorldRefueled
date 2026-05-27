import Phaser from 'phaser';
import { ENEMY_KEYS, GAME_HEIGHT, GAME_WIDTH, LANES, PIXEL_FONT } from '../constants.js';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create() {
    const overlayDepth = 20;
    this.starting = false;

    this.highway = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'highway3').setOrigin(0);
    this.physics.world.gravity.y = 200;
    this.enemies = this.physics.add.group();
    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => this.spawnEnemy()
    });

    this.add.image(0, 0, 'black').setOrigin(0).setAlpha(0.25).setDepth(10);

    const promptY = 1000;
    const promptGap = 38;
    const promptOffsetX = 7;
    const spaceBarScale = 1.25;
    const pressText = this.add.text(0, promptY, 'Press', this.titleTextStyle()).setDepth(overlayDepth);
    const spaceBar = this.add.sprite(0, promptY + 20, 'spaceBar').setScale(spaceBarScale).setDepth(overlayDepth);
    const startText = this.add.text(0, promptY, 'To Start', this.titleTextStyle()).setDepth(overlayDepth);
    const totalWidth = pressText.width + promptGap + spaceBar.displayWidth + promptGap + startText.width;
    const promptLeft = (GAME_WIDTH - totalWidth) / 2 + promptOffsetX;

    pressText.setPosition(promptLeft, promptY);
    spaceBar.setPosition(promptLeft + pressText.width + promptGap + spaceBar.displayWidth / 2, promptY + 22);
    startText.setPosition(promptLeft + pressText.width + promptGap + spaceBar.displayWidth + promptGap, promptY);
    spaceBar.play('press');

    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.input.keyboard.addCapture?.(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.gamepadWasPressed = this.anyGamepadButtonPressed();
    this.handleWindowKeyDown = (event) => {
      if (event.code === 'Space' || event.key === ' ') {
        event.preventDefault();
        this.startGame();
      }
    };
    window.addEventListener('keydown', this.handleWindowKeyDown);
    this.events.once('shutdown', () => {
      window.removeEventListener('keydown', this.handleWindowKeyDown);
    });
  }

  update() {
    this.highway.tilePositionY += 18;
    this.cleanupEnemies();

    const gamepadPressed = this.anyGamepadButtonPressed();

    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) || (gamepadPressed && !this.gamepadWasPressed)) {
      this.startGame();
    }

    this.gamepadWasPressed = gamepadPressed;
  }

  startGame() {
    if (this.starting) {
      return;
    }

    this.starting = true;
    this.sound.play('hornSound', { volume: 0.75 });
    this.scene.start('PlayScene');
  }

  spawnEnemy() {
    const x = Phaser.Math.RND.pick(LANES);
    const key = Phaser.Math.RND.pick(ENEMY_KEYS);
    const enemy = this.enemies.create(x, -350, key).setScale(0.8);
    enemy.body.setImmovable(true);
    enemy.setDepth(5);
  }

  cleanupEnemies() {
    this.enemies.getChildren().forEach((enemy) => {
      if (enemy && enemy.y > GAME_HEIGHT + 500) {
        enemy.destroy();
      }
    });
  }

  anyGamepadButtonPressed() {
    const pad = this.input.gamepad?.getPad(0);
    return Boolean(pad?.buttons?.some((button) => button.pressed));
  }

  titleTextStyle() {
    return {
      fontFamily: PIXEL_FONT,
      fontSize: '35px',
      color: '#ffffff'
    };
  }
}
