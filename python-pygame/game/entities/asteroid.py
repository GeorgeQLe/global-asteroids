"""Asteroid entity for the Asteroids game."""

import math
import random
from enum import Enum
from game.constants import (
    SCREEN_WIDTH, SCREEN_HEIGHT,
    ASTEROID_LARGE_RADIUS, ASTEROID_MEDIUM_RADIUS, ASTEROID_SMALL_RADIUS,
    ASTEROID_MIN_VERTICES, ASTEROID_MAX_VERTICES,
    ASTEROID_RADIAL_OFFSET_MIN, ASTEROID_RADIAL_OFFSET_MAX,
    ASTEROID_LARGE_SPEED_MIN, ASTEROID_LARGE_SPEED_MAX,
    ASTEROID_MEDIUM_SPEED_MIN, ASTEROID_MEDIUM_SPEED_MAX,
    ASTEROID_SMALL_SPEED_MIN, ASTEROID_SMALL_SPEED_MAX,
    ASTEROID_SCORE_LARGE, ASTEROID_SCORE_MEDIUM, ASTEROID_SCORE_SMALL
)


class AsteroidSize(Enum):
    LARGE = 3
    MEDIUM = 2
    SMALL = 1


# Map sizes to radii
SIZE_RADIUS = {
    AsteroidSize.LARGE: ASTEROID_LARGE_RADIUS,
    AsteroidSize.MEDIUM: ASTEROID_MEDIUM_RADIUS,
    AsteroidSize.SMALL: ASTEROID_SMALL_RADIUS,
}

SIZE_SPEED = {
    AsteroidSize.LARGE: (ASTEROID_LARGE_SPEED_MIN, ASTEROID_LARGE_SPEED_MAX),
    AsteroidSize.MEDIUM: (ASTEROID_MEDIUM_SPEED_MIN, ASTEROID_MEDIUM_SPEED_MAX),
    AsteroidSize.SMALL: (ASTEROID_SMALL_SPEED_MIN, ASTEROID_SMALL_SPEED_MAX),
}

SIZE_SCORE = {
    AsteroidSize.LARGE: ASTEROID_SCORE_LARGE,
    AsteroidSize.MEDIUM: ASTEROID_SCORE_MEDIUM,
    AsteroidSize.SMALL: ASTEROID_SCORE_SMALL,
}

# Map sizes to the next smaller size
SIZE_SPLIT = {
    AsteroidSize.LARGE: AsteroidSize.MEDIUM,
    AsteroidSize.MEDIUM: AsteroidSize.SMALL,
    AsteroidSize.SMALL: None,
}


class Asteroid:
    """A drifting asteroid with jagged polygon outline."""

    def __init__(self, x, y, vx, vy, size):
        self.x = x
        self.y = y
        self.vx = vx
        self.vy = vy
        self.size = size
        self.radius = SIZE_RADIUS[size]
        self.score = SIZE_SCORE[size]
        self.rotation_angle = random.uniform(0, 360)
        self.rotation_speed = random.uniform(-90, 90)  # degrees per second

        # Generate jagged polygon vertices (offsets from center)
        self.vertex_count = random.randint(ASTEROID_MIN_VERTICES, ASTEROID_MAX_VERTICES)
        self.vertex_offsets = []
        for i in range(self.vertex_count):
            angle = (2 * math.pi * i) / self.vertex_count
            offset = random.uniform(ASTEROID_RADIAL_OFFSET_MIN, ASTEROID_RADIAL_OFFSET_MAX)
            self.vertex_offsets.append((angle, offset * self.radius))

    def update(self, dt):
        """Update asteroid position."""
        self.x += self.vx * dt
        self.y += self.vy * dt
        self.x = self.x % SCREEN_WIDTH
        self.y = self.y % SCREEN_HEIGHT
        self.rotation_angle += self.rotation_speed * dt

    def get_polygon_points(self):
        """Get the polygon vertices for rendering."""
        rot_rad = math.radians(self.rotation_angle)
        points = []
        for base_angle, dist in self.vertex_offsets:
            angle = base_angle + rot_rad
            px = self.x + math.cos(angle) * dist
            py = self.y + math.sin(angle) * dist
            points.append((px, py))
        return points

    @classmethod
    def create_random(cls, avoid_x=None, avoid_y=None, min_distance=150):
        """Create a random large asteroid, optionally avoiding a position."""
        from game.constants import WAVE_SPAWN_MARGIN

        while True:
            # Spawn at random edge position
            edge = random.randint(0, 3)
            if edge == 0:  # top
                x = random.uniform(0, SCREEN_WIDTH)
                y = random.uniform(-40, 0)
            elif edge == 1:  # bottom
                x = random.uniform(0, SCREEN_WIDTH)
                y = random.uniform(SCREEN_HEIGHT, SCREEN_HEIGHT + 40)
            elif edge == 2:  # left
                x = random.uniform(-40, 0)
                y = random.uniform(0, SCREEN_HEIGHT)
            else:  # right
                x = random.uniform(SCREEN_WIDTH, SCREEN_WIDTH + 40)
                y = random.uniform(0, SCREEN_HEIGHT)

            # Check minimum distance from avoidance point
            if avoid_x is not None and avoid_y is not None:
                dx = x - avoid_x
                dy = y - avoid_y
                if dx * dx + dy * dy < min_distance * min_distance:
                    continue
            break

        # Random velocity
        speed_min, speed_max = SIZE_SPEED[AsteroidSize.LARGE]
        speed = random.uniform(speed_min, speed_max)
        angle = random.uniform(0, 2 * math.pi)
        vx = math.cos(angle) * speed
        vy = math.sin(angle) * speed

        return cls(x, y, vx, vy, AsteroidSize.LARGE)

    @classmethod
    def split(cls, asteroid):
        """Split an asteroid into two smaller asteroids. Returns list of new asteroids or empty list."""
        next_size = SIZE_SPLIT[asteroid.size]
        if next_size is None:
            return []

        new_asteroids = []
        speed_min, speed_max = SIZE_SPEED[next_size]

        for _ in range(2):
            speed = random.uniform(speed_min, speed_max)
            angle = random.uniform(0, 2 * math.pi)
            vx = math.cos(angle) * speed
            vy = math.sin(angle) * speed
            new_asteroids.append(cls(asteroid.x, asteroid.y, vx, vy, next_size))

        return new_asteroids
