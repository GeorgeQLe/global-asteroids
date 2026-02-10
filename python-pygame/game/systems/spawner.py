"""Wave management and asteroid spawning system."""

from game.entities.asteroid import Asteroid
from game.constants import (
    WAVE_START_ASTEROIDS, WAVE_INCREMENT, WAVE_MAX_ASTEROIDS, WAVE_SPAWN_MARGIN
)


class WaveSpawner:
    """Manages asteroid wave spawning and progression."""

    def __init__(self):
        self.wave_number = 0
        self.wave_delay = 0.0  # delay before next wave starts
        self.waiting_for_wave = False

    def get_asteroid_count(self):
        """Get the number of asteroids for the current wave."""
        count = WAVE_START_ASTEROIDS + (self.wave_number - 1) * WAVE_INCREMENT
        return min(count, WAVE_MAX_ASTEROIDS)

    def start_next_wave(self, ship_x, ship_y):
        """Spawn asteroids for the next wave. Returns list of new asteroids."""
        self.wave_number += 1
        count = self.get_asteroid_count()
        asteroids = []
        for _ in range(count):
            asteroid = Asteroid.create_random(
                avoid_x=ship_x,
                avoid_y=ship_y,
                min_distance=WAVE_SPAWN_MARGIN
            )
            asteroids.append(asteroid)
        self.waiting_for_wave = False
        return asteroids

    def check_wave_complete(self, asteroids):
        """Check if all asteroids are destroyed and a new wave should start."""
        if len(asteroids) == 0 and not self.waiting_for_wave:
            self.waiting_for_wave = True
            self.wave_delay = 1.5  # 1.5 second delay before next wave
            return True
        return False

    def update_delay(self, dt):
        """Update the wave delay timer. Returns True when ready to spawn."""
        if self.waiting_for_wave:
            self.wave_delay -= dt
            if self.wave_delay <= 0:
                return True
        return False

    def reset(self):
        """Reset the spawner for a new game."""
        self.wave_number = 0
        self.waiting_for_wave = False
        self.wave_delay = 0.0
