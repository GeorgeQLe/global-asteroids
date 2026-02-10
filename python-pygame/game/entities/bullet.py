"""Bullet entity for the Asteroids game."""

import math
from game.constants import (
    SCREEN_WIDTH, SCREEN_HEIGHT, BULLET_SPEED, BULLET_LIFETIME, BULLET_RADIUS
)


class Bullet:
    """A bullet fired from the ship."""

    def __init__(self, x, y, angle):
        rad = math.radians(angle)
        self.x = x
        self.y = y
        self.vx = math.cos(rad) * BULLET_SPEED
        self.vy = math.sin(rad) * BULLET_SPEED
        self.lifetime = BULLET_LIFETIME
        self.radius = BULLET_RADIUS
        self.alive = True

    def update(self, dt):
        """Update bullet position and lifetime."""
        self.x += self.vx * dt
        self.y += self.vy * dt

        # Screen wrapping
        self.x = self.x % SCREEN_WIDTH
        self.y = self.y % SCREEN_HEIGHT

        # Lifetime countdown
        self.lifetime -= dt
        if self.lifetime <= 0:
            self.alive = False
