"""Input handling system - processes pygame events and key states."""

import pygame


def process_events(events):
    """Process pygame events and return action dict for single-press actions.

    Returns:
        dict with keys:
            'quit': bool - window close requested
            'shoot': bool - fire bullet
            'start': bool - start/restart game (Enter key)
    """
    actions = {
        'quit': False,
        'shoot': False,
        'start': False,
    }

    for event in events:
        if event.type == pygame.QUIT:
            actions['quit'] = True
        elif event.type == pygame.KEYDOWN:
            if event.key == pygame.K_SPACE:
                actions['shoot'] = True
            if event.key in (pygame.K_RETURN, pygame.K_KP_ENTER):
                actions['start'] = True
            if event.key == pygame.K_ESCAPE:
                actions['quit'] = True

    return actions


def get_continuous_input(keys):
    """Process held key states for continuous input.

    Args:
        keys: result of pygame.key.get_pressed()

    Returns:
        dict with keys:
            'rotate_left': bool
            'rotate_right': bool
            'thrust': bool
    """
    return {
        'rotate_left': keys[pygame.K_LEFT] or keys[pygame.K_a],
        'rotate_right': keys[pygame.K_RIGHT] or keys[pygame.K_d],
        'thrust': keys[pygame.K_UP] or keys[pygame.K_w],
    }
