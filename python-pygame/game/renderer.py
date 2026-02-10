"""Renderer - all drawing functions for the Asteroids game."""

import math
import random
import pygame
from game.constants import (
    SCREEN_WIDTH, SCREEN_HEIGHT,
    COLOR_WHITE, COLOR_BLACK, COLOR_GRAY, COLOR_DARK_GRAY,
    COLOR_YELLOW, COLOR_ORANGE, COLOR_RED,
    HUD_FONT_SIZE, HUD_SMALL_FONT_SIZE, HUD_TITLE_FONT_SIZE, HUD_MARGIN,
    SHIP_SIZE, BULLET_RADIUS, STAR_COUNT
)
from game.engine import GameState


class Renderer:
    """Handles all rendering for the game."""

    def __init__(self, surface):
        self.surface = surface
        self.font_large = pygame.font.Font(None, HUD_TITLE_FONT_SIZE)
        self.font_medium = pygame.font.Font(None, HUD_FONT_SIZE)
        self.font_small = pygame.font.Font(None, HUD_SMALL_FONT_SIZE)

        # Generate static star positions
        self.stars = []
        for _ in range(STAR_COUNT):
            x = random.randint(0, SCREEN_WIDTH - 1)
            y = random.randint(0, SCREEN_HEIGHT - 1)
            brightness = random.randint(40, 120)
            size = random.choice([1, 1, 1, 2])
            self.stars.append((x, y, brightness, size))

    def render(self, engine):
        """Render the entire frame based on game state."""
        self.surface.fill(COLOR_BLACK)
        self._draw_stars()

        if engine.state == GameState.TITLE:
            self._render_title(engine)
        elif engine.state == GameState.PLAYING:
            self._render_playing(engine)
        elif engine.state == GameState.GAME_OVER:
            self._render_game_over(engine)

    def _render_title(self, engine):
        """Render the title screen."""
        # Draw background asteroids
        for asteroid in engine.asteroids:
            self._draw_asteroid(asteroid)

        # Draw particles
        for particle in engine.particles:
            self._draw_particle(particle)

        # Title text
        title_text = self.font_large.render("ASTEROIDS", True, COLOR_WHITE)
        title_rect = title_text.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 3))
        self.surface.blit(title_text, title_rect)

        # Subtitle
        subtitle_text = self.font_small.render("Press ENTER to start", True, COLOR_GRAY)
        subtitle_rect = subtitle_text.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 3 + 60))
        self.surface.blit(subtitle_text, subtitle_rect)

        # Controls
        controls = [
            "Arrow Keys / WASD - Rotate and Thrust",
            "Space - Shoot",
        ]
        y_offset = SCREEN_HEIGHT // 2 + 40
        for line in controls:
            text = self.font_small.render(line, True, COLOR_DARK_GRAY)
            rect = text.get_rect(center=(SCREEN_WIDTH // 2, y_offset))
            self.surface.blit(text, rect)
            y_offset += 30

        # High score
        if engine.high_score > 0:
            hs_text = self.font_small.render(
                f"High Score: {engine.high_score}", True, COLOR_GRAY
            )
            hs_rect = hs_text.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT - 60))
            self.surface.blit(hs_text, hs_rect)

    def _render_playing(self, engine):
        """Render the gameplay state."""
        # Draw particles (behind everything else)
        for particle in engine.particles:
            self._draw_particle(particle)

        # Draw asteroids
        for asteroid in engine.asteroids:
            self._draw_asteroid(asteroid)

        # Draw bullets
        for bullet in engine.bullets:
            self._draw_bullet(bullet)

        # Draw ship
        if engine.ship.alive:
            self._draw_ship(engine.ship)

        # Draw HUD
        self._draw_hud(engine)

    def _render_game_over(self, engine):
        """Render the game over screen."""
        # Draw remaining entities
        for particle in engine.particles:
            self._draw_particle(particle)
        for asteroid in engine.asteroids:
            self._draw_asteroid(asteroid)

        # Draw HUD
        self._draw_hud(engine)

        # Game over text
        go_text = self.font_large.render("GAME OVER", True, COLOR_WHITE)
        go_rect = go_text.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 3))
        self.surface.blit(go_text, go_rect)

        # Final score
        score_text = self.font_medium.render(
            f"Final Score: {engine.score}", True, COLOR_GRAY
        )
        score_rect = score_text.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 3 + 60))
        self.surface.blit(score_text, score_rect)

        # New high score notification
        if engine.score >= engine.high_score and engine.score > 0:
            hs_text = self.font_small.render("NEW HIGH SCORE!", True, COLOR_YELLOW)
            hs_rect = hs_text.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 3 + 100))
            self.surface.blit(hs_text, hs_rect)

        # Restart prompt
        if engine.game_over_timer <= 0:
            restart_text = self.font_small.render(
                "Press ENTER to play again", True, COLOR_GRAY
            )
            restart_rect = restart_text.get_rect(
                center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT * 2 // 3)
            )
            self.surface.blit(restart_text, restart_rect)

    def _draw_stars(self):
        """Draw static background stars."""
        for x, y, brightness, size in self.stars:
            color = (brightness, brightness, brightness)
            if size == 1:
                self.surface.set_at((x, y), color)
            else:
                pygame.draw.circle(self.surface, color, (x, y), size)

    def _draw_ship(self, ship):
        """Draw the ship as a triangular outline."""
        if not ship.visible:
            return

        points = ship.get_polygon_points()
        # Convert to integer tuples for pygame
        int_points = [(int(x), int(y)) for x, y in points]
        pygame.draw.polygon(self.surface, COLOR_WHITE, int_points, 2)

        # Draw thrust flame
        if ship.thrusting:
            flame_points = ship.get_flame_polygon()
            int_flame = [(int(x), int(y)) for x, y in flame_points]
            # Flicker between orange and yellow
            flame_color = random.choice([COLOR_ORANGE, COLOR_YELLOW, COLOR_RED])
            pygame.draw.polygon(self.surface, flame_color, int_flame, 2)

    def _draw_asteroid(self, asteroid):
        """Draw an asteroid as a jagged polygon outline."""
        points = asteroid.get_polygon_points()
        int_points = [(int(x), int(y)) for x, y in points]
        if len(int_points) >= 3:
            pygame.draw.polygon(self.surface, COLOR_WHITE, int_points, 1)

    def _draw_bullet(self, bullet):
        """Draw a bullet as a small filled circle."""
        pygame.draw.circle(
            self.surface, COLOR_WHITE,
            (int(bullet.x), int(bullet.y)), BULLET_RADIUS
        )

    def _draw_particle(self, particle):
        """Draw a particle as a small dot with dimming color."""
        color = particle.get_color()
        # Don't draw if color is too dark
        if color[0] < 5 and color[1] < 5 and color[2] < 5:
            return
        pygame.draw.circle(
            self.surface, color,
            (int(particle.x), int(particle.y)), 2
        )

    def _draw_hud(self, engine):
        """Draw the heads-up display (score, lives, wave)."""
        # Score (top left)
        score_text = self.font_medium.render(str(engine.score), True, COLOR_WHITE)
        self.surface.blit(score_text, (HUD_MARGIN, HUD_MARGIN))

        # High score (top center)
        hs_text = self.font_small.render(
            f"HI {engine.high_score}", True, COLOR_GRAY
        )
        hs_rect = hs_text.get_rect(midtop=(SCREEN_WIDTH // 2, HUD_MARGIN + 5))
        self.surface.blit(hs_text, hs_rect)

        # Lives (top left, below score) - draw small ship icons
        lives_x = HUD_MARGIN
        lives_y = HUD_MARGIN + 40
        for i in range(engine.ship.lives):
            self._draw_life_icon(lives_x + i * 25, lives_y)

        # Wave number (top right)
        if engine.spawner.wave_number > 0:
            wave_text = self.font_small.render(
                f"Wave {engine.spawner.wave_number}", True, COLOR_GRAY
            )
            wave_rect = wave_text.get_rect(topright=(SCREEN_WIDTH - HUD_MARGIN, HUD_MARGIN + 5))
            self.surface.blit(wave_text, wave_rect)

    def _draw_life_icon(self, x, y):
        """Draw a small ship icon representing a life."""
        size = 8
        angle = -math.pi / 2  # pointing up

        nose_x = x + math.cos(angle) * size
        nose_y = y + math.sin(angle) * size

        left_angle = angle + math.radians(140)
        left_x = x + math.cos(left_angle) * size * 0.75
        left_y = y + math.sin(left_angle) * size * 0.75

        right_angle = angle - math.radians(140)
        right_x = x + math.cos(right_angle) * size * 0.75
        right_y = y + math.sin(right_angle) * size * 0.75

        points = [
            (int(nose_x), int(nose_y)),
            (int(left_x), int(left_y)),
            (int(right_x), int(right_y))
        ]
        pygame.draw.polygon(self.surface, COLOR_WHITE, points, 1)
