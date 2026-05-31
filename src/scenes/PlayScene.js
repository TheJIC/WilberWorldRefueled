import Phaser from 'phaser';
import {
  ENEMY_KEYS,
  GAME_HEIGHT,
  GAME_WIDTH,
  GAME_MUSIC_VOLUME,
  HIT_INVULNERABILITY,
  LANES,
  LEVEL_SECONDS,
  PLAYER_SPEED_DOWN,
  PLAYER_SPEED_UP,
  PLAYER_SPEED_X,
  PIXEL_FONT,
  START_DELAY
} from '../constants.js';

export class PlayScene extends Phaser.Scene {
  constructor() {
    super('PlayScene');
  }

  create() {
    this.state = {
      lives: 3,
      secondsLeft: LEVEL_SECONDS,
      spawnDelay: 1000,
      backgroundSpeed: 18,
      controlsEnabled: false,
      ended: false,
      invulnerable: false
    };
    this.hudDepth = 20;

    this.highway = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'highway3').setOrigin(0);
    this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.physics.world.gravity.y = 200;

    this.createWalls();
    this.createPlayer();
    this.createGroups();
    this.createHud();
    this.createInput();
    this.createAudio();
    this.registerSpaceAction();
    this.runCountdown();

    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.enemies, this.walls);
    this.physics.add.overlap(this.player, this.enemies, this.handlePlayerHit, undefined, this);
  }

  update() {
    this.highway.tilePositionY -= this.state.backgroundSpeed;
    this.cleanupEnemies();

    if (!this.state.ended) {
      this.updateDifficulty();
      this.updatePlayerControls();
    }
  }

  createWalls() {
    this.walls = this.physics.add.staticGroup();
    this.walls.create(-123, 0, 'wall').setOrigin(0).refreshBody();
    this.walls.create(910, 0, 'wall').setOrigin(0).refreshBody();
  }

  createPlayer() {
    this.player = this.physics.add.sprite(625, 2500, 'cherryred').setScale(0.8);
    this.player.setCollideWorldBounds(false);
    this.player.body.setAllowGravity(false);
    this.player.body.setGravityY(0);

    this.tweens.add({
      targets: this.player,
      y: 1000,
      duration: 2000,
      ease: 'Quad.easeOut'
    });

    this.time.delayedCall(3000, () => {
      if (!this.state.ended) {
        this.player.setCollideWorldBounds(true);
      }
    });
  }

  createGroups() {
    this.enemies = this.physics.add.group({
      allowGravity: true,
      immovable: true
    });
  }

  createHud() {
    this.livesText = this.add.text(25, 1820, 'Lives: 3', this.hudTextStyle()).setDepth(this.hudDepth).setVisible(false);
    this.timerText = this.add.text(GAME_WIDTH / 2, 100, `Time: ${LEVEL_SECONDS}`, {
      ...this.hudTextStyle(),
      fontSize: '50px'
    }).setOrigin(0.5, 0).setDepth(this.hudDepth).setVisible(false);
  }

  createInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      restart: Phaser.Input.Keyboard.KeyCodes.R
    });
  }

  registerSpaceAction() {
    this.spaceAction = () => this.honkHorn();
    window.__wilberSpaceAction = this.spaceAction;

    this.events.once('shutdown', () => {
      if (window.__wilberSpaceAction === this.spaceAction) {
        window.__wilberSpaceAction = null;
      }
    });
  }

  honkHorn() {
    if (!this.state.controlsEnabled || this.state.ended || !this.player.active) {
      return;
    }

    if (this.horn.isPlaying) {
      this.horn.stop();
    }

    this.horn.play();
  }

  createAudio() {
    this.music = this.sound.add('gameMusic', {
      loop: true,
      volume: GAME_MUSIC_VOLUME
    });
    this.horn = this.sound.add('hornSound', {
      volume: 0.25
    });
    this.accelerateSound = this.sound.add('accelerateSound', {
      volume: GAME_MUSIC_VOLUME
    });
    this.music.play();

    this.events.once('shutdown', () => {
      this.music?.stop();
      this.horn?.stop();
      this.deadSound?.stop();
      this.accelerateSound?.stop();
    });
  }

  runCountdown() {
    [
      { text: '3', at: 2775, x: 510 },
      { text: '2', at: 3925, x: 510 },
      { text: '1', at: 5025, x: 510 },
      { text: 'GO!', at: 6025, x: 460 }
    ].forEach((step) => {
      this.time.delayedCall(step.at, () => this.flashCountdown(step.text, step.x));
    });

    this.time.delayedCall(START_DELAY, () => this.startDriving());
  }

  flashCountdown(text, x) {
    if (this.state.ended) {
      return;
    }

    const label = this.add.text(GAME_WIDTH / 2, 300, text, {
      fontFamily: PIXEL_FONT,
      fontSize: '100px',
      color: '#ffffff'
    }).setOrigin(0.5, 0);

    this.time.delayedCall(650, () => label.destroy());
  }

  startDriving() {
    if (this.state.ended) {
      return;
    }

    this.state.controlsEnabled = true;
    this.livesText.setVisible(true);
    this.timerText.setVisible(true);

    this.spawnEvent = this.time.addEvent({
      delay: this.state.spawnDelay,
      loop: true,
      callback: () => this.spawnEnemy()
    });

    this.levelTimer = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => this.tickTimer()
    });
  }

  spawnEnemy() {
    if (this.state.ended) {
      return;
    }

    const enemy = this.enemies.create(
      Phaser.Math.RND.pick(LANES),
      -350,
      Phaser.Math.RND.pick(ENEMY_KEYS)
    ).setScale(0.8);

    enemy.body.setImmovable(true);
    enemy.setDepth(2);

    if (this.spawnEvent) {
      this.spawnEvent.delay = Math.max(250, this.state.spawnDelay);
    }
  }

  tickTimer() {
    if (this.state.ended) {
      return;
    }

    this.state.secondsLeft -= 1;
    this.timerText.setText(`Time: ${this.state.secondsLeft}`);

    if (this.state.secondsLeft <= 0) {
      this.finishLevel();
    }
  }

  updateDifficulty() {
    if (this.state.secondsLeft === LEVEL_SECONDS) {
      return;
    }

    const tick = 61 - this.state.secondsLeft;
    this.physics.world.gravity.y = 200 + tick * 16.6;
    this.state.spawnDelay = Math.max(250, 1000 - tick * 10);
    this.state.backgroundSpeed = 18 + tick * 0.36;
  }

  updatePlayerControls() {
    this.player.setVelocity(0, 0);

    if (!this.state.controlsEnabled || !this.player.active) {
      return;
    }

    const axis = this.readGamepadAxes();
    const movingLeft = this.cursors.left.isDown || this.keys.left.isDown || axis.x < -0.1;
    const movingRight = this.cursors.right.isDown || this.keys.right.isDown || axis.x > 0.1;
    const movingUp = this.cursors.up.isDown || this.keys.up.isDown || axis.y < -0.1;
    const movingDown = this.cursors.down.isDown || this.keys.down.isDown || axis.y > 0.1;

    if (movingLeft) {
      this.player.setVelocityX(-PLAYER_SPEED_X);
      this.player.setAngle(-10);
    } else if (movingRight) {
      this.player.setVelocityX(PLAYER_SPEED_X);
      this.player.setAngle(10);
    } else {
      this.player.setRotation(0);
    }

    if (movingUp) {
      this.player.setVelocityY(-PLAYER_SPEED_UP);
    } else if (movingDown) {
      this.player.setVelocityY(PLAYER_SPEED_DOWN);
    }
  }

  readGamepadAxes() {
    const pad = this.input.gamepad?.getPad(0);
    const axisX = pad?.axes?.[0]?.getValue?.() ?? 0;
    const axisY = pad?.axes?.[1]?.getValue?.() ?? 0;
    return { x: axisX, y: axisY };
  }

  handlePlayerHit(player, enemy) {
    if (this.state.invulnerable || this.state.ended) {
      return;
    }

    this.state.invulnerable = true;
    this.destroyEnemy(enemy);
    this.damagePlayer();

    this.tweens.add({
      targets: player,
      alpha: 0.35,
      duration: 100,
      yoyo: true,
      repeat: 5,
      onComplete: () => {
        player.setAlpha(1);
        this.state.invulnerable = false;
      }
    });

    this.time.delayedCall(HIT_INVULNERABILITY, () => {
      this.state.invulnerable = false;
      player.setAlpha(1);
    });
  }

  damagePlayer() {
    this.state.lives -= 1;
    this.livesText.setText(`Lives: ${this.state.lives}`);

    if (this.state.lives <= 0) {
      this.gameOver();
    }
  }

  destroyEnemy(enemy) {
    const { x, y } = enemy;
    enemy.destroy();

    this.add.sprite(x - 55, y, 'explosion')
      .setOrigin(0)
      .setScale(2.5)
      .play('boom');

    this.sound.play('explosionSound', { volume: 0.25 });
    this.cameras.main.flash(200, 255, 0, 0);
  }

  cleanupEnemies() {
    this.enemies.getChildren().forEach((enemy) => {
      if (enemy && enemy.y > GAME_HEIGHT + 500) {
        enemy.destroy();
      }
    });
  }

  clearEnemiesWithExplosions() {
    const enemies = this.enemies.getChildren();
    enemies.forEach((enemy, index) => {
      this.time.delayedCall(index * 250, () => {
        if (enemy.active) {
          this.destroyEnemy(enemy);
        }
      });
    });
  }

  finishLevel() {
    if (this.state.ended) {
      return;
    }

    this.state.ended = true;
    this.state.controlsEnabled = false;
    this.tweens.killTweensOf(this.player);
    this.player.setAngle(0);
    this.player.setVelocity(0, 0);
    this.player.body.stop();
    this.player.body.setAllowGravity(false);
    this.player.body.setGravityY(0);
    this.player.setCollideWorldBounds(false);
    this.music?.stop();
    this.stopEvents();
    this.clearEnemiesWithExplosions();
    this.livesText.setVisible(false);
    this.timerText.setVisible(false);

    const black = this.add.image(0, 0, 'black').setOrigin(0).setAlpha(0).setDepth(10);

    this.tweens.add({
      targets: this.player,
      y: GAME_HEIGHT + 500,
      duration: 750,
      ease: 'Quad.easeIn'
    });

    this.time.delayedCall(4000, () => {
      this.tweens.add({
        targets: this.player,
        y: -500,
        duration: 1200,
        ease: 'Quad.easeIn',
        onStart: () => {
          this.accelerateSound.stop();
          this.accelerateSound.setVolume(GAME_MUSIC_VOLUME);
          this.accelerateSound.play();
        }
      });
    });

    this.time.delayedCall(5600, () => {
      this.tweens.add({
        targets: this.accelerateSound,
        volume: 0,
        duration: 2000,
        ease: 'Linear',
        onComplete: () => {
          this.accelerateSound.stop();
          this.accelerateSound.setVolume(GAME_MUSIC_VOLUME);
        }
      });

      this.tweens.add({
        targets: black,
        alpha: 1,
        duration: 2000,
        ease: 'Linear'
      });
    });

    this.time.delayedCall(8000, () => this.scene.start('WinScene'));
  }

  gameOver() {
    if (this.state.ended) {
      return;
    }

    this.state.ended = true;
    this.state.controlsEnabled = false;
    this.music?.stop();
    this.stopEvents();

    this.add.sprite(this.player.x - 115, this.player.y - 100, 'explosion')
      .setOrigin(0)
      .setScale(2.5)
      .play('boom');

    this.player.disableBody(true, true);
    this.deadSound = this.sound.add('deadSound', { volume: 0.30 });
    this.deadSound.play();

    this.time.delayedCall(2000, () => {
      this.add.text(GAME_WIDTH / 2, 800, 'Game Over', {
        fontFamily: PIXEL_FONT,
        fontSize: '75px',
        color: '#ffffff'
      }).setOrigin(0.5, 0).setDepth(this.hudDepth);
      this.add.text(GAME_WIDTH / 2, 900, 'Press R to Retry', {
        fontFamily: PIXEL_FONT,
        fontSize: '42px',
        color: '#ffffff'
      }).setOrigin(0.5, 0).setDepth(this.hudDepth);
    });

    this.input.keyboard.once('keydown-R', () => {
      this.deadSound?.stop();
      this.scene.restart();
    });
  }

  stopEvents() {
    this.spawnEvent?.remove(false);
    this.levelTimer?.remove(false);
  }

  hudTextStyle() {
    return {
      fontFamily: PIXEL_FONT,
      fontSize: '35px',
      color: '#ffffff'
    };
  }
}
