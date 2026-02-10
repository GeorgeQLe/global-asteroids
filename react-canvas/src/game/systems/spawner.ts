import type { AsteroidSize, Vector2D } from '../types';
import { Asteroid } from '../entities/Asteroid';
import { Particle } from '../entities/Particle';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  WAVE_START_ASTEROIDS,
  WAVE_ASTEROID_INCREMENT,
  WAVE_MAX_ASTEROIDS,
  SAFE_SPAWN_DISTANCE,
  PARTICLE_COUNT_ASTEROID,
  PARTICLE_COUNT_SHIP,
  PARTICLE_SPEED,
} from '../constants';
import { distanceSquared } from './physics';

/**
 * Calculate number of asteroids for a given wave.
 */
export function getAsteroidCountForWave(wave: number): number {
  return Math.min(
    WAVE_START_ASTEROIDS + (wave - 1) * WAVE_ASTEROID_INCREMENT,
    WAVE_MAX_ASTEROIDS
  );
}

/**
 * Spawn a single asteroid at a random edge position, away from ship.
 */
export function spawnAsteroid(shipPosition: Vector2D): Asteroid {
  let position: Vector2D = { x: -20, y: Math.random() * CANVAS_HEIGHT };
  let attempts = 0;

  do {
    // Spawn from random edge
    const edge = Math.floor(Math.random() * 4);
    switch (edge) {
      case 0: // top
        position = { x: Math.random() * CANVAS_WIDTH, y: -20 };
        break;
      case 1: // right
        position = { x: CANVAS_WIDTH + 20, y: Math.random() * CANVAS_HEIGHT };
        break;
      case 2: // bottom
        position = { x: Math.random() * CANVAS_WIDTH, y: CANVAS_HEIGHT + 20 };
        break;
      default: // left
        position = { x: -20, y: Math.random() * CANVAS_HEIGHT };
        break;
    }
    attempts++;
  } while (
    distanceSquared(position, shipPosition) < SAFE_SPAWN_DISTANCE * SAFE_SPAWN_DISTANCE &&
    attempts < 20
  );

  // Aim roughly toward center with some randomness
  const centerX = CANVAS_WIDTH / 2;
  const centerY = CANVAS_HEIGHT / 2;
  const angleToCenter = Math.atan2(
    centerY - position.y,
    centerX - position.x
  );
  const direction = angleToCenter + (Math.random() - 0.5) * Math.PI * 0.5;

  return new Asteroid(position, 'large', direction);
}

/**
 * Spawn a full wave of asteroids.
 */
export function spawnWave(wave: number, shipPosition: Vector2D): Asteroid[] {
  const count = getAsteroidCountForWave(wave);
  const asteroids: Asteroid[] = [];

  for (let i = 0; i < count; i++) {
    asteroids.push(spawnAsteroid(shipPosition));
  }

  return asteroids;
}

/**
 * Split an asteroid into two smaller ones. Returns empty array if smallest.
 */
export function splitAsteroid(asteroid: Asteroid): Asteroid[] {
  const nextSize: AsteroidSize | null =
    asteroid.size === 'large' ? 'medium' :
    asteroid.size === 'medium' ? 'small' :
    null;

  if (nextSize === null) return [];

  const angle1 = Math.random() * Math.PI * 2;
  const angle2 = angle1 + Math.PI * (0.5 + Math.random() * 0.5);

  return [
    new Asteroid({ ...asteroid.position }, nextSize, angle1),
    new Asteroid({ ...asteroid.position }, nextSize, angle2),
  ];
}

/**
 * Create explosion particles at a position.
 */
export function createExplosion(
  position: Vector2D,
  count?: number,
  speed?: number
): Particle[] {
  const n = count ?? PARTICLE_COUNT_ASTEROID;
  const s = speed ?? PARTICLE_SPEED;
  const particles: Particle[] = [];

  for (let i = 0; i < n; i++) {
    particles.push(new Particle(position, s));
  }

  return particles;
}

/**
 * Create ship explosion particles.
 */
export function createShipExplosion(position: Vector2D): Particle[] {
  return createExplosion(position, PARTICLE_COUNT_SHIP, PARTICLE_SPEED * 1.5);
}
