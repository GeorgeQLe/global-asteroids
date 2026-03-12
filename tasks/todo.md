# Asteroids — Project TODO

## Code Structure & Consistency

- [ ] **Python pygame: add `__pycache__/` dirs to `.gitignore` per-directory or verify the root glob catches nested ones**
  The root `.gitignore` has `__pycache__/` which should work, but `python-pygame/game/__pycache__/` and several sub-dirs appear to exist on disk. Confirm they are not tracked.

- [ ] **Verify all 7 implementations match the shared game-design spec**
  The README defines exact constants (ship size, rotation speed, thrust, friction, etc.). Do a side-by-side audit to confirm each implementation uses identical values. Pay special attention to the Go version which converts degrees to radians inline — double-check the asteroid speed/point tables match.

- [ ] **Standardize high-score persistence across all native versions**
  HTML Canvas uses `localStorage`, Python uses `~/.asteroids_highscore`. Verify the Go, Rust, C, and Lua versions all implement high-score save/load as the README promises ("High scores persist between sessions … filesystem for native"). If any are missing, add it.

## Missing / Incomplete Implementations

- [ ] **Rust (macroquad): verify `src/main.rs` compiles and runs**
  The Cargo.toml exists and `src/main.rs` is present, but the `target/` only has partial debug artifacts. Confirm `cargo run --release` works and the game is feature-complete (all states, particles, screen shake, high score save).

- [ ] **HTML Canvas: single-file, ~1200+ lines — consider splitting or at least adding section markers**
  The entire game is in one `index.html`. Not a blocker, but adding clear `// ═══ SECTION ═══` comment headers for InputHandler, entities, collision, renderer, state machine, etc. would improve navigability.

## Testing & Quality

- [ ] **Add at least basic smoke tests for the Python implementation**
  Python pygame has the cleanest module separation (engine, entities, systems). Add unit tests for the collision system (`circle_circle` distance check), the spawner wave logic, and the physics update. Use `pytest`.

- [ ] **React/TypeScript: run `npm run lint` and fix any warnings**
  ESLint is configured with `eslint-plugin-react-hooks` and `typescript-eslint`. Run a lint pass and address any issues.

- [ ] **C raylib: enable `-Wpedantic` in the Makefile and fix any resulting warnings**
  Currently uses `-Wall -Wextra`. Adding `-Wpedantic` would catch any non-standard C usage.

## Project Hygiene

- [ ] **Add a root LICENSE file**
  No LICENSE exists at the project root. Choose and add one (MIT is common for game demos).

- [ ] **Add `react-canvas/package-lock.json` to `.gitignore` or commit it intentionally**
  `package-lock.json` exists but is not mentioned in `.gitignore`. Decide on a policy: either commit it (recommended for reproducible builds) or ignore it.

- [ ] **Add `lua-love2d/*.love` and `go-ebitengine/go.sum` build artifacts to `.gitignore`**
  `go.sum` is already ignored, but LOVE 2D can produce `.love` zip bundles that should also be ignored.

- [ ] **Strip `react-canvas/dist/` from the repo if it was committed**
  The `.gitignore` ignores `react-canvas/dist/` but the directory exists. Verify it is not tracked; if it is, remove it from git history.

## Features & Polish

- [ ] **Add sound effects**
  None of the 7 implementations have audio. Even simple retro beeps/boops (thrust hum, bullet fire, explosion, extra life) would significantly improve the feel. Start with the HTML Canvas version using the Web Audio API, then port to others.

- [ ] **Add touch/mobile controls to the React Canvas version**
  The plain HTML Canvas version already has touch zone support. Port similar touch controls to the React version for mobile play.

- [ ] **Add gamepad/controller support**
  Only keyboard input is supported across all versions. At minimum, the Go (Ebitengine) and Rust (macroquad) versions have built-in gamepad APIs that would be straightforward to wire up.

- [ ] **Add a CI workflow (GitHub Actions)**
  No `.github/workflows/` directory exists. A simple CI that builds the C, Rust, and Go versions, runs `npm run build` + `npm run lint` for React, and runs Python tests would catch regressions.

## Documentation

- [ ] **Add per-implementation READMEs or notes on architecture decisions**
  The Python version has a clean ECS-like separation (entities, systems, engine, renderer). The C version is a well-structured single file. Document why each implementation was structured the way it was — useful for anyone studying the project as a multi-language comparison.

- [ ] **Add screenshots or a GIF to the root README**
  A single gameplay GIF would make the project much more compelling at a glance.
