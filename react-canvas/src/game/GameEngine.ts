import type { GamePhase, GameState } from './types';
import { Ship } from './entities/Ship';
import { Asteroid } from './entities/Asteroid';
import { Bullet } from './entities/Bullet';
import { Particle } from './entities/Particle';
import { InputManager } from './systems/input';
import {
  checkBulletAsteroidCollisions,
  checkShipAsteroidCollision,
} from './systems/collision';
import {
  spawnWave,
  splitAsteroid,
  createExplosion,
  createShipExplosion,
} from './systems/spawner';
import {
  clearCanvas,
  drawStars,
  drawShip,
  drawAsteroid,
  drawBullet,
  drawParticle,
} from './renderer';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  BULLET_MAX_COUNT,
  SHIP_SIZE,
  SCORE_LARGE,
  SCORE_MEDIUM,
  SCORE_SMALL,
  EXTRA_LIFE_SCORE,
  STARTING_LIVES,
  RESPAWN_DELAY,
  WAVE_DELAY,
} from './constants';

interface Star {
  x: number;
  y: number;
  brightness: number;
}

export class GameEngine {
  // Canvas
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  // Entities
  private ship: Ship;
  private asteroids: Asteroid[] = [];
  private bullets: Bullet[] = [];
  private particles: Particle[] = [];
  private stars: Star[] = [];

  // Game state
  private phase: GamePhase = 'title';
  private score: number = 0;
  private lives: number = STARTING_LIVES;
  private wave: number = 0;
  private highScore: number = 0;
  private nextExtraLife: number = EXTRA_LIFE_SCORE;

  // Timers
  private respawnTimer: number = 0;
  private waveTimer: number = 0;

  // Loop
  private animFrameId: number = 0;
  private lastTime: number = 0;
  private running: boolean = false;

  // Input
  private input: InputManager;

  // Callback to push state to React
  onStateChange?: (state: GameState) => void;

  // Title screen decorative asteroids
  private titleAsteroids: Asteroid[] = [];

  constructor() {
    this.ship = new Ship();
    this.input = new InputManager();
    this.generateStars();
    this.generateTitleAsteroids();
    this.loadHighScore();
  }

  private generateStars(): void {
    this.stars = [];
    for (let i = 0; i < 100; i++) {
      this.stars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        brightness: 0.2 + Math.random() * 0.5,
      });
    }
  }

  private generateTitleAsteroids(): void {
    this.titleAsteroids = [];
    for (let i = 0; i < 6; i++) {
      const x = Math.random() * CANVAS_WIDTH;
      const y = Math.random() * CANVAS_HEIGHT;
      const sizes: Array<'large' | 'medium' | 'small'> = ['large', 'medium', 'small'];
      const size = sizes[Math.floor(Math.random() * sizes.length)];
      this.titleAsteroids.push(new Asteroid({ x, y }, size));
    }
  }

  private loadHighScore(): void {
    try {
      const stored = localStorage.getItem('asteroids_high_score');
      if (stored) {
        this.highScore = parseInt(stored, 10) || 0;
      }
    } catch {
      // localStorage not available
    }
  }

  private saveHighScore(): void {
    try {
      localStorage.setItem('asteroids_high_score', this.highScore.toString());
    } catch {
      // localStorage not available
    }
  }

  attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input.attach();
    this.start();
  }

  detach(): void {
    this.stop();
    this.input.detach();
    this.canvas = null;
    this.ctx = null;
  }

  private start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.animFrameId = requestAnimationFrame(this.loop);
  }

  stop(): void {
    this.running = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = 0;
    }
  }

  private loop = (time: number): void => {
    if (!this.running) return;

    const dt = Math.min((time - this.lastTime) / 1000, 0.05); // cap dt at 50ms
    this.lastTime = time;

    this.update(dt);
    this.render();

    this.input.clearJustPressed();
    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    switch (this.phase) {
      case 'title':
        this.updateTitle(dt);
        break;
      case 'playing':
        this.updatePlaying(dt);
        break;
      case 'gameOver':
        this.updateGameOver(dt);
        break;
    }
  }

  // ---- TITLE PHASE ----

  private updateTitle(dt: number): void {
    // Animate decorative asteroids
    for (const asteroid of this.titleAsteroids) {
      asteroid.update(dt);
    }

    // Update particles (from previous game's explosions if any)
    this.updateParticles(dt);

    if (this.input.start) {
      this.startNewGame();
    }
  }

  // ---- PLAYING PHASE ----

  private updatePlaying(dt: number): void {
    // Ship input
    if (this.ship.alive) {
      this.ship.rotatingLeft = this.input.rotateLeft;
      this.ship.rotatingRight = this.input.rotateRight;
      this.ship.thrusting = this.input.thrust;

      // Shooting
      if (this.input.shoot) {
        this.tryShoot();
      }
    }

    // Update entities
    this.ship.update(dt);

    for (const asteroid of this.asteroids) {
      asteroid.update(dt);
    }

    for (const bullet of this.bullets) {
      bullet.update(dt);
    }

    this.updateParticles(dt);

    // Remove dead bullets
    this.bullets = this.bullets.filter((b) => b.alive);

    // Collision: bullets vs asteroids
    const bulletHits = checkBulletAsteroidCollisions(this.bullets, this.asteroids);
    if (bulletHits.length > 0) {
      this.processBulletHits(bulletHits);
    }

    // Collision: ship vs asteroids
    if (this.ship.alive) {
      const hitIndex = checkShipAsteroidCollision(this.ship, this.asteroids);
      if (hitIndex >= 0) {
        this.destroyShip();
      }
    }

    // Respawn timer
    if (!this.ship.alive) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        if (this.lives > 0) {
          this.ship.reset();
        } else {
          this.setPhase('gameOver');
        }
      }
    }

    // Wave progression
    if (this.asteroids.length === 0 && this.ship.alive) {
      this.waveTimer -= dt;
      if (this.waveTimer <= 0) {
        this.startNextWave();
      }
    }
  }

  private tryShoot(): void {
    if (this.bullets.length >= BULLET_MAX_COUNT) return;
    if (!this.ship.alive) return;

    const noseX = this.ship.position.x + Math.cos(this.ship.angle) * SHIP_SIZE;
    const noseY = this.ship.position.y + Math.sin(this.ship.angle) * SHIP_SIZE;

    this.bullets.push(new Bullet({ x: noseX, y: noseY }, this.ship.angle));
  }

  private processBulletHits(
    hits: Array<{ bulletIndex: number; asteroidIndex: number }>
  ): void {
    // Collect unique asteroid indices to destroy (process in reverse order)
    const asteroidsToDestroy = new Set<number>();
    const bulletsToDestroy = new Set<number>();

    for (const hit of hits) {
      asteroidsToDestroy.add(hit.asteroidIndex);
      bulletsToDestroy.add(hit.bulletIndex);
    }

    // Kill bullets
    for (const bi of bulletsToDestroy) {
      this.bullets[bi].alive = false;
    }

    // Process asteroid destruction (collect new asteroids, then replace)
    const newAsteroids: Asteroid[] = [];
    const sortedIndices = Array.from(asteroidsToDestroy).sort((a, b) => b - a);

    for (const ai of sortedIndices) {
      const asteroid = this.asteroids[ai];

      // Score
      this.addScore(asteroid);

      // Particles
      this.particles.push(
        ...createExplosion(asteroid.position, undefined, undefined)
      );

      // Split
      const children = splitAsteroid(asteroid);
      newAsteroids.push(...children);

      // Remove
      this.asteroids.splice(ai, 1);
    }

    // Add child asteroids
    this.asteroids.push(...newAsteroids);

    // Clean up dead bullets
    this.bullets = this.bullets.filter((b) => b.alive);
  }

  private addScore(asteroid: Asteroid): void {
    const prevScore = this.score;

    switch (asteroid.size) {
      case 'large':
        this.score += SCORE_LARGE;
        break;
      case 'medium':
        this.score += SCORE_MEDIUM;
        break;
      case 'small':
        this.score += SCORE_SMALL;
        break;
    }

    // Extra life check
    if (this.score >= this.nextExtraLife && prevScore < this.nextExtraLife) {
      this.lives++;
      this.nextExtraLife += EXTRA_LIFE_SCORE;
    }

    this.emitStateChange();
  }

  private destroyShip(): void {
    this.ship.alive = false;
    this.lives--;
    this.respawnTimer = RESPAWN_DELAY;

    // Ship explosion particles
    this.particles.push(...createShipExplosion(this.ship.position));

    this.emitStateChange();
  }

  private startNextWave(): void {
    this.wave++;
    this.waveTimer = WAVE_DELAY;
    this.asteroids = spawnWave(this.wave, this.ship.position);
    this.emitStateChange();
  }

  // ---- GAME OVER PHASE ----

  private updateGameOver(dt: number): void {
    // Keep animating existing entities
    for (const asteroid of this.asteroids) {
      asteroid.update(dt);
    }
    this.updateParticles(dt);

    if (this.input.start) {
      this.startNewGame();
    }
  }

  // ---- SHARED ----

  private updateParticles(dt: number): void {
    for (const particle of this.particles) {
      particle.update(dt);
    }
    this.particles = this.particles.filter((p) => p.alive);
  }

  private startNewGame(): void {
    this.score = 0;
    this.lives = STARTING_LIVES;
    this.wave = 0;
    this.nextExtraLife = EXTRA_LIFE_SCORE;
    this.asteroids = [];
    this.bullets = [];
    this.particles = [];
    this.respawnTimer = 0;
    this.waveTimer = 0.5; // Brief delay before first wave

    this.ship = new Ship();
    this.ship.invulnerableTimer = 0; // No invulnerability on game start

    this.setPhase('playing');
  }

  private setPhase(phase: GamePhase): void {
    this.phase = phase;

    if (phase === 'gameOver') {
      if (this.score > this.highScore) {
        this.highScore = this.score;
        this.saveHighScore();
      }
    }

    this.emitStateChange();
  }

  private emitStateChange(): void {
    this.onStateChange?.({
      score: this.score,
      lives: this.lives,
      phase: this.phase,
      highScore: this.highScore,
      wave: this.wave,
    });
  }

  // ---- RENDERING ----

  private render(): void {
    if (!this.ctx) return;

    clearCanvas(this.ctx);
    drawStars(this.ctx, this.stars);

    switch (this.phase) {
      case 'title':
        this.renderTitle();
        break;
      case 'playing':
        this.renderPlaying();
        break;
      case 'gameOver':
        this.renderGameOver();
        break;
    }
  }

  private renderTitle(): void {
    if (!this.ctx) return;

    // Draw decorative asteroids
    for (const asteroid of this.titleAsteroids) {
      drawAsteroid(this.ctx, asteroid);
    }

    // Draw particles
    for (const particle of this.particles) {
      drawParticle(this.ctx, particle);
    }
  }

  private renderPlaying(): void {
    if (!this.ctx) return;

    // Draw asteroids
    for (const asteroid of this.asteroids) {
      drawAsteroid(this.ctx, asteroid);
    }

    // Draw bullets
    for (const bullet of this.bullets) {
      drawBullet(this.ctx, bullet);
    }

    // Draw ship
    drawShip(this.ctx, this.ship);

    // Draw particles
    for (const particle of this.particles) {
      drawParticle(this.ctx, particle);
    }
  }

  private renderGameOver(): void {
    if (!this.ctx) return;

    // Draw remaining asteroids
    for (const asteroid of this.asteroids) {
      drawAsteroid(this.ctx, asteroid);
    }

    // Draw particles
    for (const particle of this.particles) {
      drawParticle(this.ctx, particle);
    }
  }

  // ---- PUBLIC API ----

  getState(): GameState {
    return {
      score: this.score,
      lives: this.lives,
      phase: this.phase,
      highScore: this.highScore,
      wave: this.wave,
    };
  }
}
