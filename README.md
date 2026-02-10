# Asteroids

The classic Asteroids arcade game implemented in 7 different tech stacks, all sharing identical game design and mechanics.

## Versions

| # | Stack | Directory | Run |
|---|-------|-----------|-----|
| 1 | HTML Canvas + JavaScript | `html-canvas/` | Open `index.html` in a browser |
| 2 | React + Canvas + TypeScript | `react-canvas/` | `npm install && npm run dev` |
| 3 | Python + Pygame | `python-pygame/` | `pip install -r requirements.txt && python main.py` |
| 4 | Rust + macroquad | `rust-macroquad/` | `cargo run --release` |
| 5 | C + raylib | `c-raylib/` | `make && ./asteroids` |
| 6 | Lua + LOVE 2D | `lua-love2d/` | `love .` |
| 7 | Go + Ebitengine | `go-ebitengine/` | `go mod tidy && go run .` |

## Prerequisites

| Version | Requires |
|---------|----------|
| HTML Canvas | Any modern browser |
| React | Node.js 18+ |
| Python | Python 3.10+, pip |
| Rust | Rust toolchain (`rustup`) |
| C | C compiler, raylib (`brew install raylib`) |
| Lua | LOVE 2D (`brew install love`) |
| Go | Go 1.21+, Xcode CLI tools on macOS |

## Game Design

All 7 implementations share the same game design:

### Controls

- **Rotate**: Arrow keys or A/D
- **Thrust**: Up arrow or W
- **Shoot**: Space
- **Start/Restart**: Space or Enter

### Mechanics

- **Ship**: 20px size, 270 deg/s rotation, 200 px/s^2 thrust, 0.99 friction, 400 px/s max speed
- **Bullets**: 500 px/s, 1s lifetime, max 4 on screen
- **Asteroids**: Large (r=40, 20pts), Medium (r=20, 50pts), Small (r=10, 100pts)
- **Waves**: Start with 4 asteroids, +2 per wave, max 12
- **Lives**: 3 starting lives, extra life every 10,000 points
- **Invulnerability**: 3 seconds after spawning, with blink effect
- **Collision**: Circle-circle using squared distance

### Visuals

- 800x600 canvas, 60 FPS
- White vector outlines on black background
- Star field background (150 stars)
- Thrust flame with flicker effect
- Explosion particles on destruction
- Screen shake on impacts
- Screen wrapping with seamless edge rendering

### State Machine

**Title Screen** (floating asteroids, blinking start prompt) -> **Playing** -> **Game Over** (score display, high score tracking)

High scores persist between sessions (localStorage for web, filesystem for native).
