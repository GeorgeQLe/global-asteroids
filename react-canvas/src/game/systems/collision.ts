import type { Vector2D } from '../types';
import type { Ship } from '../entities/Ship';
import type { Asteroid } from '../entities/Asteroid';
import type { Bullet } from '../entities/Bullet';

/**
 * Circle-circle collision using squared distance (no sqrt).
 */
export function checkCircleCollision(
  posA: Vector2D,
  radiusA: number,
  posB: Vector2D,
  radiusB: number
): boolean {
  const dx = posA.x - posB.x;
  const dy = posA.y - posB.y;
  const distSq = dx * dx + dy * dy;
  const radSum = radiusA + radiusB;
  return distSq < radSum * radSum;
}

export interface BulletAsteroidHit {
  bulletIndex: number;
  asteroidIndex: number;
}

/**
 * Check all bullet-asteroid collisions.
 * Returns list of hit pairs.
 */
export function checkBulletAsteroidCollisions(
  bullets: Bullet[],
  asteroids: Asteroid[]
): BulletAsteroidHit[] {
  const hits: BulletAsteroidHit[] = [];

  for (let b = 0; b < bullets.length; b++) {
    const bullet = bullets[b];
    if (!bullet.alive) continue;

    for (let a = 0; a < asteroids.length; a++) {
      const asteroid = asteroids[a];
      if (checkCircleCollision(
        bullet.position,
        bullet.radius,
        asteroid.position,
        asteroid.radius
      )) {
        hits.push({ bulletIndex: b, asteroidIndex: a });
        break; // Each bullet can only hit one asteroid
      }
    }
  }

  return hits;
}

/**
 * Check ship-asteroid collisions.
 * Returns index of first asteroid hit, or -1 if none.
 */
export function checkShipAsteroidCollision(
  ship: Ship,
  asteroids: Asteroid[]
): number {
  if (!ship.alive || ship.isInvulnerable) return -1;

  // Use a slightly smaller hitbox for the ship (feels fairer)
  const shipRadius = ship.radius * 0.6;

  for (let a = 0; a < asteroids.length; a++) {
    const asteroid = asteroids[a];
    if (checkCircleCollision(
      ship.position,
      shipRadius,
      asteroid.position,
      asteroid.radius
    )) {
      return a;
    }
  }

  return -1;
}
