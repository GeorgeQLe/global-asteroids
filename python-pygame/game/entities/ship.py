"""Ship entity for the Asteroids game."""

import math
from game.constants import (
    SCREEN_WIDTH, SCREEN_HEIGHT, SHIP_SIZE, SHIP_ROTATION_SPEED,
    SHIP_THRUST, SHIP_FRICTION, SHIP_MAX_SPEED, SHIP_INVULNERABILITY_TIME,
    SHIP_BLINK_RATE, SHIP_LIVES
)


class Ship:
    """Player-controlled triangular ship."""

    def __init__(self):
        self.x = SCREEN_WIDTH / 2
        self.y = SCREEN_HEIGHT / 2
        self.vx = 0.0
        self.vy = 0.0
        self.angle = -90.0  # pointing up (in pygame coords, -90 is up)
        self.lives = SHIP_LIVES
        self.alive = True
        self.thrusting = False
        self.invulnerable = True
        self.invulnerable_timer = SHIP_INVULNERABILITY_TIME
        self.blink_timer = 0.0
        self.visible = True
        self.radius = SHIP_SIZE * 0.6  # collision radius

    def update(self, dt, rotating_left, rotating_right, thrusting):
        """Update ship state based on input and physics."""
        if not self.alive:
            return

        # Rotation
        if rotating_left:
            self.angle -= SHIP_ROTATION_SPEED * dt
        if rotating_right:
            self.angle += SHIP_ROTATION_SPEED * dt

        # Normalize angle
        self.angle = self.angle % 360

        # Thrust
        self.thrusting = thrusting
        if thrusting:
            rad = math.radians(self.angle)
            self.vx += math.cos(rad) * SHIP_THRUST * dt
            self.vy += math.sin(rad) * SHIP_THRUST * dt

        # Friction
        self.vx *= SHIP_FRICTION
        self.vy *= SHIP_FRICTION

        # Speed cap
        speed = math.sqrt(self.vx ** 2 + self.vy ** 2)
        if speed > SHIP_MAX_SPEED:
            scale = SHIP_MAX_SPEED / speed
            self.vx *= scale
            self.vy *= scale

        # Position update
        self.x += self.vx * dt
        self.y += self.vy * dt

        # Screen wrapping
        self.x = self.x % SCREEN_WIDTH
        self.y = self.y % SCREEN_HEIGHT

        # Invulnerability
        if self.invulnerable:
            self.invulnerable_timer -= dt
            self.blink_timer += dt
            if self.blink_timer >= SHIP_BLINK_RATE:
                self.blink_timer -= SHIP_BLINK_RATE
                self.visible = not self.visible
            if self.invulnerable_timer <= 0:
                self.invulnerable = False
                self.visible = True

    def respawn(self):
        """Respawn the ship at the center of the screen."""
        self.x = SCREEN_WIDTH / 2
        self.y = SCREEN_HEIGHT / 2
        self.vx = 0.0
        self.vy = 0.0
        self.angle = -90.0
        self.alive = True
        self.thrusting = False
        self.invulnerable = True
        self.invulnerable_timer = SHIP_INVULNERABILITY_TIME
        self.blink_timer = 0.0
        self.visible = True

    def destroy(self):
        """Mark the ship as destroyed."""
        self.alive = False
        self.thrusting = False

    def get_nose_position(self):
        """Get the position of the ship's nose (front tip)."""
        rad = math.radians(self.angle)
        nose_x = self.x + math.cos(rad) * SHIP_SIZE
        nose_y = self.y + math.sin(rad) * SHIP_SIZE
        return nose_x, nose_y

    def get_rear_center(self):
        """Get the center of the rear of the ship (for thrust flame)."""
        rad = math.radians(self.angle)
        rear_x = self.x - math.cos(rad) * SHIP_SIZE * 0.6
        rear_y = self.y - math.sin(rad) * SHIP_SIZE * 0.6
        return rear_x, rear_y

    def get_polygon_points(self):
        """Get the three vertices of the triangular ship."""
        rad = math.radians(self.angle)
        cos_a = math.cos(rad)
        sin_a = math.sin(rad)

        # Nose (front)
        nose_x = self.x + cos_a * SHIP_SIZE
        nose_y = self.y + sin_a * SHIP_SIZE

        # Left rear
        left_angle = rad + math.radians(140)
        left_x = self.x + math.cos(left_angle) * SHIP_SIZE * 0.75
        left_y = self.y + math.sin(left_angle) * SHIP_SIZE * 0.75

        # Right rear
        right_angle = rad - math.radians(140)
        right_x = self.x + math.cos(right_angle) * SHIP_SIZE * 0.75
        right_y = self.y + math.sin(right_angle) * SHIP_SIZE * 0.75

        return [(nose_x, nose_y), (left_x, left_y), (right_x, right_y)]

    def get_flame_polygon(self):
        """Get the polygon points for the thrust flame."""
        rad = math.radians(self.angle)

        # Base of flame (rear of ship)
        left_angle = rad + math.radians(160)
        left_x = self.x + math.cos(left_angle) * SHIP_SIZE * 0.45
        left_y = self.y + math.sin(left_angle) * SHIP_SIZE * 0.45

        right_angle = rad - math.radians(160)
        right_x = self.x + math.cos(right_angle) * SHIP_SIZE * 0.45
        right_y = self.y + math.sin(right_angle) * SHIP_SIZE * 0.45

        # Tip of flame (extends behind ship)
        import random
        flame_length = SHIP_SIZE * (0.6 + random.random() * 0.6)
        tip_x = self.x - math.cos(rad) * flame_length
        tip_y = self.y - math.sin(rad) * flame_length

        return [(left_x, left_y), (tip_x, tip_y), (right_x, right_y)]
