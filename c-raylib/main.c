/*
 * Asteroids - Classic arcade game clone
 * Written in C using raylib
 */

#include <raylib.h>
#include <math.h>
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <time.h>

/* ── Constants ─────────────────────────────────────────────────────── */

#define SCREEN_W       800
#define SCREEN_H       600
#define MAX_ASTEROIDS  128
#define MAX_BULLETS    4
#define MAX_PARTICLES  256
#define MAX_VERTICES   12
#define MAX_STARS      150

#define SHIP_SIZE          20.0f
#define SHIP_ROTATION_SPD  270.0f   /* deg/s */
#define SHIP_THRUST        200.0f   /* px/s^2 */
#define SHIP_FRICTION      0.99f
#define SHIP_MAX_SPEED     400.0f
#define SHIP_INVULN_TIME   3.0f
#define SHIP_BLINK_PERIOD  0.1f
#define SHIP_COLLISION_R   10.0f

#define BULLET_SPEED       500.0f
#define BULLET_LIFETIME    1.0f
#define BULLET_RADIUS      2.0f
#define SHOOT_COOLDOWN     0.15f

#define ASTEROID_LARGE_R   40.0f
#define ASTEROID_MEDIUM_R  20.0f
#define ASTEROID_SMALL_R   10.0f
#define ASTEROID_LARGE_SPD 50.0f
#define ASTEROID_MEDIUM_SPD 80.0f
#define ASTEROID_SMALL_SPD 120.0f
#define ASTEROID_JAGGEDNESS 0.4f

#define SCORE_LARGE        20
#define SCORE_MEDIUM       50
#define SCORE_SMALL        100

#define STARTING_LIVES     3
#define EXTRA_LIFE_SCORE   10000
#define RESPAWN_DELAY      1.5f
#define WAVE_DELAY         2.0f
#define STARTING_ASTEROIDS 4
#define ASTEROIDS_PER_WAVE 2
#define MAX_WAVE_ASTEROIDS 12
#define MIN_SPAWN_DIST     150.0f

#define PARTICLES_SHIP     30
#define PARTICLES_LARGE    20
#define PARTICLES_MEDIUM   12
#define PARTICLES_SMALL    8

#define SHAKE_DURATION     0.3f
#define SHAKE_INTENSITY    6.0f

#ifndef PI
#define PI                 3.14159265358979323846f
#endif
#define DEG2RAD_F          (PI / 180.0f)

#define HIGHSCORE_FILE     ".asteroids_highscore_c"

/* ── Types ─────────────────────────────────────────────────────────── */

typedef enum { SIZE_LARGE, SIZE_MEDIUM, SIZE_SMALL } AsteroidSize;
typedef enum { STATE_TITLE, STATE_PLAYING, STATE_GAME_OVER } GameState;

typedef struct {
    float x, y, vx, vy, angle, radius;
    int alive;
    float invulnerable_timer, blink_timer;
    int visible, thrusting;
    float thrust_flicker, shoot_cooldown;
} Ship;

typedef struct {
    float x, y, vx, vy, radius;
    float rotation_angle, rotation_speed;
    AsteroidSize size;
    int score, alive;
    float vert_angles[MAX_VERTICES];
    float vert_dists[MAX_VERTICES];
    int vert_count;
} Asteroid;

typedef struct {
    float x, y, vx, vy, radius, lifetime;
    int alive;
} Bullet;

typedef struct {
    float x, y, vx, vy, lifetime, max_lifetime;
    Color color;
    int alive;
} Particle;

typedef struct {
    float x, y, brightness, size;
} Star;

/* ── Global State ──────────────────────────────────────────────────── */

static GameState game_state;
static Ship ship;
static Asteroid asteroids[MAX_ASTEROIDS];
static int asteroid_count;
static Bullet bullets[MAX_BULLETS];
static int bullet_count;
static Particle particles[MAX_PARTICLES];
static int particle_count;
static Star stars[MAX_STARS];

static int score, high_score, lives, wave;
static int next_extra_life;
static float wave_timer, respawn_timer;
static float shake_timer;
static float title_blink_timer;

/* ── Utility ───────────────────────────────────────────────────────── */

static float randf(void) {
    return (float)rand() / (float)RAND_MAX;
}

static float randf_range(float lo, float hi) {
    return lo + randf() * (hi - lo);
}

static float wrap_f(float v, float max) {
    if (v < 0) v += max;
    if (v >= max) v -= max;
    return v;
}

static void wrap_pos(float *x, float *y) {
    *x = wrap_f(*x, (float)SCREEN_W);
    *y = wrap_f(*y, (float)SCREEN_H);
}

static float dist_sq(float x1, float y1, float x2, float y2) {
    float dx = x1 - x2;
    float dy = y1 - y2;
    return dx * dx + dy * dy;
}

static int circles_collide(float x1, float y1, float r1, float x2, float y2, float r2) {
    float sum_r = r1 + r2;
    return dist_sq(x1, y1, x2, y2) < sum_r * sum_r;
}

static char *highscore_path(void) {
    static char path[512];
    const char *home = getenv("HOME");
    if (home) {
        snprintf(path, sizeof(path), "%s/%s", home, HIGHSCORE_FILE);
    } else {
        snprintf(path, sizeof(path), "%s", HIGHSCORE_FILE);
    }
    return path;
}

static void load_high_score(void) {
    FILE *f = fopen(highscore_path(), "r");
    if (f) {
        if (fscanf(f, "%d", &high_score) != 1) high_score = 0;
        fclose(f);
    } else {
        high_score = 0;
    }
}

static void save_high_score(void) {
    FILE *f = fopen(highscore_path(), "w");
    if (f) {
        fprintf(f, "%d\n", high_score);
        fclose(f);
    }
}

/* ── Stars ─────────────────────────────────────────────────────────── */

static void stars_init(void) {
    for (int i = 0; i < MAX_STARS; i++) {
        stars[i].x = randf_range(0, (float)SCREEN_W);
        stars[i].y = randf_range(0, (float)SCREEN_H);
        stars[i].brightness = randf_range(0.3f, 1.0f);
        stars[i].size = randf_range(1.0f, 2.5f);
    }
}

static void stars_draw(void) {
    for (int i = 0; i < MAX_STARS; i++) {
        unsigned char b = (unsigned char)(stars[i].brightness * 255);
        Color c = { b, b, b, 255 };
        DrawCircleV((Vector2){ stars[i].x, stars[i].y }, stars[i].size * 0.5f, c);
    }
}

/* ── Particles ─────────────────────────────────────────────────────── */

static void particle_spawn(float x, float y, float vx, float vy, float lifetime, Color color) {
    if (particle_count >= MAX_PARTICLES) return;
    Particle *p = &particles[particle_count++];
    p->x = x;
    p->y = y;
    p->vx = vx;
    p->vy = vy;
    p->lifetime = lifetime;
    p->max_lifetime = lifetime;
    p->color = color;
    p->alive = 1;
}

static void spawn_explosion(float x, float y, int count, Color color) {
    for (int i = 0; i < count; i++) {
        float angle = randf_range(0, 2.0f * PI);
        float speed = randf_range(30.0f, 150.0f);
        float lt = randf_range(0.5f, 1.5f);
        particle_spawn(x, y, cosf(angle) * speed, sinf(angle) * speed, lt, color);
    }
}

static void particles_update(float dt) {
    for (int i = 0; i < particle_count; ) {
        Particle *p = &particles[i];
        p->x += p->vx * dt;
        p->y += p->vy * dt;
        p->lifetime -= dt;
        if (p->lifetime <= 0) {
            p->alive = 0;
            particles[i] = particles[--particle_count];
        } else {
            i++;
        }
    }
}

static void particles_draw(void) {
    for (int i = 0; i < particle_count; i++) {
        Particle *p = &particles[i];
        float alpha = p->lifetime / p->max_lifetime;
        Color c = p->color;
        c.a = (unsigned char)(alpha * 255);
        float r = 1.5f + alpha * 1.5f;
        DrawCircleV((Vector2){ p->x, p->y }, r, c);
    }
}

/* ── Ship ──────────────────────────────────────────────────────────── */

static void ship_init(void) {
    ship.x = SCREEN_W / 2.0f;
    ship.y = SCREEN_H / 2.0f;
    ship.vx = 0;
    ship.vy = 0;
    ship.angle = -90.0f; /* pointing up */
    ship.radius = SHIP_COLLISION_R;
    ship.alive = 1;
    ship.invulnerable_timer = SHIP_INVULN_TIME;
    ship.blink_timer = 0;
    ship.visible = 1;
    ship.thrusting = 0;
    ship.thrust_flicker = 0;
    ship.shoot_cooldown = 0;
}

static void ship_update(float dt) {
    if (!ship.alive) return;

    /* Rotation */
    if (IsKeyDown(KEY_LEFT) || IsKeyDown(KEY_A))
        ship.angle -= SHIP_ROTATION_SPD * dt;
    if (IsKeyDown(KEY_RIGHT) || IsKeyDown(KEY_D))
        ship.angle += SHIP_ROTATION_SPD * dt;

    /* Thrust */
    float rad = ship.angle * DEG2RAD_F;
    ship.thrusting = IsKeyDown(KEY_UP) || IsKeyDown(KEY_W);
    if (ship.thrusting) {
        ship.vx += cosf(rad) * SHIP_THRUST * dt;
        ship.vy += sinf(rad) * SHIP_THRUST * dt;
    }

    /* Friction */
    ship.vx *= SHIP_FRICTION;
    ship.vy *= SHIP_FRICTION;

    /* Speed cap */
    float spd = sqrtf(ship.vx * ship.vx + ship.vy * ship.vy);
    if (spd > SHIP_MAX_SPEED) {
        ship.vx = ship.vx / spd * SHIP_MAX_SPEED;
        ship.vy = ship.vy / spd * SHIP_MAX_SPEED;
    }

    /* Move */
    ship.x += ship.vx * dt;
    ship.y += ship.vy * dt;
    wrap_pos(&ship.x, &ship.y);

    /* Invulnerability blink */
    if (ship.invulnerable_timer > 0) {
        ship.invulnerable_timer -= dt;
        ship.blink_timer += dt;
        if (ship.blink_timer >= SHIP_BLINK_PERIOD) {
            ship.blink_timer -= SHIP_BLINK_PERIOD;
            ship.visible = !ship.visible;
        }
        if (ship.invulnerable_timer <= 0) {
            ship.invulnerable_timer = 0;
            ship.visible = 1;
        }
    }

    /* Shoot cooldown */
    if (ship.shoot_cooldown > 0) ship.shoot_cooldown -= dt;

    /* Thrust flicker */
    ship.thrust_flicker += dt * 30.0f;
}

static void ship_get_points(float cx, float cy, float angle, float size, Vector2 pts[4]) {
    float rad = angle * DEG2RAD_F;
    /* Nose */
    pts[0] = (Vector2){ cx + cosf(rad) * size, cy + sinf(rad) * size };
    /* Left wing */
    pts[1] = (Vector2){ cx + cosf(rad + 2.4f) * size * 0.7f, cy + sinf(rad + 2.4f) * size * 0.7f };
    /* Tail */
    pts[2] = (Vector2){ cx + cosf(rad + PI) * size * 0.4f, cy + sinf(rad + PI) * size * 0.4f };
    /* Right wing */
    pts[3] = (Vector2){ cx + cosf(rad - 2.4f) * size * 0.7f, cy + sinf(rad - 2.4f) * size * 0.7f };
}

static void ship_draw_at(float cx, float cy) {
    if (!ship.alive || !ship.visible) return;

    Vector2 pts[4];
    ship_get_points(cx, cy, ship.angle, SHIP_SIZE, pts);

    /* Ship outline */
    DrawLineV(pts[0], pts[1], WHITE);
    DrawLineV(pts[1], pts[2], WHITE);
    DrawLineV(pts[2], pts[3], WHITE);
    DrawLineV(pts[3], pts[0], WHITE);

    /* Thrust flame */
    if (ship.thrusting) {
        float rad = ship.angle * DEG2RAD_F;
        float flicker = 0.6f + 0.4f * sinf(ship.thrust_flicker);
        float flame_len = SHIP_SIZE * 0.6f * flicker;
        Vector2 tail = pts[2];
        Vector2 fl = { cx + cosf(rad + 2.7f) * SHIP_SIZE * 0.35f, cy + sinf(rad + 2.7f) * SHIP_SIZE * 0.35f };
        Vector2 fr = { cx + cosf(rad - 2.7f) * SHIP_SIZE * 0.35f, cy + sinf(rad - 2.7f) * SHIP_SIZE * 0.35f };
        Vector2 tip = { tail.x - cosf(rad) * flame_len, tail.y - sinf(rad) * flame_len };
        Color flame_color = { 255, 200, 50, 255 };
        DrawLineV(fl, tip, flame_color);
        DrawLineV(fr, tip, flame_color);
    }
}

static void ship_draw(void) {
    ship_draw_at(ship.x, ship.y);
    /* Wrap drawing at screen edges */
    float ex = (ship.x < SHIP_SIZE) ? (float)SCREEN_W : (ship.x > SCREEN_W - SHIP_SIZE) ? -(float)SCREEN_W : 0;
    float ey = (ship.y < SHIP_SIZE) ? (float)SCREEN_H : (ship.y > SCREEN_H - SHIP_SIZE) ? -(float)SCREEN_H : 0;
    if (ex != 0) ship_draw_at(ship.x + ex, ship.y);
    if (ey != 0) ship_draw_at(ship.x, ship.y + ey);
    if (ex != 0 && ey != 0) ship_draw_at(ship.x + ex, ship.y + ey);
}

/* ── Bullets ───────────────────────────────────────────────────────── */

static void bullet_init(float x, float y, float angle) {
    if (bullet_count >= MAX_BULLETS) return;
    Bullet *b = &bullets[bullet_count++];
    float rad = angle * DEG2RAD_F;
    b->x = x;
    b->y = y;
    b->vx = cosf(rad) * BULLET_SPEED;
    b->vy = sinf(rad) * BULLET_SPEED;
    b->radius = BULLET_RADIUS;
    b->lifetime = BULLET_LIFETIME;
    b->alive = 1;
}

static void bullet_remove(int i) {
    bullets[i] = bullets[--bullet_count];
}

static void bullets_update(float dt) {
    for (int i = 0; i < bullet_count; ) {
        Bullet *b = &bullets[i];
        b->x += b->vx * dt;
        b->y += b->vy * dt;
        wrap_pos(&b->x, &b->y);
        b->lifetime -= dt;
        if (b->lifetime <= 0) {
            b->alive = 0;
            bullet_remove(i);
        } else {
            i++;
        }
    }
}

static void bullet_draw_at(float x, float y) {
    DrawCircleV((Vector2){ x, y }, BULLET_RADIUS, WHITE);
}

static void bullets_draw(void) {
    for (int i = 0; i < bullet_count; i++) {
        Bullet *b = &bullets[i];
        bullet_draw_at(b->x, b->y);
        /* Wrap drawing */
        float ex = (b->x < BULLET_RADIUS * 2) ? (float)SCREEN_W : (b->x > SCREEN_W - BULLET_RADIUS * 2) ? -(float)SCREEN_W : 0;
        float ey = (b->y < BULLET_RADIUS * 2) ? (float)SCREEN_H : (b->y > SCREEN_H - BULLET_RADIUS * 2) ? -(float)SCREEN_H : 0;
        if (ex != 0) bullet_draw_at(b->x + ex, b->y);
        if (ey != 0) bullet_draw_at(b->x, b->y + ey);
        if (ex != 0 && ey != 0) bullet_draw_at(b->x + ex, b->y + ey);
    }
}

static void ship_shoot(void) {
    if (!ship.alive) return;
    if (ship.shoot_cooldown > 0) return;
    if (bullet_count >= MAX_BULLETS) return;

    float rad = ship.angle * DEG2RAD_F;
    float nose_x = ship.x + cosf(rad) * SHIP_SIZE;
    float nose_y = ship.y + sinf(rad) * SHIP_SIZE;
    bullet_init(nose_x, nose_y, ship.angle);
    ship.shoot_cooldown = SHOOT_COOLDOWN;
}

/* ── Asteroids ─────────────────────────────────────────────────────── */

static void asteroid_init_full(int idx, float x, float y, AsteroidSize size, float dir) {
    Asteroid *a = &asteroids[idx];
    a->x = x;
    a->y = y;
    a->size = size;
    a->alive = 1;
    a->rotation_angle = randf_range(0, 360.0f);
    a->rotation_speed = randf_range(-90.0f, 90.0f);

    float speed;
    switch (size) {
        case SIZE_LARGE:  a->radius = ASTEROID_LARGE_R;  speed = ASTEROID_LARGE_SPD;  a->score = SCORE_LARGE;  break;
        case SIZE_MEDIUM: a->radius = ASTEROID_MEDIUM_R; speed = ASTEROID_MEDIUM_SPD; a->score = SCORE_MEDIUM; break;
        case SIZE_SMALL:  a->radius = ASTEROID_SMALL_R;  speed = ASTEROID_SMALL_SPD;  a->score = SCORE_SMALL;  break;
        default:          a->radius = ASTEROID_LARGE_R;  speed = ASTEROID_LARGE_SPD;  a->score = SCORE_LARGE;  break;
    }

    float spread = randf_range(-0.5f, 0.5f);
    float angle = dir + spread;
    a->vx = cosf(angle) * speed;
    a->vy = sinf(angle) * speed;

    /* Jagged vertices */
    a->vert_count = 8 + rand() % 5; /* 8-12 */
    for (int i = 0; i < a->vert_count; i++) {
        a->vert_angles[i] = (2.0f * PI * (float)i) / (float)a->vert_count;
        a->vert_dists[i] = a->radius * (1.0f - ASTEROID_JAGGEDNESS + randf() * ASTEROID_JAGGEDNESS * 2.0f);
    }
}

static void asteroid_spawn(float x, float y, AsteroidSize size, float dir) {
    if (asteroid_count >= MAX_ASTEROIDS) return;
    asteroid_init_full(asteroid_count, x, y, size, dir);
    asteroid_count++;
}

static void asteroid_remove(int i) {
    asteroids[i] = asteroids[--asteroid_count];
}

static void asteroid_update(int i, float dt) {
    Asteroid *a = &asteroids[i];
    a->x += a->vx * dt;
    a->y += a->vy * dt;
    wrap_pos(&a->x, &a->y);
    a->rotation_angle += a->rotation_speed * dt;
}

static void asteroids_update(float dt) {
    for (int i = 0; i < asteroid_count; i++) {
        asteroid_update(i, dt);
    }
}

static void asteroid_draw_at(int i, float cx, float cy) {
    Asteroid *a = &asteroids[i];
    float rot = a->rotation_angle * DEG2RAD_F;
    for (int v = 0; v < a->vert_count; v++) {
        int next = (v + 1) % a->vert_count;
        float a1 = a->vert_angles[v] + rot;
        float a2 = a->vert_angles[next] + rot;
        Vector2 p1 = { cx + cosf(a1) * a->vert_dists[v], cy + sinf(a1) * a->vert_dists[v] };
        Vector2 p2 = { cx + cosf(a2) * a->vert_dists[next], cy + sinf(a2) * a->vert_dists[next] };
        DrawLineV(p1, p2, WHITE);
    }
}

static void asteroid_draw(int i) {
    Asteroid *a = &asteroids[i];
    asteroid_draw_at(i, a->x, a->y);
    float r = a->radius;
    float ex = (a->x < r) ? (float)SCREEN_W : (a->x > SCREEN_W - r) ? -(float)SCREEN_W : 0;
    float ey = (a->y < r) ? (float)SCREEN_H : (a->y > SCREEN_H - r) ? -(float)SCREEN_H : 0;
    if (ex != 0) asteroid_draw_at(i, a->x + ex, a->y);
    if (ey != 0) asteroid_draw_at(i, a->x, a->y + ey);
    if (ex != 0 && ey != 0) asteroid_draw_at(i, a->x + ex, a->y + ey);
}

static void asteroids_draw(void) {
    for (int i = 0; i < asteroid_count; i++) {
        asteroid_draw(i);
    }
}

/* ── Wave Spawning ─────────────────────────────────────────────────── */

static void spawn_wave(void) {
    wave++;
    int count = STARTING_ASTEROIDS + (wave - 1) * ASTEROIDS_PER_WAVE;
    if (count > MAX_WAVE_ASTEROIDS) count = MAX_WAVE_ASTEROIDS;

    for (int i = 0; i < count; i++) {
        float x, y;
        int tries = 0;
        do {
            /* Spawn at edges */
            int edge = rand() % 4;
            switch (edge) {
                case 0: x = 0;              y = randf_range(0, (float)SCREEN_H); break;
                case 1: x = (float)SCREEN_W; y = randf_range(0, (float)SCREEN_H); break;
                case 2: x = randf_range(0, (float)SCREEN_W); y = 0;              break;
                default: x = randf_range(0, (float)SCREEN_W); y = (float)SCREEN_H; break;
            }
            tries++;
        } while (ship.alive && dist_sq(x, y, ship.x, ship.y) < MIN_SPAWN_DIST * MIN_SPAWN_DIST && tries < 50);

        float dir = atan2f(SCREEN_H / 2.0f - y, SCREEN_W / 2.0f - x) + randf_range(-0.5f, 0.5f);
        asteroid_spawn(x, y, SIZE_LARGE, dir);
    }
}

/* ── Collisions ────────────────────────────────────────────────────── */

static void add_score(int pts) {
    score += pts;
    if (score >= next_extra_life) {
        lives++;
        next_extra_life += EXTRA_LIFE_SCORE;
    }
    if (score > high_score) {
        high_score = score;
    }
}

static void ship_destroy(void) {
    ship.alive = 0;
    spawn_explosion(ship.x, ship.y, PARTICLES_SHIP, WHITE);
    shake_timer = SHAKE_DURATION;
    lives--;
    if (lives > 0) {
        respawn_timer = RESPAWN_DELAY;
    }
}

static void asteroid_break(int i) {
    Asteroid *a = &asteroids[i];
    float x = a->x, y = a->y;
    AsteroidSize sz = a->size;
    int pts = a->score;

    /* Explosion particles */
    int pcount;
    switch (sz) {
        case SIZE_LARGE:  pcount = PARTICLES_LARGE;  break;
        case SIZE_MEDIUM: pcount = PARTICLES_MEDIUM;  break;
        case SIZE_SMALL:  pcount = PARTICLES_SMALL;   break;
        default:          pcount = PARTICLES_SMALL;   break;
    }
    spawn_explosion(x, y, pcount, WHITE);

    /* Remove asteroid (swap-and-pop) */
    asteroid_remove(i);

    /* Spawn children */
    if (sz == SIZE_LARGE) {
        float dir = randf_range(0, 2.0f * PI);
        asteroid_spawn(x, y, SIZE_MEDIUM, dir);
        asteroid_spawn(x, y, SIZE_MEDIUM, dir + PI);
    } else if (sz == SIZE_MEDIUM) {
        float dir = randf_range(0, 2.0f * PI);
        asteroid_spawn(x, y, SIZE_SMALL, dir);
        asteroid_spawn(x, y, SIZE_SMALL, dir + PI);
    }

    add_score(pts);
    shake_timer = SHAKE_DURATION * 0.3f;
}

static void handle_collisions(void) {
    /* Bullet vs Asteroid */
    for (int bi = 0; bi < bullet_count; ) {
        Bullet *b = &bullets[bi];
        int hit = 0;
        for (int ai = 0; ai < asteroid_count; ai++) {
            Asteroid *a = &asteroids[ai];
            if (circles_collide(b->x, b->y, b->radius, a->x, a->y, a->radius)) {
                b->alive = 0;
                bullet_remove(bi);
                asteroid_break(ai);
                hit = 1;
                break;
            }
        }
        if (!hit) bi++;
    }

    /* Ship vs Asteroid */
    if (ship.alive && ship.invulnerable_timer <= 0) {
        for (int ai = 0; ai < asteroid_count; ai++) {
            Asteroid *a = &asteroids[ai];
            if (circles_collide(ship.x, ship.y, ship.radius, a->x, a->y, a->radius)) {
                ship_destroy();
                asteroid_break(ai);
                break;
            }
        }
    }
}

/* ── HUD ───────────────────────────────────────────────────────────── */

static void draw_life_icon(float cx, float cy) {
    Vector2 pts[4];
    ship_get_points(cx, cy, -90.0f, 8.0f, pts);
    DrawLineV(pts[0], pts[1], WHITE);
    DrawLineV(pts[1], pts[2], WHITE);
    DrawLineV(pts[2], pts[3], WHITE);
    DrawLineV(pts[3], pts[0], WHITE);
}

static void draw_hud(void) {
    /* Score */
    DrawText(TextFormat("%d", score), 10, 10, 24, WHITE);

    /* Wave */
    DrawText(TextFormat("WAVE %d", wave), 10, 38, 16, (Color){ 150, 150, 150, 255 });

    /* High score */
    const char *hs_text = TextFormat("HI: %d", high_score);
    int hs_width = MeasureText(hs_text, 20);
    DrawText(hs_text, SCREEN_W - hs_width - 10, 10, 20, (Color){ 150, 150, 150, 255 });

    /* Lives */
    for (int i = 0; i < lives; i++) {
        draw_life_icon(30.0f + (float)i * 22.0f, 75.0f);
    }
}

/* ── Title Screen ──────────────────────────────────────────────────── */

static void draw_title(void) {
    const char *title = "ASTEROIDS";
    int tw = MeasureText(title, 60);
    DrawText(title, (SCREEN_W - tw) / 2, 180, 60, WHITE);

    title_blink_timer += GetFrameTime() * 3.0f;
    if (sinf(title_blink_timer) > 0) {
        const char *prompt = "PRESS SPACE OR ENTER TO START";
        int pw = MeasureText(prompt, 20);
        DrawText(prompt, (SCREEN_W - pw) / 2, 320, 20, WHITE);
    }

    const char *controls = "ARROWS/WASD: MOVE    SPACE: SHOOT";
    int cw = MeasureText(controls, 16);
    DrawText(controls, (SCREEN_W - cw) / 2, 400, 16, (Color){ 150, 150, 150, 255 });

    if (high_score > 0) {
        const char *hs = TextFormat("HIGH SCORE: %d", high_score);
        int hw = MeasureText(hs, 20);
        DrawText(hs, (SCREEN_W - hw) / 2, 460, 20, (Color){ 200, 200, 100, 255 });
    }
}

static void draw_game_over_screen(void) {
    const char *go = "GAME OVER";
    int gow = MeasureText(go, 50);
    DrawText(go, (SCREEN_W - gow) / 2, 200, 50, WHITE);

    const char *sc = TextFormat("SCORE: %d", score);
    int sw = MeasureText(sc, 30);
    DrawText(sc, (SCREEN_W - sw) / 2, 280, 30, WHITE);

    if (score >= high_score && score > 0) {
        const char *nh = "NEW HIGH SCORE!";
        int nhw = MeasureText(nh, 24);
        DrawText(nh, (SCREEN_W - nhw) / 2, 330, 24, (Color){ 255, 255, 100, 255 });
    }

    title_blink_timer += GetFrameTime() * 3.0f;
    if (sinf(title_blink_timer) > 0) {
        const char *prompt = "PRESS SPACE OR ENTER TO CONTINUE";
        int pw = MeasureText(prompt, 20);
        DrawText(prompt, (SCREEN_W - pw) / 2, 400, 20, WHITE);
    }
}

/* ── Game State Management ─────────────────────────────────────────── */

static void game_reset(void) {
    score = 0;
    lives = STARTING_LIVES;
    wave = 0;
    next_extra_life = EXTRA_LIFE_SCORE;
    wave_timer = 0;
    respawn_timer = 0;
    shake_timer = 0;
    asteroid_count = 0;
    bullet_count = 0;
    particle_count = 0;
    ship_init();
    spawn_wave();
}

static void update_title(float dt) {
    (void)dt;
    /* Animate some asteroids on the title screen */
    asteroids_update(dt);
    particles_update(dt);

    if (IsKeyPressed(KEY_SPACE) || IsKeyPressed(KEY_ENTER)) {
        asteroid_count = 0;
        particle_count = 0;
        game_reset();
        game_state = STATE_PLAYING;
    }
}

static void update_playing(float dt) {
    ship_update(dt);

    /* Shooting */
    if (IsKeyPressed(KEY_SPACE)) {
        ship_shoot();
    }
    /* Also allow holding space with cooldown */
    if (IsKeyDown(KEY_SPACE) && ship.shoot_cooldown <= 0) {
        ship_shoot();
    }

    bullets_update(dt);
    asteroids_update(dt);
    particles_update(dt);

    handle_collisions();

    /* Respawn */
    if (!ship.alive && lives > 0) {
        respawn_timer -= dt;
        if (respawn_timer <= 0) {
            ship_init();
        }
    }

    /* Check for wave clear */
    if (asteroid_count == 0) {
        wave_timer += dt;
        if (wave_timer >= WAVE_DELAY) {
            wave_timer = 0;
            spawn_wave();
        }
    } else {
        wave_timer = 0;
    }

    /* Screen shake timer */
    if (shake_timer > 0) shake_timer -= dt;

    /* Game over */
    if (lives <= 0 && !ship.alive && particle_count == 0) {
        save_high_score();
        game_state = STATE_GAME_OVER;
        title_blink_timer = 0;
    }
}

static void update_game_over(float dt) {
    asteroids_update(dt);
    particles_update(dt);

    if (IsKeyPressed(KEY_SPACE) || IsKeyPressed(KEY_ENTER)) {
        game_state = STATE_TITLE;
        asteroid_count = 0;
        bullet_count = 0;
        particle_count = 0;
        /* Spawn some title screen asteroids */
        for (int i = 0; i < 6; i++) {
            float x = randf_range(0, (float)SCREEN_W);
            float y = randf_range(0, (float)SCREEN_H);
            float dir = randf_range(0, 2.0f * PI);
            asteroid_spawn(x, y, SIZE_LARGE, dir);
        }
        title_blink_timer = 0;
    }
}

/* ── Main ──────────────────────────────────────────────────────────── */

int main(void) {
    srand((unsigned int)time(NULL));

    InitWindow(SCREEN_W, SCREEN_H, "Asteroids");
    SetTargetFPS(60);

    load_high_score();
    stars_init();

    /* Initial title screen state */
    game_state = STATE_TITLE;
    asteroid_count = 0;
    bullet_count = 0;
    particle_count = 0;
    title_blink_timer = 0;

    /* Spawn some decorative asteroids for title */
    for (int i = 0; i < 6; i++) {
        float x = randf_range(0, (float)SCREEN_W);
        float y = randf_range(0, (float)SCREEN_H);
        float dir = randf_range(0, 2.0f * PI);
        asteroid_spawn(x, y, SIZE_LARGE, dir);
    }

    while (!WindowShouldClose()) {
        float dt = GetFrameTime();
        if (dt > 0.05f) dt = 0.05f; /* clamp delta */

        /* Update */
        switch (game_state) {
            case STATE_TITLE:     update_title(dt);     break;
            case STATE_PLAYING:   update_playing(dt);   break;
            case STATE_GAME_OVER: update_game_over(dt); break;
        }

        /* Screen shake offset */
        float sx = 0, sy = 0;
        if (shake_timer > 0) {
            float intensity = SHAKE_INTENSITY * (shake_timer / SHAKE_DURATION);
            sx = randf_range(-intensity, intensity);
            sy = randf_range(-intensity, intensity);
        }

        /* Draw */
        BeginDrawing();
        ClearBackground(BLACK);

        /* Apply screen shake via camera offset trick:
           We just offset all draw positions manually isn't practical,
           so use a Camera2D for the shake. */
        Camera2D cam = { 0 };
        cam.offset = (Vector2){ SCREEN_W / 2.0f + sx, SCREEN_H / 2.0f + sy };
        cam.target = (Vector2){ SCREEN_W / 2.0f, SCREEN_H / 2.0f };
        cam.rotation = 0.0f;
        cam.zoom = 1.0f;

        BeginMode2D(cam);

        stars_draw();

        switch (game_state) {
            case STATE_TITLE:
                asteroids_draw();
                particles_draw();
                break;

            case STATE_PLAYING:
                asteroids_draw();
                bullets_draw();
                ship_draw();
                particles_draw();
                break;

            case STATE_GAME_OVER:
                asteroids_draw();
                bullets_draw();
                particles_draw();
                break;
        }

        EndMode2D();

        /* HUD drawn without shake */
        switch (game_state) {
            case STATE_TITLE:
                draw_title();
                break;
            case STATE_PLAYING:
                draw_hud();
                break;
            case STATE_GAME_OVER:
                draw_hud();
                draw_game_over_screen();
                break;
        }

        EndDrawing();
    }

    save_high_score();
    CloseWindow();
    return 0;
}
