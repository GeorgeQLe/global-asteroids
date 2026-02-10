"""Collision detection system using circle-circle (squared distance)."""

from game.constants import SCREEN_WIDTH, SCREEN_HEIGHT


def circles_collide(x1, y1, r1, x2, y2, r2):
    """Check if two circles collide using squared distance (no sqrt).
    Also handles wrap-around by checking the shortest distance across screen edges."""
    dx = abs(x1 - x2)
    dy = abs(y1 - y2)

    # Account for screen wrapping - use shortest distance
    if dx > SCREEN_WIDTH / 2:
        dx = SCREEN_WIDTH - dx
    if dy > SCREEN_HEIGHT / 2:
        dy = SCREEN_HEIGHT - dy

    dist_sq = dx * dx + dy * dy
    radii_sum = r1 + r2
    return dist_sq < radii_sum * radii_sum


def check_bullet_asteroid_collisions(bullets, asteroids):
    """Check collisions between bullets and asteroids.
    Returns list of (bullet, asteroid) pairs that collided."""
    collisions = []
    for bullet in bullets:
        if not bullet.alive:
            continue
        for asteroid in asteroids:
            if circles_collide(bullet.x, bullet.y, bullet.radius,
                               asteroid.x, asteroid.y, asteroid.radius):
                collisions.append((bullet, asteroid))
                bullet.alive = False
                break  # one bullet hits one asteroid
    return collisions


def check_ship_asteroid_collisions(ship, asteroids):
    """Check if the ship collides with any asteroid.
    Returns the asteroid it collided with, or None."""
    if not ship.alive or ship.invulnerable:
        return None
    for asteroid in asteroids:
        if circles_collide(ship.x, ship.y, ship.radius,
                           asteroid.x, asteroid.y, asteroid.radius):
            return asteroid
    return None
