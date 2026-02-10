"""Game engine - state machine managing all entities and systems."""

import os
from enum import Enum

from game.constants import (
    SCREEN_WIDTH, SCREEN_HEIGHT, BULLET_MAX_ON_SCREEN,
    EXTRA_LIFE_SCORE, PARTICLE_COUNT_EXPLOSION, HIGHSCORE_FILE
)
from game.entities.ship import Ship
from game.entities.asteroid import Asteroid
from game.entities.bullet import Bullet
from game.entities.particle import Particle
from game.systems.collision import (
    check_bullet_asteroid_collisions,
    check_ship_asteroid_collisions
)
from game.systems.spawner import WaveSpawner


class GameState(Enum):
    TITLE = 1
    PLAYING = 2
    GAME_OVER = 3


class GameEngine:
    """Main game engine managing state, entities, and game logic."""

    def __init__(self):
        self.state = GameState.TITLE
        self.ship = Ship()
        self.asteroids = []
        self.bullets = []
        self.particles = []
        self.spawner = WaveSpawner()
        self.score = 0
        self.high_score = self._load_high_score()
        self.next_extra_life_score = EXTRA_LIFE_SCORE
        self.respawn_timer = 0.0
        self.game_over_timer = 0.0

    def _load_high_score(self):
        """Load high score from file."""
        try:
            if os.path.exists(HIGHSCORE_FILE):
                with open(HIGHSCORE_FILE, 'r') as f:
                    return int(f.read().strip())
        except (ValueError, IOError):
            pass
        return 0

    def _save_high_score(self):
        """Save high score to file."""
        try:
            with open(HIGHSCORE_FILE, 'w') as f:
                f.write(str(self.high_score))
        except IOError:
            pass

    def start_game(self):
        """Start a new game."""
        self.state = GameState.PLAYING
        self.ship = Ship()
        self.asteroids = []
        self.bullets = []
        self.particles = []
        self.spawner.reset()
        self.score = 0
        self.next_extra_life_score = EXTRA_LIFE_SCORE
        self.respawn_timer = 0.0
        self.game_over_timer = 0.0

        # Spawn the first wave
        self.asteroids = self.spawner.start_next_wave(self.ship.x, self.ship.y)

    def update(self, dt, actions, continuous_input):
        """Update the game state for one frame.

        Args:
            dt: time delta in seconds
            actions: dict of single-press actions from input_handler.process_events
            continuous_input: dict of held key states from input_handler.get_continuous_input
        """
        if self.state == GameState.TITLE:
            self._update_title(dt, actions)
        elif self.state == GameState.PLAYING:
            self._update_playing(dt, actions, continuous_input)
        elif self.state == GameState.GAME_OVER:
            self._update_game_over(dt, actions)

    def _update_title(self, dt, actions):
        """Update title screen state."""
        # Update asteroids drifting in the background
        for asteroid in self.asteroids:
            asteroid.update(dt)

        # Spawn some background asteroids if there are none
        if len(self.asteroids) == 0:
            for _ in range(5):
                self.asteroids.append(Asteroid.create_random())

        # Update particles
        for particle in self.particles:
            particle.update(dt)
        self.particles = [p for p in self.particles if p.alive]

        if actions['start']:
            self.start_game()

    def _update_playing(self, dt, actions, continuous_input):
        """Update gameplay state."""
        # Update ship
        if self.ship.alive:
            self.ship.update(
                dt,
                continuous_input['rotate_left'],
                continuous_input['rotate_right'],
                continuous_input['thrust']
            )

            # Generate thrust particles
            if self.ship.thrusting:
                rear_x, rear_y = self.ship.get_rear_center()
                thrust_particles = Particle.create_thrust(
                    rear_x, rear_y, self.ship.angle
                )
                self.particles.extend(thrust_particles)

            # Shooting
            if actions['shoot'] and len(self.bullets) < BULLET_MAX_ON_SCREEN:
                nose_x, nose_y = self.ship.get_nose_position()
                bullet = Bullet(nose_x, nose_y, self.ship.angle)
                self.bullets.append(bullet)
        else:
            # Ship is dead - respawn timer
            self.respawn_timer -= dt
            if self.respawn_timer <= 0:
                if self.ship.lives > 0:
                    self.ship.respawn()
                else:
                    # Game over
                    self.state = GameState.GAME_OVER
                    self.game_over_timer = 2.0  # delay before allowing restart
                    if self.score > self.high_score:
                        self.high_score = self.score
                        self._save_high_score()

        # Update bullets
        for bullet in self.bullets:
            bullet.update(dt)
        self.bullets = [b for b in self.bullets if b.alive]

        # Update asteroids
        for asteroid in self.asteroids:
            asteroid.update(dt)

        # Update particles
        for particle in self.particles:
            particle.update(dt)
        self.particles = [p for p in self.particles if p.alive]

        # Check bullet-asteroid collisions
        collisions = check_bullet_asteroid_collisions(self.bullets, self.asteroids)
        for bullet, asteroid in collisions:
            # Add score
            self._add_score(asteroid.score)

            # Create explosion particles
            explosion = Particle.create_explosion(
                asteroid.x, asteroid.y, PARTICLE_COUNT_EXPLOSION
            )
            self.particles.extend(explosion)

            # Split asteroid
            new_asteroids = Asteroid.split(asteroid)
            self.asteroids.extend(new_asteroids)
            self.asteroids.remove(asteroid)

        # Remove dead bullets (already done above, but collisions may have killed more)
        self.bullets = [b for b in self.bullets if b.alive]

        # Check ship-asteroid collisions
        if self.ship.alive and not self.ship.invulnerable:
            hit_asteroid = check_ship_asteroid_collisions(self.ship, self.asteroids)
            if hit_asteroid is not None:
                self._ship_destroyed()

        # Wave management
        self.spawner.check_wave_complete(self.asteroids)
        if self.spawner.update_delay(dt):
            new_asteroids = self.spawner.start_next_wave(self.ship.x, self.ship.y)
            self.asteroids.extend(new_asteroids)

    def _update_game_over(self, dt, actions):
        """Update game over state."""
        self.game_over_timer -= dt

        # Update asteroids and particles for visual continuity
        for asteroid in self.asteroids:
            asteroid.update(dt)
        for particle in self.particles:
            particle.update(dt)
        self.particles = [p for p in self.particles if p.alive]

        if actions['start'] and self.game_over_timer <= 0:
            self.start_game()

    def _add_score(self, points):
        """Add points to the score and check for extra life."""
        self.score += points
        if self.score >= self.next_extra_life_score:
            self.ship.lives += 1
            self.next_extra_life_score += EXTRA_LIFE_SCORE

    def _ship_destroyed(self):
        """Handle ship destruction."""
        # Create explosion at ship position
        explosion = Particle.create_explosion(
            self.ship.x, self.ship.y, PARTICLE_COUNT_EXPLOSION * 2,
            color=(255, 200, 100)
        )
        self.particles.extend(explosion)

        self.ship.lives -= 1
        self.ship.destroy()
        self.respawn_timer = 2.0  # wait before respawning
