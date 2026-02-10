import type { Vector2D } from '../types';
import { PARTICLE_LIFETIME, PARTICLE_SPEED } from '../constants';

export class Particle {
  position: Vector2D;
  velocity: Vector2D;
  lifetime: number;
  maxLifetime: number;
  alive: boolean;
  size: number;

  constructor(position: Vector2D, baseSpeed?: number) {
    this.position = { ...position };
    const speed = (baseSpeed ?? PARTICLE_SPEED) * (0.3 + Math.random() * 0.7);
    const angle = Math.random() * Math.PI * 2;
    this.velocity = {
      x: Math.cos(angle) * speed,
      y: Math.sin(angle) * speed,
    };
    this.maxLifetime = PARTICLE_LIFETIME * (0.5 + Math.random() * 0.5);
    this.lifetime = this.maxLifetime;
    this.alive = true;
    this.size = 1 + Math.random() * 2;
  }

  get alpha(): number {
    return Math.max(0, this.lifetime / this.maxLifetime);
  }

  update(dt: number): void {
    if (!this.alive) return;

    this.lifetime -= dt;
    if (this.lifetime <= 0) {
      this.alive = false;
      return;
    }

    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;

    // Slow down particles
    this.velocity.x *= 0.98;
    this.velocity.y *= 0.98;
  }
}
