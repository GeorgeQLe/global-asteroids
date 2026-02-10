"""Physics system - handles position updates, wrapping, and friction."""

from game.constants import SCREEN_WIDTH, SCREEN_HEIGHT


def update_positions(entities, dt):
    """Update positions of a list of entities that have x, y, vx, vy attributes."""
    for entity in entities:
        entity.update(dt)


def wrap_position(entity):
    """Wrap an entity's position around the screen edges."""
    entity.x = entity.x % SCREEN_WIDTH
    entity.y = entity.y % SCREEN_HEIGHT


def apply_friction(entity, friction):
    """Apply friction to an entity's velocity."""
    entity.vx *= friction
    entity.vy *= friction
