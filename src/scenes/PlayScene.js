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

const HUD_DEPTH = 20;
const WORLD_GRAVITY_START = 200;
const ENEMY_GRAVITY_STEP = 16.6;
const SPAWN_DELAY_START = 1000;
const SPAWN_DELAY_MIN = 250;
const SPAWN_DELAY_STEP = 10;
const BACKGROUND_SPEED_START = 18;
const BACKGROUND_SPEED_STEP = 0.36;
const ENEMY_SPAWN_Y = -350;
const ENEMY_CLEANUP_Y = GAME_HEIGHT + 500;
const ENEMY_SCALE = 0.8;
const ENEMY_DEPTH = 2;
const PLAYER_START_X = 625;
const PLAYER_START_Y = 2500;
const PLAYER_INTRO_Y = 1000;
const PLAYER_SCALE = 0.8;
const PLAYER_INTRO_DURATION = 2000;
const PLAYER_BOUNDS_DELAY = 3000;
const COUNTDOWN_Y = 300;
const COUNTDOWN_FONT_SIZE = '100px';
const COUNTDOWN_LIFETIME = 650;

// These values preserve the hand-tuned countdown/audio sync.
// Adjust the "at" timings directly when matching a cue in game.mp3.
const COUNTDOWN_STEPS = [
  { text: '3', at: 2775 },
  { text: '2', at: 3925 },
  { text: '1', at: 5025 },
  { text: 'GO!', at: 6025 }
];
const HORN_VOLUME = 0.25;
const EXPLOSION_VOLUME = 0.25;
const DEAD_VOLUME = 0.30;
const PLAYER_HIT_FLASH_ALPHA = 0.35;
const PLAYER_HIT_FLASH_DURATION = 100;
const PLAYER_HIT_FLASH_REPEATS = 5;
const WIN_DROP_DURATION = 750;
const WIN_LAUNCH_DELAY = 4000;
const WIN_LAUNCH_DURATION = 1200;
const WIN_FADE_DELAY = 5600;
const WIN_FADE_DURATION = 2000;
const WIN_SCENE_DELAY = 8000;
const GAME_OVER_TEXT_DELAY = 2000;

export class PlayScene extends Phaser.Scene {
  constructor() {
    super('PlayScene');
  }

  create() {
    this.state = {
      lives: 3,
      secondsLeft: LEVEL_SECONDS,
      spawnDelay: SPAWN_DELAY_START,
      backgroundSpeed: BACKGROUND_SPEED_START,
      controlsEnabled: false,
      ended: false,
      invulnerable: false
    };
    this.hudDepth = HUD_DEPTH;

    // Enemy speed is driven by world gravity; the player opts out of gravity so
    // it only moves when the player gives input.
    this.highway = this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'highway3').setOrigin(0);
    this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.physics.world.gravity.y = WORLD_GRAVITY_START;

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
    this.player = this.physics.add.sprite(PLAYER_START_X, PLAYER_START_Y, 'cherryred').setScale(PLAYER_SCALE);
    this.player.setCollideWorldBounds(false);
    this.player.body.setAllowGravity(false);
    this.player.body.setGravityY(0);

    // Start below the screen and slide into the playable area before controls unlock.
    this.tweens.add({
      targets: this.player,
      y: PLAYER_INTRO_Y,
      duration: PLAYER_INTRO_DURATION,
      ease: 'Quad.easeOut'
    });

    this.time.delayedCall(PLAYER_BOUNDS_DELAY, () => {
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
    // main.js captures Space globally; PlayScene turns that press into a horn honk.
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
      volume: HORN_VOLUME
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
    COUNTDOWN_STEPS.forEach((step) => {
      this.time.delayedCall(step.at, () => this.flashCountdown(step.text));
    });

    this.time.delayedCall(START_DELAY, () => this.startDriving());
  }

  flashCountdown(text) {
    if (this.state.ended) {
      return;
    }

    const label = this.add.text(GAME_WIDTH / 2, COUNTDOWN_Y, text, {
      fontFamily: PIXEL_FONT,
      fontSize: COUNTDOWN_FONT_SIZE,
      color: '#ffffff'
    }).setOrigin(0.5, 0);

    this.time.delayedCall(COUNTDOWN_LIFETIME, () => label.destroy());
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
      ENEMY_SPAWN_Y,
      Phaser.Math.RND.pick(ENEMY_KEYS)
    ).setScale(ENEMY_SCALE);

    enemy.body.setImmovable(true);
    enemy.setDepth(ENEMY_DEPTH);

    if (this.spawnEvent) {
      this.spawnEvent.delay = Math.max(SPAWN_DELAY_MIN, this.state.spawnDelay);
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

    // Difficulty ramps as time passes: cars fall faster, spawn faster, and the
    // road scroll picks up speed.
    const tick = LEVEL_SECONDS + 1 - this.state.secondsLeft;
    this.physics.world.gravity.y = WORLD_GRAVITY_START + tick * ENEMY_GRAVITY_STEP;
    this.state.spawnDelay = Math.max(SPAWN_DELAY_MIN, SPAWN_DELAY_START - tick * SPAWN_DELAY_STEP);
    this.state.backgroundSpeed = BACKGROUND_SPEED_START + tick * BACKGROUND_SPEED_STEP;
  }

  updatePlayerControls() {
    this.player.setVelocity(0, 0);

    if (!this.state.controlsEnabled || !this.player.active) {
      return;
    }

    const movingLeft = this.cursors.left.isDown || this.keys.left.isDown;
    const movingRight = this.cursors.right.isDown || this.keys.right.isDown;
    const movingUp = this.cursors.up.isDown || this.keys.up.isDown;
    const movingDown = this.cursors.down.isDown || this.keys.down.isDown;

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

  handlePlayerHit(player, enemy) {
    if (this.state.invulnerable || this.state.ended) {
      return;
    }

    this.state.invulnerable = true;
    this.destroyEnemy(enemy);
    this.damagePlayer();

    // A short invulnerability flash prevents one overlap from draining multiple lives.
    this.tweens.add({
      targets: player,
      alpha: PLAYER_HIT_FLASH_ALPHA,
      duration: PLAYER_HIT_FLASH_DURATION,
      yoyo: true,
      repeat: PLAYER_HIT_FLASH_REPEATS,
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

    this.add.sprite(x, y, 'explosion')
      .setOrigin(0.5)
      .setScale(2.5)
      .play('boom');

    this.sound.play('explosionSound', { volume: EXPLOSION_VOLUME });
    this.cameras.main.flash(200, 255, 0, 0);
  }

  cleanupEnemies() {
    this.enemies.getChildren().forEach((enemy) => {
      if (enemy && enemy.y > ENEMY_CLEANUP_Y) {
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

    // Win cutscene: drop below screen, launch upward with the rev sound, then fade
    // into the Wilber World arrival scene.
    this.tweens.add({
      targets: this.player,
      y: GAME_HEIGHT + 500,
      duration: WIN_DROP_DURATION,
      ease: 'Quad.easeIn'
    });

    this.time.delayedCall(WIN_LAUNCH_DELAY, () => {
      this.tweens.add({
        targets: this.player,
        y: -500,
        duration: WIN_LAUNCH_DURATION,
        ease: 'Quad.easeIn',
        onStart: () => {
          this.accelerateSound.stop();
          this.accelerateSound.setVolume(GAME_MUSIC_VOLUME);
          this.accelerateSound.play();
        }
      });
    });

    this.time.delayedCall(WIN_FADE_DELAY, () => {
      this.tweens.add({
        targets: this.accelerateSound,
        volume: 0,
        duration: WIN_FADE_DURATION,
        ease: 'Linear',
        onComplete: () => {
          this.accelerateSound.stop();
          this.accelerateSound.setVolume(GAME_MUSIC_VOLUME);
        }
      });

      this.tweens.add({
        targets: black,
        alpha: 1,
        duration: WIN_FADE_DURATION,
        ease: 'Linear'
      });
    });

    this.time.delayedCall(WIN_SCENE_DELAY, () => this.scene.start('WinScene'));
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
    this.deadSound = this.sound.add('deadSound', { volume: DEAD_VOLUME });
    this.deadSound.play();

    // The text lands on the tuned cue in dead.mp3.
    this.time.delayedCall(GAME_OVER_TEXT_DELAY, () => {
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
