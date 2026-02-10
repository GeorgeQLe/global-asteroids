use macroquad::prelude::*;
use macroquad::rand::gen_range;
use std::f32::consts::PI;

const WIDTH: f32 = 800.0;
const HEIGHT: f32 = 600.0;
const SHIP_SIZE: f32 = 20.0;
const SHIP_ROTATION_SPEED: f32 = 270.0; // degrees per second
const SHIP_THRUST: f32 = 200.0;
const SHIP_FRICTION: f32 = 0.99;
const SHIP_MAX_SPEED: f32 = 400.0;
const SHIP_COLLISION_RADIUS: f32 = 10.0;
const SHIP_INVULNERABLE_TIME: f32 = 3.0;
const SHIP_BLINK_INTERVAL: f32 = 0.1;
const SHIP_RESPAWN_DELAY: f32 = 1.5;

const BULLET_SPEED: f32 = 500.0;
const BULLET_LIFETIME: f32 = 1.0;
const BULLET_RADIUS: f32 = 2.0;
const MAX_BULLETS: usize = 4;
const SHOOT_COOLDOWN: f32 = 0.15;

const LARGE_ASTEROID_RADIUS: f32 = 40.0;
const MEDIUM_ASTEROID_RADIUS: f32 = 20.0;
const SMALL_ASTEROID_RADIUS: f32 = 10.0;
const LARGE_ASTEROID_SPEED: f32 = 50.0;
const MEDIUM_ASTEROID_SPEED: f32 = 80.0;
const SMALL_ASTEROID_SPEED: f32 = 120.0;
const LARGE_ASTEROID_SCORE: u32 = 20;
const MEDIUM_ASTEROID_SCORE: u32 = 50;
const SMALL_ASTEROID_SCORE: u32 = 100;
const ASTEROID_JAGGEDNESS: f32 = 0.4;
const ASTEROID_MIN_VERTICES: usize = 8;
const ASTEROID_MAX_VERTICES: usize = 12;

const STARTING_ASTEROIDS: usize = 4;
const ASTEROIDS_PER_WAVE: usize = 2;
const MAX_ASTEROIDS_PER_WAVE: usize = 12;
const WAVE_DELAY: f32 = 2.0;
const SPAWN_MIN_DISTANCE: f32 = 150.0;

const STARTING_LIVES: u32 = 3;
const EXTRA_LIFE_SCORE: u32 = 10000;

const NUM_STARS: usize = 150;

const SCREEN_SHAKE_DURATION: f32 = 0.3;
const SCREEN_SHAKE_INTENSITY: f32 = 8.0;

const GAME_OVER_RESTART_DELAY: f32 = 2.0;

const HIGHSCORE_FILE: &str = ".asteroids_highscore_rust";

// ─── Enums ───

#[derive(Clone, Copy, PartialEq)]
enum GamePhase {
    Title,
    Playing,
    GameOver,
}

#[derive(Clone, Copy, PartialEq)]
enum AsteroidSize {
    Large,
    Medium,
    Small,
}

// ─── Structs ───

struct Ship {
    x: f32,
    y: f32,
    vx: f32,
    vy: f32,
    angle: f32, // radians
    radius: f32,
    alive: bool,
    invulnerable_timer: f32,
    blink_timer: f32,
    visible: bool,
    thrusting: bool,
    thrust_flicker: f32,
    shoot_cooldown: f32,
}

struct Asteroid {
    x: f32,
    y: f32,
    vx: f32,
    vy: f32,
    radius: f32,
    rotation_angle: f32,
    rotation_speed: f32,
    size: AsteroidSize,
    score: u32,
    alive: bool,
    vertices: Vec<(f32, f32)>, // (angle, distance)
}

struct Bullet {
    x: f32,
    y: f32,
    vx: f32,
    vy: f32,
    radius: f32,
    lifetime: f32,
    alive: bool,
}

struct Particle {
    x: f32,
    y: f32,
    vx: f32,
    vy: f32,
    lifetime: f32,
    max_lifetime: f32,
    color: Color,
    alive: bool,
}

struct Star {
    x: f32,
    y: f32,
    brightness: f32,
    size: f32,
}

struct Game {
    state: GamePhase,
    ship: Ship,
    asteroids: Vec<Asteroid>,
    bullets: Vec<Bullet>,
    particles: Vec<Particle>,
    stars: Vec<Star>,
    score: u32,
    lives: u32,
    wave: u32,
    wave_timer: f32,
    next_extra_life: u32,
    high_score: u32,
    respawn_timer: f32,
    screen_shake_timer: f32,
    game_over_timer: f32,
    title_blink_timer: f32,
    title_blink_visible: bool,
    new_high_score: bool,
}

// ─── Ship ───

impl Ship {
    fn new() -> Self {
        Ship {
            x: WIDTH / 2.0,
            y: HEIGHT / 2.0,
            vx: 0.0,
            vy: 0.0,
            angle: -PI / 2.0, // pointing up
            radius: SHIP_COLLISION_RADIUS,
            alive: true,
            invulnerable_timer: 0.0,
            blink_timer: 0.0,
            visible: true,
            thrusting: false,
            thrust_flicker: 0.0,
            shoot_cooldown: 0.0,
        }
    }

    fn reset(&mut self) {
        self.x = WIDTH / 2.0;
        self.y = HEIGHT / 2.0;
        self.vx = 0.0;
        self.vy = 0.0;
        self.angle = -PI / 2.0;
        self.alive = true;
        self.invulnerable_timer = SHIP_INVULNERABLE_TIME;
        self.blink_timer = 0.0;
        self.visible = true;
        self.thrusting = false;
        self.thrust_flicker = 0.0;
        self.shoot_cooldown = 0.0;
    }

    /// Returns the 4 polygon points: nose, left wing, back indent, right wing.
    fn get_points(&self) -> [(f32, f32); 4] {
        let cos_a = self.angle.cos();
        let sin_a = self.angle.sin();
        let s = SHIP_SIZE;

        // nose
        let nose = (self.x + cos_a * s, self.y + sin_a * s);
        // left wing
        let left = (
            self.x + (self.angle + 2.4).cos() * s * 0.6,
            self.y + (self.angle + 2.4).sin() * s * 0.6,
        );
        // back indent
        let back = (
            self.x - cos_a * s * 0.35,
            self.y - sin_a * s * 0.35,
        );
        // right wing
        let right = (
            self.x + (self.angle - 2.4).cos() * s * 0.6,
            self.y + (self.angle - 2.4).sin() * s * 0.6,
        );

        [nose, left, back, right]
    }
}

// ─── Asteroid ───

impl Asteroid {
    fn new(x: f32, y: f32, size: AsteroidSize) -> Self {
        let (radius, speed, score) = match size {
            AsteroidSize::Large => (LARGE_ASTEROID_RADIUS, LARGE_ASTEROID_SPEED, LARGE_ASTEROID_SCORE),
            AsteroidSize::Medium => (MEDIUM_ASTEROID_RADIUS, MEDIUM_ASTEROID_SPEED, MEDIUM_ASTEROID_SCORE),
            AsteroidSize::Small => (SMALL_ASTEROID_RADIUS, SMALL_ASTEROID_SPEED, SMALL_ASTEROID_SCORE),
        };

        let angle = gen_range(0.0, 2.0 * PI);
        let vx = angle.cos() * speed;
        let vy = angle.sin() * speed;

        let rotation_speed = gen_range(-90.0_f32, 90.0_f32).to_radians();

        let num_vertices = gen_range(ASTEROID_MIN_VERTICES as i32, ASTEROID_MAX_VERTICES as i32 + 1) as usize;
        let mut vertices = Vec::with_capacity(num_vertices);
        for i in 0..num_vertices {
            let vert_angle = (i as f32 / num_vertices as f32) * 2.0 * PI;
            let dist = radius * (1.0 + gen_range(-ASTEROID_JAGGEDNESS, ASTEROID_JAGGEDNESS));
            vertices.push((vert_angle, dist));
        }

        Asteroid {
            x,
            y,
            vx,
            vy,
            radius,
            rotation_angle: gen_range(0.0, 2.0 * PI),
            rotation_speed,
            size,
            score,
            alive: true,
            vertices,
        }
    }

    fn spawn_at_edge(ship_x: f32, ship_y: f32, size: AsteroidSize) -> Self {
        loop {
            let (x, y) = match gen_range(0, 4) {
                0 => (gen_range(0.0, WIDTH), 0.0),   // top
                1 => (gen_range(0.0, WIDTH), HEIGHT), // bottom
                2 => (0.0, gen_range(0.0, HEIGHT)),   // left
                _ => (WIDTH, gen_range(0.0, HEIGHT)), // right
            };

            let dx = x - ship_x;
            let dy = y - ship_y;
            if dx * dx + dy * dy >= SPAWN_MIN_DISTANCE * SPAWN_MIN_DISTANCE {
                return Asteroid::new(x, y, size);
            }
        }
    }
}

// ─── Bullet ───

impl Bullet {
    fn new(x: f32, y: f32, angle: f32) -> Self {
        Bullet {
            x,
            y,
            vx: angle.cos() * BULLET_SPEED,
            vy: angle.sin() * BULLET_SPEED,
            radius: BULLET_RADIUS,
            lifetime: BULLET_LIFETIME,
            alive: true,
        }
    }
}

// ─── Particle ───

impl Particle {
    fn new(x: f32, y: f32, color: Color) -> Self {
        let angle = gen_range(0.0, 2.0 * PI);
        let speed = gen_range(30.0, 150.0);
        let lifetime = gen_range(0.3, 1.0);
        Particle {
            x,
            y,
            vx: angle.cos() * speed,
            vy: angle.sin() * speed,
            lifetime,
            max_lifetime: lifetime,
            color,
            alive: true,
        }
    }
}

// ─── Star ───

impl Star {
    fn new() -> Self {
        Star {
            x: gen_range(0.0, WIDTH),
            y: gen_range(0.0, HEIGHT),
            brightness: gen_range(0.3, 1.0),
            size: gen_range(1.0, 2.5),
        }
    }
}

// ─── Helpers ───

fn wrap_position(x: &mut f32, y: &mut f32) {
    if *x < 0.0 {
        *x += WIDTH;
    } else if *x > WIDTH {
        *x -= WIDTH;
    }
    if *y < 0.0 {
        *y += HEIGHT;
    } else if *y > HEIGHT {
        *y -= HEIGHT;
    }
}

fn circles_collide(x1: f32, y1: f32, r1: f32, x2: f32, y2: f32, r2: f32) -> bool {
    let dx = x1 - x2;
    let dy = y1 - y2;
    let dist_sq = dx * dx + dy * dy;
    let radii = r1 + r2;
    dist_sq < radii * radii
}

/// Check collision with wrapping: test the base position and wrapped copies.
fn circles_collide_wrapped(x1: f32, y1: f32, r1: f32, x2: f32, y2: f32, r2: f32) -> bool {
    for dx in [-WIDTH, 0.0, WIDTH] {
        for dy in [-HEIGHT, 0.0, HEIGHT] {
            if circles_collide(x1 + dx, y1 + dy, r1, x2, y2, r2) {
                return true;
            }
        }
    }
    false
}

fn load_high_score() -> u32 {
    let path = dirs_path();
    std::fs::read_to_string(path)
        .ok()
        .and_then(|s| s.trim().parse::<u32>().ok())
        .unwrap_or(0)
}

fn save_high_score(score: u32) {
    let path = dirs_path();
    let _ = std::fs::write(path, score.to_string());
}

fn dirs_path() -> std::path::PathBuf {
    let mut path = dirs_home();
    path.push(HIGHSCORE_FILE);
    path
}

fn dirs_home() -> std::path::PathBuf {
    std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .map(std::path::PathBuf::from)
        .unwrap_or_else(|_| std::path::PathBuf::from("."))
}

// ─── Drawing helpers ───

fn draw_polygon_lines(points: &[(f32, f32)], color: Color) {
    let n = points.len();
    for i in 0..n {
        let j = (i + 1) % n;
        draw_line(points[i].0, points[i].1, points[j].0, points[j].1, 1.5, color);
    }
}

/// Draw something at position with screen-wrap duplication (draws at up to 4 positions).
fn draw_wrapped<F: Fn(f32, f32)>(x: f32, y: f32, margin: f32, draw_fn: F) {
    // Base draw
    draw_fn(x, y);

    // Edge duplication
    let near_left = x < margin;
    let near_right = x > WIDTH - margin;
    let near_top = y < margin;
    let near_bottom = y > HEIGHT - margin;

    if near_left {
        draw_fn(x + WIDTH, y);
    }
    if near_right {
        draw_fn(x - WIDTH, y);
    }
    if near_top {
        draw_fn(x, y + HEIGHT);
    }
    if near_bottom {
        draw_fn(x, y - HEIGHT);
    }

    // Corner duplication
    if near_left && near_top {
        draw_fn(x + WIDTH, y + HEIGHT);
    }
    if near_left && near_bottom {
        draw_fn(x + WIDTH, y - HEIGHT);
    }
    if near_right && near_top {
        draw_fn(x - WIDTH, y + HEIGHT);
    }
    if near_right && near_bottom {
        draw_fn(x - WIDTH, y - HEIGHT);
    }
}

fn draw_ship_shape(cx: f32, cy: f32, angle: f32, size: f32, color: Color) {
    let cos_a = angle.cos();
    let sin_a = angle.sin();

    let nose = (cx + cos_a * size, cy + sin_a * size);
    let left = (
        cx + (angle + 2.4).cos() * size * 0.6,
        cy + (angle + 2.4).sin() * size * 0.6,
    );
    let back = (
        cx - cos_a * size * 0.35,
        cy - sin_a * size * 0.35,
    );
    let right = (
        cx + (angle - 2.4).cos() * size * 0.6,
        cy + (angle - 2.4).sin() * size * 0.6,
    );

    draw_polygon_lines(&[nose, left, back, right], color);
}

fn draw_ship_at(ship: &Ship, ox: f32, oy: f32) {
    let dx = ox - ship.x;
    let dy = oy - ship.y;
    let pts = ship.get_points();
    let shifted: Vec<(f32, f32)> = pts.iter().map(|(px, py)| (px + dx, py + dy)).collect();
    draw_polygon_lines(&shifted, WHITE);

    // Thrust flame
    if ship.thrusting {
        let cos_a = ship.angle.cos();
        let sin_a = ship.angle.sin();
        let back_x = ox - cos_a * SHIP_SIZE * 0.35;
        let back_y = oy - sin_a * SHIP_SIZE * 0.35;
        let flame_len = SHIP_SIZE * 0.5 * (0.7 + ship.thrust_flicker * 0.6);
        let flame_tip = (back_x - cos_a * flame_len, back_y - sin_a * flame_len);
        let flame_left = (
            ox + (ship.angle + 2.7).cos() * SHIP_SIZE * 0.25,
            oy + (ship.angle + 2.7).sin() * SHIP_SIZE * 0.25,
        );
        let flame_right = (
            ox + (ship.angle - 2.7).cos() * SHIP_SIZE * 0.25,
            oy + (ship.angle - 2.7).sin() * SHIP_SIZE * 0.25,
        );
        let flame_color = Color::new(1.0, 0.6, 0.2, 1.0);
        draw_line(flame_left.0, flame_left.1, flame_tip.0, flame_tip.1, 1.5, flame_color);
        draw_line(flame_right.0, flame_right.1, flame_tip.0, flame_tip.1, 1.5, flame_color);
    }
}

fn draw_asteroid_at(asteroid: &Asteroid, ox: f32, oy: f32) {
    let n = asteroid.vertices.len();
    let mut pts = Vec::with_capacity(n);
    for &(vert_angle, dist) in &asteroid.vertices {
        let a = vert_angle + asteroid.rotation_angle;
        pts.push((ox + a.cos() * dist, oy + a.sin() * dist));
    }
    draw_polygon_lines(&pts, WHITE);
}

// ─── Game Implementation ───

impl Game {
    fn new() -> Self {
        let stars: Vec<Star> = (0..NUM_STARS).map(|_| Star::new()).collect();
        let high_score = load_high_score();

        // Create title asteroids
        let mut asteroids = Vec::new();
        for _ in 0..6 {
            let x = gen_range(0.0, WIDTH);
            let y = gen_range(0.0, HEIGHT);
            asteroids.push(Asteroid::new(x, y, AsteroidSize::Large));
        }

        Game {
            state: GamePhase::Title,
            ship: Ship::new(),
            asteroids,
            bullets: Vec::new(),
            particles: Vec::new(),
            stars,
            score: 0,
            lives: STARTING_LIVES,
            wave: 0,
            wave_timer: 0.0,
            next_extra_life: EXTRA_LIFE_SCORE,
            high_score,
            respawn_timer: 0.0,
            screen_shake_timer: 0.0,
            game_over_timer: 0.0,
            title_blink_timer: 0.0,
            title_blink_visible: true,
            new_high_score: false,
        }
    }

    fn start_game(&mut self) {
        self.state = GamePhase::Playing;
        self.score = 0;
        self.lives = STARTING_LIVES;
        self.wave = 0;
        self.wave_timer = 0.0;
        self.next_extra_life = EXTRA_LIFE_SCORE;
        self.ship = Ship::new();
        self.ship.invulnerable_timer = SHIP_INVULNERABLE_TIME;
        self.asteroids.clear();
        self.bullets.clear();
        self.particles.clear();
        self.respawn_timer = 0.0;
        self.screen_shake_timer = 0.0;
        self.game_over_timer = 0.0;
        self.new_high_score = false;
        self.spawn_wave();
    }

    fn spawn_wave(&mut self) {
        self.wave += 1;
        let count = (STARTING_ASTEROIDS + (self.wave as usize - 1) * ASTEROIDS_PER_WAVE)
            .min(MAX_ASTEROIDS_PER_WAVE);

        for _ in 0..count {
            let asteroid = Asteroid::spawn_at_edge(self.ship.x, self.ship.y, AsteroidSize::Large);
            self.asteroids.push(asteroid);
        }
    }

    fn add_score(&mut self, points: u32) {
        self.score += points;
        if self.score >= self.next_extra_life {
            self.lives += 1;
            self.next_extra_life += EXTRA_LIFE_SCORE;
        }
        if self.score > self.high_score {
            self.high_score = self.score;
            self.new_high_score = true;
        }
    }

    fn spawn_explosion(&mut self, x: f32, y: f32, count: usize, colors: &[Color]) {
        for _ in 0..count {
            let color = colors[gen_range(0, colors.len() as i32) as usize];
            self.particles.push(Particle::new(x, y, color));
        }
    }

    fn screen_shake(&mut self) {
        self.screen_shake_timer = SCREEN_SHAKE_DURATION;
    }

    // ─── Update ───

    fn update(&mut self, dt: f32) {
        // Update screen shake
        if self.screen_shake_timer > 0.0 {
            self.screen_shake_timer -= dt;
        }

        // Update title blink
        self.title_blink_timer += dt;
        if self.title_blink_timer >= 0.5 {
            self.title_blink_timer -= 0.5;
            self.title_blink_visible = !self.title_blink_visible;
        }

        match self.state {
            GamePhase::Title => self.update_title(dt),
            GamePhase::Playing => self.update_playing(dt),
            GamePhase::GameOver => self.update_game_over(dt),
        }

        // Always update particles
        self.update_particles(dt);
    }

    fn update_title(&mut self, dt: f32) {
        // Floating asteroids
        for asteroid in &mut self.asteroids {
            asteroid.x += asteroid.vx * dt;
            asteroid.y += asteroid.vy * dt;
            asteroid.rotation_angle += asteroid.rotation_speed * dt;
            wrap_position(&mut asteroid.x, &mut asteroid.y);
        }

        if is_key_pressed(KeyCode::Space) || is_key_pressed(KeyCode::Enter) {
            self.start_game();
        }
    }

    fn update_playing(&mut self, dt: f32) {
        // Ship input and update
        if self.ship.alive {
            self.update_ship_input(dt);
            self.update_ship(dt);
        } else {
            self.respawn_timer -= dt;
            if self.respawn_timer <= 0.0 {
                if self.lives > 0 {
                    self.ship.reset();
                } else {
                    self.state = GamePhase::GameOver;
                    self.game_over_timer = GAME_OVER_RESTART_DELAY;
                    if self.new_high_score {
                        save_high_score(self.high_score);
                    }
                }
            }
        }

        // Update bullets
        self.update_bullets(dt);

        // Update asteroids
        for asteroid in &mut self.asteroids {
            if !asteroid.alive {
                continue;
            }
            asteroid.x += asteroid.vx * dt;
            asteroid.y += asteroid.vy * dt;
            asteroid.rotation_angle += asteroid.rotation_speed * dt;
            wrap_position(&mut asteroid.x, &mut asteroid.y);
        }

        // Collision: bullets vs asteroids
        self.check_bullet_asteroid_collisions();

        // Collision: ship vs asteroids
        self.check_ship_asteroid_collisions();

        // Clean up dead entities
        self.asteroids.retain(|a| a.alive);
        self.bullets.retain(|b| b.alive);

        // Wave management
        let asteroids_alive = self.asteroids.iter().any(|a| a.alive);
        if !asteroids_alive && self.ship.alive {
            self.wave_timer += dt;
            if self.wave_timer >= WAVE_DELAY {
                self.wave_timer = 0.0;
                self.spawn_wave();
            }
        } else {
            self.wave_timer = 0.0;
        }
    }

    fn update_game_over(&mut self, dt: f32) {
        // Update floating asteroids
        for asteroid in &mut self.asteroids {
            if !asteroid.alive {
                continue;
            }
            asteroid.x += asteroid.vx * dt;
            asteroid.y += asteroid.vy * dt;
            asteroid.rotation_angle += asteroid.rotation_speed * dt;
            wrap_position(&mut asteroid.x, &mut asteroid.y);
        }

        self.game_over_timer -= dt;
        if self.game_over_timer <= 0.0
            && (is_key_pressed(KeyCode::Space) || is_key_pressed(KeyCode::Enter))
        {
            // Reset to title
            self.state = GamePhase::Title;
            self.asteroids.clear();
            for _ in 0..6 {
                let x = gen_range(0.0, WIDTH);
                let y = gen_range(0.0, HEIGHT);
                self.asteroids.push(Asteroid::new(x, y, AsteroidSize::Large));
            }
        }
    }

    fn update_ship_input(&mut self, dt: f32) {
        // Rotation
        let rot_left = is_key_down(KeyCode::Left) || is_key_down(KeyCode::A);
        let rot_right = is_key_down(KeyCode::Right) || is_key_down(KeyCode::D);
        if rot_left {
            self.ship.angle -= SHIP_ROTATION_SPEED.to_radians() * dt;
        }
        if rot_right {
            self.ship.angle += SHIP_ROTATION_SPEED.to_radians() * dt;
        }

        // Thrust
        let thrust = is_key_down(KeyCode::Up) || is_key_down(KeyCode::W);
        self.ship.thrusting = thrust;
        if thrust {
            self.ship.vx += self.ship.angle.cos() * SHIP_THRUST * dt;
            self.ship.vy += self.ship.angle.sin() * SHIP_THRUST * dt;
        }

        // Shooting
        self.ship.shoot_cooldown -= dt;
        if is_key_pressed(KeyCode::Space) && self.ship.shoot_cooldown <= 0.0 {
            let active_bullets = self.bullets.iter().filter(|b| b.alive).count();
            if active_bullets < MAX_BULLETS {
                let pts = self.ship.get_points();
                let nose = pts[0];
                self.bullets.push(Bullet::new(nose.0, nose.1, self.ship.angle));
                self.ship.shoot_cooldown = SHOOT_COOLDOWN;
            }
        }
    }

    fn update_ship(&mut self, dt: f32) {
        // Friction
        self.ship.vx *= SHIP_FRICTION;
        self.ship.vy *= SHIP_FRICTION;

        // Clamp speed
        let speed = (self.ship.vx * self.ship.vx + self.ship.vy * self.ship.vy).sqrt();
        if speed > SHIP_MAX_SPEED {
            let scale = SHIP_MAX_SPEED / speed;
            self.ship.vx *= scale;
            self.ship.vy *= scale;
        }

        // Move
        self.ship.x += self.ship.vx * dt;
        self.ship.y += self.ship.vy * dt;
        wrap_position(&mut self.ship.x, &mut self.ship.y);

        // Invulnerability
        if self.ship.invulnerable_timer > 0.0 {
            self.ship.invulnerable_timer -= dt;
            self.ship.blink_timer += dt;
            if self.ship.blink_timer >= SHIP_BLINK_INTERVAL {
                self.ship.blink_timer -= SHIP_BLINK_INTERVAL;
                self.ship.visible = !self.ship.visible;
            }
            if self.ship.invulnerable_timer <= 0.0 {
                self.ship.visible = true;
                self.ship.invulnerable_timer = 0.0;
            }
        } else {
            self.ship.visible = true;
        }

        // Thrust flicker
        if self.ship.thrusting {
            self.ship.thrust_flicker = gen_range(0.0, 1.0);
        }
    }

    fn update_bullets(&mut self, dt: f32) {
        for bullet in &mut self.bullets {
            if !bullet.alive {
                continue;
            }
            bullet.x += bullet.vx * dt;
            bullet.y += bullet.vy * dt;
            wrap_position(&mut bullet.x, &mut bullet.y);
            bullet.lifetime -= dt;
            if bullet.lifetime <= 0.0 {
                bullet.alive = false;
            }
        }
    }

    fn update_particles(&mut self, dt: f32) {
        for particle in &mut self.particles {
            if !particle.alive {
                continue;
            }
            particle.x += particle.vx * dt;
            particle.y += particle.vy * dt;
            particle.lifetime -= dt;
            if particle.lifetime <= 0.0 {
                particle.alive = false;
            }
        }
        self.particles.retain(|p| p.alive);
    }

    fn check_bullet_asteroid_collisions(&mut self) {
        let mut new_asteroids: Vec<Asteroid> = Vec::new();
        let mut score_to_add: u32 = 0;
        let mut explosions: Vec<(f32, f32, usize, AsteroidSize)> = Vec::new();

        for bullet in &mut self.bullets {
            if !bullet.alive {
                continue;
            }
            for asteroid in &mut self.asteroids {
                if !asteroid.alive {
                    continue;
                }
                if circles_collide_wrapped(
                    bullet.x, bullet.y, bullet.radius,
                    asteroid.x, asteroid.y, asteroid.radius,
                ) {
                    bullet.alive = false;
                    asteroid.alive = false;
                    score_to_add += asteroid.score;

                    let (count, size) = match asteroid.size {
                        AsteroidSize::Large => (20, AsteroidSize::Large),
                        AsteroidSize::Medium => (12, AsteroidSize::Medium),
                        AsteroidSize::Small => (8, AsteroidSize::Small),
                    };
                    explosions.push((asteroid.x, asteroid.y, count, size));

                    // Split asteroid
                    match asteroid.size {
                        AsteroidSize::Large => {
                            new_asteroids.push(Asteroid::new(asteroid.x, asteroid.y, AsteroidSize::Medium));
                            new_asteroids.push(Asteroid::new(asteroid.x, asteroid.y, AsteroidSize::Medium));
                        }
                        AsteroidSize::Medium => {
                            new_asteroids.push(Asteroid::new(asteroid.x, asteroid.y, AsteroidSize::Small));
                            new_asteroids.push(Asteroid::new(asteroid.x, asteroid.y, AsteroidSize::Small));
                        }
                        AsteroidSize::Small => {}
                    }

                    break; // bullet can only hit one asteroid
                }
            }
        }

        self.asteroids.extend(new_asteroids);
        self.add_score(score_to_add);

        for (x, y, count, _size) in explosions {
            self.spawn_explosion(x, y, count, &[WHITE, Color::new(0.7, 0.7, 0.7, 1.0)]);
        }
    }

    fn check_ship_asteroid_collisions(&mut self) {
        if !self.ship.alive || self.ship.invulnerable_timer > 0.0 {
            return;
        }

        for asteroid in &mut self.asteroids {
            if !asteroid.alive {
                continue;
            }
            if circles_collide_wrapped(
                self.ship.x, self.ship.y, self.ship.radius,
                asteroid.x, asteroid.y, asteroid.radius,
            ) {
                // Ship destroyed
                self.ship.alive = false;
                self.lives = self.lives.saturating_sub(1);
                self.respawn_timer = SHIP_RESPAWN_DELAY;

                // Ship explosion
                let orange = Color::new(1.0, 0.5, 0.0, 1.0);
                self.spawn_explosion(self.ship.x, self.ship.y, 30, &[WHITE, orange]);
                self.screen_shake();

                break;
            }
        }
    }

    // ─── Draw ───

    fn draw(&self) {
        clear_background(BLACK);

        // Compute screen shake offset
        let (shake_x, shake_y) = if self.screen_shake_timer > 0.0 {
            let intensity = self.screen_shake_timer / SCREEN_SHAKE_DURATION * SCREEN_SHAKE_INTENSITY;
            (
                gen_range(-intensity, intensity),
                gen_range(-intensity, intensity),
            )
        } else {
            (0.0, 0.0)
        };

        // Apply camera with shake
        let camera = Camera2D {
            target: vec2(WIDTH / 2.0 - shake_x, HEIGHT / 2.0 - shake_y),
            zoom: vec2(2.0 / WIDTH, -2.0 / HEIGHT),
            ..Default::default()
        };
        set_camera(&camera);

        // Draw stars
        for star in &self.stars {
            let c = star.brightness;
            draw_circle(star.x, star.y, star.size, Color::new(c, c, c, 1.0));
        }

        match self.state {
            GamePhase::Title => self.draw_title(),
            GamePhase::Playing => self.draw_playing(),
            GamePhase::GameOver => self.draw_game_over(),
        }

        // Draw particles (always)
        self.draw_particles();

        set_default_camera();
    }

    fn draw_title(&self) {
        // Draw floating asteroids
        for asteroid in &self.asteroids {
            if asteroid.alive {
                draw_wrapped(asteroid.x, asteroid.y, asteroid.radius, |ox, oy| {
                    draw_asteroid_at(asteroid, ox, oy);
                });
            }
        }

        // Title text
        let title = "ASTEROIDS";
        let title_size = 60.0;
        let dims = measure_text(title, None, title_size as u16, 1.0);
        draw_text(
            title,
            WIDTH / 2.0 - dims.width / 2.0,
            HEIGHT / 3.0,
            title_size,
            WHITE,
        );

        // Blinking start text
        if self.title_blink_visible {
            let start_text = "Press SPACE to Start";
            let start_size = 24.0;
            let dims = measure_text(start_text, None, start_size as u16, 1.0);
            draw_text(
                start_text,
                WIDTH / 2.0 - dims.width / 2.0,
                HEIGHT / 2.0 + 20.0,
                start_size,
                WHITE,
            );
        }

        // High score
        if self.high_score > 0 {
            let hs_text = format!("HIGH SCORE: {}", self.high_score);
            let hs_size = 20.0;
            let dims = measure_text(&hs_text, None, hs_size as u16, 1.0);
            draw_text(
                &hs_text,
                WIDTH / 2.0 - dims.width / 2.0,
                HEIGHT / 2.0 + 60.0,
                hs_size,
                Color::new(0.7, 0.7, 0.7, 1.0),
            );
        }
    }

    fn draw_playing(&self) {
        // Draw asteroids
        for asteroid in &self.asteroids {
            if asteroid.alive {
                draw_wrapped(asteroid.x, asteroid.y, asteroid.radius, |ox, oy| {
                    draw_asteroid_at(asteroid, ox, oy);
                });
            }
        }

        // Draw ship
        if self.ship.alive && self.ship.visible {
            draw_wrapped(self.ship.x, self.ship.y, SHIP_SIZE, |ox, oy| {
                draw_ship_at(&self.ship, ox, oy);
            });
        }

        // Draw bullets
        for bullet in &self.bullets {
            if bullet.alive {
                draw_wrapped(bullet.x, bullet.y, bullet.radius, |ox, oy| {
                    draw_circle(ox, oy, bullet.radius, WHITE);
                });
            }
        }

        // HUD
        self.draw_hud();
    }

    fn draw_game_over(&self) {
        // Draw asteroids
        for asteroid in &self.asteroids {
            if asteroid.alive {
                draw_wrapped(asteroid.x, asteroid.y, asteroid.radius, |ox, oy| {
                    draw_asteroid_at(asteroid, ox, oy);
                });
            }
        }

        // Draw bullets
        for bullet in &self.bullets {
            if bullet.alive {
                draw_wrapped(bullet.x, bullet.y, bullet.radius, |ox, oy| {
                    draw_circle(ox, oy, bullet.radius, WHITE);
                });
            }
        }

        // HUD
        self.draw_hud();

        // Game Over text
        let go_text = "GAME OVER";
        let go_size = 60.0;
        let dims = measure_text(go_text, None, go_size as u16, 1.0);
        draw_text(
            go_text,
            WIDTH / 2.0 - dims.width / 2.0,
            HEIGHT / 3.0,
            go_size,
            WHITE,
        );

        // Score
        let score_text = format!("SCORE: {}", self.score);
        let score_size = 30.0;
        let dims = measure_text(&score_text, None, score_size as u16, 1.0);
        draw_text(
            &score_text,
            WIDTH / 2.0 - dims.width / 2.0,
            HEIGHT / 3.0 + 50.0,
            score_size,
            WHITE,
        );

        // New high score
        if self.new_high_score {
            let nh_text = "NEW HIGH SCORE!";
            let nh_size = 24.0;
            let dims = measure_text(nh_text, None, nh_size as u16, 1.0);
            draw_text(
                nh_text,
                WIDTH / 2.0 - dims.width / 2.0,
                HEIGHT / 3.0 + 90.0,
                nh_size,
                YELLOW,
            );
        }

        // Restart prompt
        if self.game_over_timer <= 0.0 && self.title_blink_visible {
            let restart_text = "Press SPACE to Continue";
            let restart_size = 20.0;
            let dims = measure_text(restart_text, None, restart_size as u16, 1.0);
            draw_text(
                restart_text,
                WIDTH / 2.0 - dims.width / 2.0,
                HEIGHT / 2.0 + 60.0,
                restart_size,
                WHITE,
            );
        }
    }

    fn draw_particles(&self) {
        for particle in &self.particles {
            if particle.alive {
                let alpha = (particle.lifetime / particle.max_lifetime).clamp(0.0, 1.0);
                let c = Color::new(
                    particle.color.r,
                    particle.color.g,
                    particle.color.b,
                    alpha,
                );
                let size = 2.0 * alpha;
                draw_circle(particle.x, particle.y, size, c);
            }
        }
    }

    fn draw_hud(&self) {
        // Score top-left
        let score_text = format!("{:06}", self.score);
        draw_text(&score_text, 20.0, 35.0, 30.0, WHITE);

        // Wave number
        let wave_text = format!("WAVE {}", self.wave);
        draw_text(&wave_text, 20.0, 60.0, 20.0, Color::new(0.7, 0.7, 0.7, 1.0));

        // High score top-right
        let hs_text = format!("HI {:06}", self.high_score);
        let hs_size = 24.0;
        let dims = measure_text(&hs_text, None, hs_size as u16, 1.0);
        draw_text(
            &hs_text,
            WIDTH - dims.width - 20.0,
            35.0,
            hs_size,
            Color::new(0.7, 0.7, 0.7, 1.0),
        );

        // Lives as small ship shapes
        for i in 0..self.lives {
            let lx = 30.0 + i as f32 * 25.0;
            let ly = 85.0;
            draw_ship_shape(lx, ly, -PI / 2.0, 8.0, WHITE);
        }
    }
}

// ─── Main ───

fn window_conf() -> Conf {
    Conf {
        window_title: "Asteroids".to_owned(),
        window_width: 800,
        window_height: 600,
        window_resizable: false,
        ..Default::default()
    }
}

#[macroquad::main(window_conf)]
async fn main() {
    // Seed random
    macroquad::rand::srand(macroquad::miniquad::date::now() as u64);

    let mut game = Game::new();

    loop {
        let dt = get_frame_time().min(0.05);
        game.update(dt);
        game.draw();
        next_frame().await;
    }
}
