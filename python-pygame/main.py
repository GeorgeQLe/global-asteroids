"""Asteroids - Main entry point.

A classic Asteroids arcade game built with Pygame.
Controls: Arrow Keys / WASD to rotate and thrust, Space to shoot.
"""

import sys
import pygame

from game.constants import SCREEN_WIDTH, SCREEN_HEIGHT, FPS, COLOR_BLACK
from game.engine import GameEngine
from game.renderer import Renderer
from game.systems.input_handler import process_events, get_continuous_input


def main():
    """Initialize pygame, create window, and run the main game loop."""
    pygame.init()

    screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
    pygame.display.set_caption("Asteroids")
    clock = pygame.time.Clock()

    engine = GameEngine()
    renderer = Renderer(screen)

    running = True
    while running:
        # Calculate delta time in seconds
        dt = clock.tick(FPS) / 1000.0
        # Clamp dt to prevent physics issues on lag spikes
        dt = min(dt, 0.05)

        # Process input
        events = pygame.event.get()
        actions = process_events(events)
        keys = pygame.key.get_pressed()
        continuous_input = get_continuous_input(keys)

        # Check for quit
        if actions['quit']:
            running = False
            continue

        # Update game state
        engine.update(dt, actions, continuous_input)

        # Render
        renderer.render(engine)
        pygame.display.flip()

    pygame.quit()
    sys.exit()


if __name__ == "__main__":
    main()
