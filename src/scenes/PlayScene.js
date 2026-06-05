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
import { usesTouchControls } from '../inputMode.js';

const HUD_DEPTH = 20;
const TOUCH_CONTROL_DEPTH = 30;
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
const MAX_SCROLL_DELTA = 1000 / 60;
const TOUCH_BUTTON_RADIUS = 78;
const TOUCH_BUTTON_SIZE = 170;
const TOUCH_BUTTON_ALPHA = 0.18;
const TOUCH_BUTTON_PRESSED_ALPHA = 0.36;
const TOUCH_BUTTON_STROKE_ALPHA = 0.55;
const TOUCH_DPAD_X = 210;
const TOUCH_DPAD_Y = 1580;
const TOUCH_DPAD_SPACING = 126;
const TOUCH_HORN_X = 870;
const TOUCH_HORN_Y = 1630;

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
    this.isTouchMode = usesTouchControls();
    this.touchDirections = {
      left: false,
      right: false,
      up: false,
      down: false
    };
    this.touchControls = [];
    this.touchButtonStates = [];
    this.touchHornButton = null;
    this.touchHornPressed = false;

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

  update(_time, delta) {
    this.highway.tilePositionY -= this.toScrollStep(this.state.backgroundSpeed, delta);
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
    this.timerText = this.add.text(GAME_WIDTH / 2, 100, `Time: ${LEVEL_SECONDS}`, {
      ...this.hudTextStyle(),
      fontSize: '50px'
    }).setOrigin(0.5, 0).setDepth(this.hudDepth).setVisible(false);
    this.livesText = this.add.text(GAME_WIDTH / 2, 175, 'Lives: 3', this.hudTextStyle())
      .setOrigin(0.5, 0)
      .setDepth(this.hudDepth)
      .setVisible(false);
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

    if (this.isTouchMode) {
      this.createTouchControls();
    }
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
    this.setTouchControlsVisible(true);

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

    const movement = this.getMovementInput();

    if (movement.left) {
      this.player.setVelocityX(-PLAYER_SPEED_X);
      this.player.setAngle(-10);
    } else if (movement.right) {
      this.player.setVelocityX(PLAYER_SPEED_X);
      this.player.setAngle(10);
    } else {
      this.player.setRotation(0);
    }

    if (movement.up) {
      this.player.setVelocityY(-PLAYER_SPEED_UP);
    } else if (movement.down) {
      this.player.setVelocityY(PLAYER_SPEED_DOWN);
    }
  }

  getMovementInput() {
    return {
      left: this.cursors.left.isDown || this.keys.left.isDown || this.touchDirections.left,
      right: this.cursors.right.isDown || this.keys.right.isDown || this.touchDirections.right,
      up: this.cursors.up.isDown || this.keys.up.isDown || this.touchDirections.up,
      down: this.cursors.down.isDown || this.keys.down.isDown || this.touchDirections.down
    };
  }

  createTouchControls() {
    this.createDirectionButton('up', TOUCH_DPAD_X, TOUCH_DPAD_Y - TOUCH_DPAD_SPACING, 90);
    this.createDirectionButton('left', TOUCH_DPAD_X - TOUCH_DPAD_SPACING, TOUCH_DPAD_Y, 0);
    this.createDirectionButton('right', TOUCH_DPAD_X + TOUCH_DPAD_SPACING, TOUCH_DPAD_Y, 180);
    this.createDirectionButton('down', TOUCH_DPAD_X, TOUCH_DPAD_Y + TOUCH_DPAD_SPACING, -90);
    this.createHornButton();
    this.setTouchControlsVisible(false);

    this.touchControlAction = (event) => this.handleTouchControls(event);
    window.__wilberTouchControlAction = this.touchControlAction;

    this.events.once('shutdown', () => {
      if (window.__wilberTouchControlAction === this.touchControlAction) {
        window.__wilberTouchControlAction = null;
      }
      this.clearTouchDirections();
    });
  }

  createDirectionButton(direction, x, y, angle) {
    const button = this.createTouchButton(x, y, null, {
      angle,
      chevron: true
    });
    const state = {
      direction,
      x,
      y,
      size: TOUCH_BUTTON_SIZE,
      background: button.background
    };

    this.touchButtonStates.push(state);
  }

  createHornButton() {
    const button = this.createTouchButton(TOUCH_HORN_X, TOUCH_HORN_Y, 'Honk', {
      fontSize: '25px',
      radius: 86,
      size: 190
    });

    this.touchHornButton = {
      x: TOUCH_HORN_X,
      y: TOUCH_HORN_Y,
      size: 190,
      background: button.background
    };
  }

  createTouchButton(x, y, label, options = {}) {
    const radius = options.radius ?? TOUCH_BUTTON_RADIUS;
    const size = options.size ?? TOUCH_BUTTON_SIZE;
    const background = this.add.circle(x, y, radius, 0xffffff, TOUCH_BUTTON_ALPHA)
      .setStrokeStyle(5, 0xffffff, TOUCH_BUTTON_STROKE_ALPHA)
      .setDepth(TOUCH_CONTROL_DEPTH);
    const foreground = options.chevron
      ? this.createChevronIcon(x, y, options.angle ?? 0)
      : this.add.text(x, y, label, {
        fontFamily: PIXEL_FONT,
        fontSize: options.fontSize ?? '52px',
        color: '#ffffff'
      })
        .setOrigin(0.5)
        .setDepth(TOUCH_CONTROL_DEPTH + 1);
    const zone = this.add.zone(x, y, size, size)
      .setDepth(TOUCH_CONTROL_DEPTH + 2)
      .setInteractive();

    this.touchControls.push({ background, text: foreground, zone });

    return { background, text: foreground, zone };
  }

  createChevronIcon(x, y, angle) {
    const graphic = this.add.graphics();
    graphic.lineStyle(10, 0xffffff, 1);
    graphic.beginPath();
    graphic.moveTo(22, -34);
    graphic.lineTo(-22, 0);
    graphic.lineTo(22, 34);
    graphic.strokePath();

    return this.add.container(x, y, [graphic])
      .setAngle(angle)
      .setDepth(TOUCH_CONTROL_DEPTH + 1);
  }

  handleTouchControls(event) {
    if (!this.state.controlsEnabled || this.state.ended) {
      this.clearTouchDirections();
      return;
    }

    const points = Array.from(event.touches ?? [])
      .map((touch) => this.getTouchGamePoint(touch))
      .filter(Boolean);
    const isTouchingControl = points.some((point) => this.isPointInsideAnyTouchControl(point));

    if (!isTouchingControl && !this.isAnyTouchControlPressed()) {
      return;
    }

    this.touchButtonStates.forEach((state) => {
      const isPressed = points.some((point) => this.isPointInsideTouchButton(point, state));
      this.updateDirectionButtonState(state, isPressed);
    });

    const hornPressed = Boolean(this.touchHornButton)
      && points.some((point) => this.isPointInsideTouchButton(point, this.touchHornButton));
    this.updateHornButtonState(hornPressed);
  }

  getTouchGamePoint(touch) {
    const canvas = this.game.canvas;
    const bounds = canvas.getBoundingClientRect();

    if (bounds.width <= 0 || bounds.height <= 0) {
      return null;
    }

    return {
      x: (touch.clientX - bounds.left) * (GAME_WIDTH / bounds.width),
      y: (touch.clientY - bounds.top) * (GAME_HEIGHT / bounds.height)
    };
  }

  isPointInsideTouchButton(point, button) {
    const halfSize = button.size / 2;

    return point.x >= button.x - halfSize
      && point.x <= button.x + halfSize
      && point.y >= button.y - halfSize
      && point.y <= button.y + halfSize;
  }

  isPointInsideAnyTouchControl(point) {
    return this.touchButtonStates.some((state) => this.isPointInsideTouchButton(point, state))
      || (this.touchHornButton && this.isPointInsideTouchButton(point, this.touchHornButton));
  }

  isAnyTouchControlPressed() {
    return Object.values(this.touchDirections).some(Boolean) || this.touchHornPressed;
  }

  updateDirectionButtonState(state, isPressed) {
    this.touchDirections[state.direction] = isPressed;
    state.background.setAlpha(isPressed ? TOUCH_BUTTON_PRESSED_ALPHA : TOUCH_BUTTON_ALPHA);
  }

  updateHornButtonState(isPressed) {
    if (!this.touchHornButton) {
      return;
    }

    if (isPressed && !this.touchHornPressed) {
      this.honkHorn();
    }

    this.touchHornPressed = isPressed;
    this.touchHornButton.background.setAlpha(isPressed ? TOUCH_BUTTON_PRESSED_ALPHA : TOUCH_BUTTON_ALPHA);
  }

  clearTouchDirections() {
    Object.keys(this.touchDirections).forEach((direction) => {
      this.touchDirections[direction] = false;
    });
    this.touchButtonStates.forEach((state) => {
      state.background.setAlpha(TOUCH_BUTTON_ALPHA);
    });
    this.touchHornPressed = false;
    this.touchHornButton?.background.setAlpha(TOUCH_BUTTON_ALPHA);
  }

  setTouchControlsVisible(visible) {
    if (!this.isTouchMode) {
      return;
    }

    this.touchControls.forEach(({ background, text, zone }) => {
      background.setVisible(visible);
      text.setVisible(visible);

      if (visible) {
        zone.setVisible(true).setInteractive();
      } else {
        zone.setVisible(false).disableInteractive();
      }
    });

    if (!visible) {
      this.clearTouchDirections();
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
    this.setTouchControlsVisible(false);
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
    this.setTouchControlsVisible(false);
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
      this.add.text(GAME_WIDTH / 2, 900, this.isTouchMode ? 'Tap To Retry' : 'Press R to Retry', {
        fontFamily: PIXEL_FONT,
        fontSize: '42px',
        color: '#ffffff'
      }).setOrigin(0.5, 0).setDepth(this.hudDepth);

      if (this.isTouchMode) {
        this.retryTouchAction = () => this.restartAfterGameOver();
        window.__wilberTouchAction = this.retryTouchAction;
        this.input.once('pointerdown', () => this.restartAfterGameOver());
      }
    });

    this.input.keyboard.once('keydown-R', () => this.restartAfterGameOver());
  }

  restartAfterGameOver() {
    if (window.__wilberTouchAction === this.retryTouchAction) {
      window.__wilberTouchAction = null;
    }
    this.deadSound?.stop();
    this.scene.restart();
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

  toScrollStep(speed, delta) {
    // Touch dragging can create occasional long mobile frames. Capping the road
    // delta prevents the texture from visually "catching up" and seeming faster.
    return speed * (Math.min(delta, MAX_SCROLL_DELTA) / MAX_SCROLL_DELTA);
  }
}
