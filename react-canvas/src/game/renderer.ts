import type { Ship } from './entities/Ship';
import type { Asteroid } from './entities/Asteroid';
import type { Bullet } from './entities/Bullet';
import type { Particle } from './entities/Particle';
import { CANVAS_WIDTH, CANVAS_HEIGHT, SHIP_SIZE } from './constants';

/**
 * Clear the canvas to black.
 */
export function clearCanvas(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

/**
 * Draw a starfield background. Stars are pre-generated and passed in.
 */
export function drawStars(
  ctx: CanvasRenderingContext2D,
  stars: Array<{ x: number; y: number; brightness: number }>
): void {
  for (const star of stars) {
    ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
    ctx.fillRect(star.x, star.y, 1, 1);
  }
}

/**
 * Draw the player ship.
 */
export function drawShip(ctx: CanvasRenderingContext2D, ship: Ship): void {
  if (!ship.alive || !ship.visible) return;

  const { x, y } = ship.position;
  const angle = ship.angle;
  const size = SHIP_SIZE;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Ship body (triangle)
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(size, 0); // nose
  ctx.lineTo(-size * 0.7, -size * 0.6); // top-left
  ctx.lineTo(-size * 0.4, 0); // notch
  ctx.lineTo(-size * 0.7, size * 0.6); // bottom-left
  ctx.closePath();
  ctx.stroke();

  // Thrust flame
  if (ship.thrusting) {
    const flicker = Math.sin(ship.thrustFlicker) * 0.3 + 0.7;
    const flameLength = size * 0.6 * flicker;

    ctx.strokeStyle = `rgba(255, ${150 + Math.random() * 105}, 0, ${flicker})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-size * 0.4, -size * 0.25);
    ctx.lineTo(-size * 0.4 - flameLength, 0);
    ctx.lineTo(-size * 0.4, size * 0.25);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draw an asteroid with its jagged polygon shape.
 */
export function drawAsteroid(ctx: CanvasRenderingContext2D, asteroid: Asteroid): void {
  const { x, y } = asteroid.position;
  const vertices = asteroid.vertices;
  const vertexCount = vertices.length;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(asteroid.rotationAngle);

  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();

  for (let i = 0; i < vertexCount; i++) {
    const angle = (i / vertexCount) * Math.PI * 2;
    const r = vertices[i];
    const vx = Math.cos(angle) * r;
    const vy = Math.sin(angle) * r;

    if (i === 0) {
      ctx.moveTo(vx, vy);
    } else {
      ctx.lineTo(vx, vy);
    }
  }

  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

/**
 * Draw a bullet as a small bright dot.
 */
export function drawBullet(ctx: CanvasRenderingContext2D, bullet: Bullet): void {
  if (!bullet.alive) return;

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(bullet.position.x, bullet.position.y, bullet.radius, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Draw a particle with fade-out.
 */
export function drawParticle(ctx: CanvasRenderingContext2D, particle: Particle): void {
  if (!particle.alive) return;

  const alpha = particle.alpha;
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.beginPath();
  ctx.arc(
    particle.position.x,
    particle.position.y,
    particle.size * alpha,
    0,
    Math.PI * 2
  );
  ctx.fill();
}

/**
 * Draw a small ship icon for the lives display (used by HUD canvas if needed).
 */
export function drawShipIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2); // pointing up

  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.lineTo(-size * 0.7, -size * 0.6);
  ctx.lineTo(-size * 0.4, 0);
  ctx.lineTo(-size * 0.7, size * 0.6);
  ctx.closePath();
  ctx.stroke();

  ctx.restore();
}

/**
 * Draw decorative asteroids drifting on title/game-over screens.
 */
export function drawTitleAsteroids(
  ctx: CanvasRenderingContext2D,
  asteroids: Asteroid[]
): void {
  for (const asteroid of asteroids) {
    drawAsteroid(ctx, asteroid);
  }
}
