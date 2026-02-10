import type { Vector2D } from '../types';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  SHIP_SIZE,
  SHIP_ROTATION_SPEED,
  SHIP_THRUST,
  SHIP_FRICTION,
  SHIP_MAX_SPEED,
  SHIP_INVULNERABILITY_TIME,
  SHIP_BLINK_RATE,
} from '../constants';

export class Ship {
  position: Vector2D;
  velocity: Vector2D;
  angle: number; // radians, 0 = pointing right
  radius: number;
  thrusting: boolean;
  rotatingLeft: boolean;
  rotatingRight: boolean;
  alive: boolean;
  invulnerableTimer: number;
  blinkTimer: number;
  visible: boolean;
  thrustFlicker: number;

  constructor() {
    this.position = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };
    this.velocity = { x: 0, y: 0 };
    this.angle = -Math.PI / 2; // pointing up
    this.radius = SHIP_SIZE;
    this.thrusting = false;
    this.rotatingLeft = false;
    this.rotatingRight = false;
    this.alive = true;
    this.invulnerableTimer = 0;
    this.blinkTimer = 0;
    this.visible = true;
    this.thrustFlicker = 0;
  }

  reset(): void {
    this.position = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 };
    this.velocity = { x: 0, y: 0 };
    this.angle = -Math.PI / 2;
    this.thrusting = false;
    this.rotatingLeft = false;
    this.rotatingRight = false;
    this.alive = true;
    this.invulnerableTimer = SHIP_INVULNERABILITY_TIME;
    this.blinkTimer = 0;
    this.visible = true;
    this.thrustFlicker = 0;
  }

  get isInvulnerable(): boolean {
    return this.invulnerableTimer > 0;
  }

  update(dt: number): void {
    if (!this.alive) return;

    // Rotation
    const rotSpeed = (SHIP_ROTATION_SPEED * Math.PI) / 180; // convert to radians
    if (this.rotatingLeft) {
      this.angle -= rotSpeed * dt;
    }
    if (this.rotatingRight) {
      this.angle += rotSpeed * dt;
    }

    // Thrust
    if (this.thrusting) {
      this.velocity.x += Math.cos(this.angle) * SHIP_THRUST * dt;
      this.velocity.y += Math.sin(this.angle) * SHIP_THRUST * dt;
    }

    // Friction
    this.velocity.x *= SHIP_FRICTION;
    this.velocity.y *= SHIP_FRICTION;

    // Speed cap
    const speed = Math.sqrt(
      this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y
    );
    if (speed > SHIP_MAX_SPEED) {
      this.velocity.x = (this.velocity.x / speed) * SHIP_MAX_SPEED;
      this.velocity.y = (this.velocity.y / speed) * SHIP_MAX_SPEED;
    }

    // Position
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;

    // Screen wrapping
    if (this.position.x < -this.radius) this.position.x = CANVAS_WIDTH + this.radius;
    if (this.position.x > CANVAS_WIDTH + this.radius) this.position.x = -this.radius;
    if (this.position.y < -this.radius) this.position.y = CANVAS_HEIGHT + this.radius;
    if (this.position.y > CANVAS_HEIGHT + this.radius) this.position.y = -this.radius;

    // Invulnerability
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
      this.blinkTimer += dt;
      if (this.blinkTimer >= SHIP_BLINK_RATE) {
        this.blinkTimer -= SHIP_BLINK_RATE;
        this.visible = !this.visible;
      }
      if (this.invulnerableTimer <= 0) {
        this.invulnerableTimer = 0;
        this.visible = true;
      }
    }

    // Thrust flame flicker
    this.thrustFlicker += dt * 20;
  }
}
