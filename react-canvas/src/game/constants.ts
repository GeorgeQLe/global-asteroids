// Canvas
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

// Ship
export const SHIP_SIZE = 20;
export const SHIP_ROTATION_SPEED = 270; // degrees per second
export const SHIP_THRUST = 200; // pixels per second squared
export const SHIP_FRICTION = 0.99;
export const SHIP_MAX_SPEED = 400;
export const SHIP_INVULNERABILITY_TIME = 3; // seconds
export const SHIP_BLINK_RATE = 0.1; // seconds per blink toggle

// Bullets
export const BULLET_SPEED = 500;
export const BULLET_LIFETIME = 1; // seconds
export const BULLET_MAX_COUNT = 4;
export const BULLET_RADIUS = 2;

// Asteroids
export const ASTEROID_RADIUS_LARGE = 40;
export const ASTEROID_RADIUS_MEDIUM = 20;
export const ASTEROID_RADIUS_SMALL = 10;
export const ASTEROID_SPEED_LARGE = 60;
export const ASTEROID_SPEED_MEDIUM = 100;
export const ASTEROID_SPEED_SMALL = 150;
export const ASTEROID_VERTICES_MIN = 8;
export const ASTEROID_VERTICES_MAX = 12;
export const ASTEROID_JAGGEDNESS = 0.4; // how much vertices deviate from radius

// Scoring
export const SCORE_LARGE = 20;
export const SCORE_MEDIUM = 50;
export const SCORE_SMALL = 100;
export const EXTRA_LIFE_SCORE = 10000;

// Waves
export const WAVE_START_ASTEROIDS = 4;
export const WAVE_ASTEROID_INCREMENT = 2;
export const WAVE_MAX_ASTEROIDS = 12;
export const WAVE_DELAY = 2; // seconds between waves

// Particles
export const PARTICLE_COUNT_ASTEROID = 8;
export const PARTICLE_COUNT_SHIP = 20;
export const PARTICLE_LIFETIME = 1; // seconds
export const PARTICLE_SPEED = 100;

// Starting lives
export const STARTING_LIVES = 3;

// Respawn delay after death
export const RESPAWN_DELAY = 1.5; // seconds

// Safe spawn distance (keep asteroids away from ship spawn)
export const SAFE_SPAWN_DISTANCE = 150;
