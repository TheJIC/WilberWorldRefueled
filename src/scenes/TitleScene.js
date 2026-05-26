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

    const controller = this.add.sprite(375, 890, 'controller').setOrigin(0).setScale(0.8).setDepth(overlayDepth);
    controller.play('press');

    this.add.text(200, 1000, 'Press', this.titleTextStyle()).setDepth(overlayDepth);
    this.add.text(610, 1000, 'To Start', this.titleTextStyle()).setDepth(overlayDepth);

    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.gamepadWasPressed = this.anyGamepadButtonPressed();
    this.input.once('pointerdown', () => this.startGame());
  }

  update() {
    this.highway.tilePositionY += 18;
    this.cleanupEnemies();

    const gamepadPressed = this.anyGamepadButtonPressed();

    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) || Phaser.Input.Keyboard.JustDown(this.enterKey) || (gamepadPressed && !this.gamepadWasPressed)) {
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
