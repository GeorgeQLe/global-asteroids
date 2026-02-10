// Physics system is largely handled inline by each entity's update() method.
// This file provides any shared utility functions.

import type { Vector2D } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';

/**
 * Wrap a position around the canvas edges.
 */
export function wrapPosition(position: Vector2D, margin: number = 0): void {
  if (position.x < -margin) position.x = CANVAS_WIDTH + margin;
  if (position.x > CANVAS_WIDTH + margin) position.x = -margin;
  if (position.y < -margin) position.y = CANVAS_HEIGHT + margin;
  if (position.y > CANVAS_HEIGHT + margin) position.y = -margin;
}

/**
 * Calculate distance squared between two points.
 */
export function distanceSquared(a: Vector2D, b: Vector2D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}
