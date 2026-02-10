"""Particle entity for visual effects."""

import math
import random
from game.constants import (
    PARTICLE_SPEED_MIN, PARTICLE_SPEED_MAX,
    PARTICLE_LIFETIME_MIN, PARTICLE_LIFETIME_MAX,
    PARTICLE_THRUST_LIFETIME, PARTICLE_THRUST_SPEED
)


class Particle:
    """A particle for explosions and thrust effects. Color dims over lifetime."""

    def __init__(self, x, y, vx, vy, lifetime, color):
        self.x = x
        self.y = y
        self.vx = vx
        self.vy = vy
        self.lifetime = lifetime
        self.max_lifetime = lifetime
        self.base_color = color
        self.alive = True

    def update(self, dt):
        """Update particle position and lifetime."""
        self.x += self.vx * dt
        self.y += self.vy * dt
        self.lifetime -= dt
        if self.lifetime <= 0:
            self.alive = False

    def get_color(self):
        """Get the current color, dimmed based on remaining lifetime."""
        if self.max_lifetime <= 0:
            return (0, 0, 0)
        ratio = max(0, self.lifetime / self.max_lifetime)
        r = int(self.base_color[0] * ratio)
        g = int(self.base_color[1] * ratio)
        b = int(self.base_color[2] * ratio)
        return (r, g, b)

    @classmethod
    def create_explosion(cls, x, y, count, color=(255, 255, 255)):
        """Create a burst of particles at a position."""
        particles = []
        for _ in range(count):
            angle = random.uniform(0, 2 * math.pi)
            speed = random.uniform(PARTICLE_SPEED_MIN, PARTICLE_SPEED_MAX)
            vx = math.cos(angle) * speed
            vy = math.sin(angle) * speed
            lifetime = random.uniform(PARTICLE_LIFETIME_MIN, PARTICLE_LIFETIME_MAX)
            # Vary the base color slightly
            r = min(255, max(0, color[0] + random.randint(-30, 30)))
            g = min(255, max(0, color[1] + random.randint(-30, 30)))
            b = min(255, max(0, color[2] + random.randint(-30, 30)))
            particles.append(cls(x, y, vx, vy, lifetime, (r, g, b)))
        return particles

    @classmethod
    def create_thrust(cls, x, y, ship_angle):
        """Create thrust particles behind the ship."""
        particles = []
        rad = math.radians(ship_angle + 180)  # opposite of ship direction
        for _ in range(2):
            spread = random.uniform(-0.4, 0.4)
            angle = rad + spread
            speed = random.uniform(PARTICLE_THRUST_SPEED * 0.5, PARTICLE_THRUST_SPEED)
            vx = math.cos(angle) * speed
            vy = math.sin(angle) * speed
            lifetime = random.uniform(PARTICLE_THRUST_LIFETIME * 0.5, PARTICLE_THRUST_LIFETIME)
            # Orange/yellow thrust colors
            color = random.choice([
                (255, 200, 50),
                (255, 150, 30),
                (255, 255, 100),
            ])
            particles.append(cls(x, y, vx, vy, lifetime, color))
        return particles
