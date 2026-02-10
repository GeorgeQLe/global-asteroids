import type { Vector2D } from '../types';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  BULLET_SPEED,
  BULLET_LIFETIME,
  BULLET_RADIUS,
} from '../constants';

export class Bullet {
  position: Vector2D;
  velocity: Vector2D;
  radius: number;
  lifetime: number;
  alive: boolean;

  constructor(position: Vector2D, angle: number) {
    this.position = { ...position };
    this.velocity = {
      x: Math.cos(angle) * BULLET_SPEED,
      y: Math.sin(angle) * BULLET_SPEED,
    };
    this.radius = BULLET_RADIUS;
    this.lifetime = BULLET_LIFETIME;
    this.alive = true;
  }

  update(dt: number): void {
    if (!this.alive) return;

    this.lifetime -= dt;
    if (this.lifetime <= 0) {
      this.alive = false;
      return;
    }

    // Position
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;

    // Screen wrapping
    if (this.position.x < 0) this.position.x = CANVAS_WIDTH;
    if (this.position.x > CANVAS_WIDTH) this.position.x = 0;
    if (this.position.y < 0) this.position.y = CANVAS_HEIGHT;
    if (this.position.y > CANVAS_HEIGHT) this.position.y = 0;
  }
}
