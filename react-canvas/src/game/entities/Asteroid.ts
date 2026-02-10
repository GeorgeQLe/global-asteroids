import type { Vector2D, AsteroidSize } from '../types';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  ASTEROID_RADIUS_LARGE,
  ASTEROID_RADIUS_MEDIUM,
  ASTEROID_RADIUS_SMALL,
  ASTEROID_SPEED_LARGE,
  ASTEROID_SPEED_MEDIUM,
  ASTEROID_SPEED_SMALL,
  ASTEROID_VERTICES_MIN,
  ASTEROID_VERTICES_MAX,
  ASTEROID_JAGGEDNESS,
} from '../constants';

function getRadiusForSize(size: AsteroidSize): number {
  switch (size) {
    case 'large': return ASTEROID_RADIUS_LARGE;
    case 'medium': return ASTEROID_RADIUS_MEDIUM;
    case 'small': return ASTEROID_RADIUS_SMALL;
  }
}

function getSpeedForSize(size: AsteroidSize): number {
  switch (size) {
    case 'large': return ASTEROID_SPEED_LARGE;
    case 'medium': return ASTEROID_SPEED_MEDIUM;
    case 'small': return ASTEROID_SPEED_SMALL;
  }
}

function generateVertices(radius: number): number[] {
  const count =
    ASTEROID_VERTICES_MIN +
    Math.floor(Math.random() * (ASTEROID_VERTICES_MAX - ASTEROID_VERTICES_MIN + 1));
  const offsets: number[] = [];
  for (let i = 0; i < count; i++) {
    offsets.push(
      radius * (1 + (Math.random() * 2 - 1) * ASTEROID_JAGGEDNESS)
    );
  }
  return offsets;
}

export class Asteroid {
  position: Vector2D;
  velocity: Vector2D;
  size: AsteroidSize;
  radius: number;
  vertices: number[]; // radial offsets for each vertex
  rotationAngle: number;
  rotationSpeed: number;

  constructor(
    position: Vector2D,
    size: AsteroidSize,
    direction?: number // optional angle in radians
  ) {
    this.position = { ...position };
    this.size = size;
    this.radius = getRadiusForSize(size);
    this.vertices = generateVertices(this.radius);

    const speed = getSpeedForSize(size) * (0.5 + Math.random() * 0.5);
    const angle = direction !== undefined ? direction : Math.random() * Math.PI * 2;
    this.velocity = {
      x: Math.cos(angle) * speed,
      y: Math.sin(angle) * speed,
    };

    this.rotationAngle = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 2; // radians per second
  }

  update(dt: number): void {
    // Position
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;

    // Screen wrapping
    if (this.position.x < -this.radius) this.position.x = CANVAS_WIDTH + this.radius;
    if (this.position.x > CANVAS_WIDTH + this.radius) this.position.x = -this.radius;
    if (this.position.y < -this.radius) this.position.y = CANVAS_HEIGHT + this.radius;
    if (this.position.y > CANVAS_HEIGHT + this.radius) this.position.y = -this.radius;

    // Rotation (visual only)
    this.rotationAngle += this.rotationSpeed * dt;
  }
}
