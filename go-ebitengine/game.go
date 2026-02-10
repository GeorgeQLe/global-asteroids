package main

import (
	"fmt"
	"image/color"
	"math"
	"math/rand"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/hajimehoshi/ebiten/v2"
	"github.com/hajimehoshi/ebiten/v2/inpututil"
)

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const (
	screenWidth  = 800
	screenHeight = 600
	dt           = 1.0 / 60.0

	// Ship
	shipSize       = 20.0
	rotationSpeed  = 270.0 * math.Pi / 180.0 // 270 deg/s in rad
	thrustAccel    = 200.0                     // px/s^2
	friction       = 0.99
	maxSpeed       = 400.0
	shipRadius     = 10.0
	invulnDuration = 3.0
	respawnDelay   = 1.5

	// Bullets
	bulletSpeed    = 500.0
	bulletLifetime = 1.0
	maxBullets     = 4
	shootCooldown  = 0.15

	// Asteroids
	jaggedness = 0.4

	// Waves
	startAsteroids = 4
	waveIncrement  = 2
	maxAsteroids   = 12
	waveDelay      = 2.0

	// Scoring
	extraLifeInterval = 10000
	startingLives     = 3

	// Stars
	numStars = 150

	// Spawn
	minSpawnDist = 150.0

	// Screen shake
	shakeDecay = 5.0
)

// ---------------------------------------------------------------------------
// GamePhase
// ---------------------------------------------------------------------------

type GamePhase int

const (
	PhaseTitle   GamePhase = iota
	PhasePlaying
	PhaseGameOver
)

// ---------------------------------------------------------------------------
// Game
// ---------------------------------------------------------------------------

type Game struct {
	Phase     GamePhase
	Ship      *Ship
	Asteroids []*Asteroid
	Bullets   []*Bullet
	Particles []*Particle
	Stars     []Star

	Score        int
	Lives        int
	Wave         int
	WaveTimer    float64
	NextExtraLife int
	HighScore    int

	RespawnTimer float64
	ShakeAmount  float64
	ShakeOffsetX float64
	ShakeOffsetY float64

	TitleBlink float64
}

func init() {
	rand.Seed(time.Now().UnixNano())
}

func NewGame() *Game {
	g := &Game{
		Phase:         PhaseTitle,
		NextExtraLife: extraLifeInterval,
	}
	g.Stars = make([]Star, numStars)
	for i := range g.Stars {
		g.Stars[i] = NewStar()
	}
	g.HighScore = loadHighScore()
	return g
}

func (g *Game) startGame() {
	g.Phase = PhasePlaying
	g.Score = 0
	g.Lives = startingLives
	g.Wave = 0
	g.NextExtraLife = extraLifeInterval
	g.Asteroids = g.Asteroids[:0]
	g.Bullets = g.Bullets[:0]
	g.Particles = g.Particles[:0]
	g.Ship = NewShip(screenWidth/2, screenHeight/2)
	g.Ship.InvulnTimer = invulnDuration
	g.Ship.BlinkTimer = 0.1
	g.RespawnTimer = 0
	g.ShakeAmount = 0
	g.spawnWave()
}

func (g *Game) spawnWave() {
	g.Wave++
	count := startAsteroids + (g.Wave-1)*waveIncrement
	if count > maxAsteroids {
		count = maxAsteroids
	}
	for i := 0; i < count; i++ {
		a := g.spawnAsteroidAwayFromShip(SizeLarge)
		g.Asteroids = append(g.Asteroids, a)
	}
}

func (g *Game) spawnAsteroidAwayFromShip(size AsteroidSize) *Asteroid {
	for {
		var x, y float64
		// Spawn at edges
		edge := rand.Intn(4)
		switch edge {
		case 0: // top
			x = rand.Float64() * screenWidth
			y = 0
		case 1: // bottom
			x = rand.Float64() * screenWidth
			y = screenHeight
		case 2: // left
			x = 0
			y = rand.Float64() * screenHeight
		case 3: // right
			x = screenWidth
			y = rand.Float64() * screenHeight
		}

		if g.Ship == nil || !g.Ship.Alive {
			return NewAsteroid(size, x, y)
		}
		dx := x - g.Ship.X
		dy := y - g.Ship.Y
		if math.Sqrt(dx*dx+dy*dy) >= minSpawnDist {
			return NewAsteroid(size, x, y)
		}
	}
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

func (g *Game) Update() error {
	switch g.Phase {
	case PhaseTitle:
		g.updateTitle()
	case PhasePlaying:
		g.updatePlaying()
	case PhaseGameOver:
		g.updateGameOver()
	}
	return nil
}

func (g *Game) updateTitle() {
	g.TitleBlink += dt
	if inpututil.IsKeyJustPressed(ebiten.KeySpace) || inpututil.IsKeyJustPressed(ebiten.KeyEnter) {
		g.startGame()
	}
}

func (g *Game) updateGameOver() {
	g.TitleBlink += dt
	// Still update particles for explosion effects
	for _, p := range g.Particles {
		p.Update()
	}
	g.pruneParticles()

	if inpututil.IsKeyJustPressed(ebiten.KeySpace) || inpututil.IsKeyJustPressed(ebiten.KeyEnter) {
		g.startGame()
	}
}

func (g *Game) updatePlaying() {
	// --- Input ---
	if g.Ship.Alive {
		// Rotation
		if ebiten.IsKeyPressed(ebiten.KeyLeft) || ebiten.IsKeyPressed(ebiten.KeyA) {
			g.Ship.Angle -= rotationSpeed * dt
		}
		if ebiten.IsKeyPressed(ebiten.KeyRight) || ebiten.IsKeyPressed(ebiten.KeyD) {
			g.Ship.Angle += rotationSpeed * dt
		}

		// Thrust
		g.Ship.Thrusting = false
		if ebiten.IsKeyPressed(ebiten.KeyUp) || ebiten.IsKeyPressed(ebiten.KeyW) {
			g.Ship.VX += math.Cos(g.Ship.Angle) * thrustAccel * dt
			g.Ship.VY += math.Sin(g.Ship.Angle) * thrustAccel * dt
			g.Ship.Thrusting = true
		}

		// Shoot
		if ebiten.IsKeyPressed(ebiten.KeySpace) && g.Ship.ShootCooldown <= 0 {
			bulletCount := 0
			for _, b := range g.Bullets {
				if b.Alive {
					bulletCount++
				}
			}
			if bulletCount < maxBullets {
				nose := shipSize * 0.6
				bx := g.Ship.X + math.Cos(g.Ship.Angle)*nose
				by := g.Ship.Y + math.Sin(g.Ship.Angle)*nose
				g.Bullets = append(g.Bullets, NewBullet(bx, by, g.Ship.Angle))
				g.Ship.ShootCooldown = shootCooldown
			}
		}
	}

	// --- Update entities ---
	g.Ship.Update()

	for _, a := range g.Asteroids {
		a.Update()
	}
	for _, b := range g.Bullets {
		b.Update()
	}
	for _, p := range g.Particles {
		p.Update()
	}

	// --- Collisions ---
	if g.Ship.Alive {
		g.checkBulletAsteroidCollisions()
		if g.Ship.InvulnTimer <= 0 {
			g.checkShipAsteroidCollisions()
		}
	}

	// --- Prune dead entities ---
	g.pruneBullets()
	g.pruneAsteroids()
	g.pruneParticles()

	// --- Respawn ---
	if !g.Ship.Alive {
		g.RespawnTimer -= dt
		if g.RespawnTimer <= 0 {
			if g.Lives > 0 {
				g.Ship = NewShip(screenWidth/2, screenHeight/2)
				g.Ship.InvulnTimer = invulnDuration
				g.Ship.BlinkTimer = 0.1
			} else {
				g.Phase = PhaseGameOver
				if g.Score > g.HighScore {
					g.HighScore = g.Score
					saveHighScore(g.HighScore)
				}
				g.TitleBlink = 0
			}
		}
	}

	// --- Wave check ---
	aliveAsteroids := 0
	for _, a := range g.Asteroids {
		if a.Alive {
			aliveAsteroids++
		}
	}
	if aliveAsteroids == 0 && g.Ship.Alive {
		g.WaveTimer -= dt
		if g.WaveTimer <= 0 {
			g.spawnWave()
			g.WaveTimer = waveDelay
		}
	} else {
		g.WaveTimer = waveDelay
	}

	// --- Screen shake ---
	if g.ShakeAmount > 0 {
		g.ShakeAmount -= shakeDecay * dt
		if g.ShakeAmount < 0 {
			g.ShakeAmount = 0
		}
		g.ShakeOffsetX = (rand.Float64()*2 - 1) * g.ShakeAmount
		g.ShakeOffsetY = (rand.Float64()*2 - 1) * g.ShakeAmount
	} else {
		g.ShakeOffsetX = 0
		g.ShakeOffsetY = 0
	}
}

// ---------------------------------------------------------------------------
// Collisions
// ---------------------------------------------------------------------------

func (g *Game) checkBulletAsteroidCollisions() {
	for _, b := range g.Bullets {
		if !b.Alive {
			continue
		}
		for _, a := range g.Asteroids {
			if !a.Alive {
				continue
			}
			if circleCollision(b.X, b.Y, b.Radius, a.X, a.Y, a.Radius) {
				b.Alive = false
				a.Alive = false
				g.Score += a.Score
				g.checkExtraLife()
				g.spawnAsteroidExplosion(a)
				g.splitAsteroid(a)
				break
			}
		}
	}
}

func (g *Game) checkShipAsteroidCollisions() {
	for _, a := range g.Asteroids {
		if !a.Alive {
			continue
		}
		if circleCollision(g.Ship.X, g.Ship.Y, g.Ship.Radius, a.X, a.Y, a.Radius) {
			g.shipDestroyed()
			return
		}
	}
}

func (g *Game) shipDestroyed() {
	g.spawnShipExplosion()
	g.Ship.Alive = false
	g.Lives--
	g.RespawnTimer = respawnDelay
	g.ShakeAmount = 10
}

func (g *Game) splitAsteroid(a *Asteroid) {
	var newSize AsteroidSize
	switch a.Size {
	case SizeLarge:
		newSize = SizeMedium
	case SizeMedium:
		newSize = SizeSmall
	case SizeSmall:
		return // smallest, no split
	}
	for i := 0; i < 2; i++ {
		child := NewAsteroid(newSize, a.X, a.Y)
		g.Asteroids = append(g.Asteroids, child)
	}
}

func (g *Game) checkExtraLife() {
	if g.Score >= g.NextExtraLife {
		g.Lives++
		g.NextExtraLife += extraLifeInterval
	}
}

// ---------------------------------------------------------------------------
// Explosions
// ---------------------------------------------------------------------------

func (g *Game) spawnShipExplosion() {
	white := color.RGBA{255, 255, 255, 255}
	orange := color.RGBA{255, 165, 0, 255}
	for i := 0; i < 30; i++ {
		angle := rand.Float64() * 2 * math.Pi
		speed := 30 + rand.Float64()*120
		vx := math.Cos(angle) * speed
		vy := math.Sin(angle) * speed
		life := 0.5 + rand.Float64()*1.0
		clr := white
		if rand.Float64() < 0.5 {
			clr = orange
		}
		g.Particles = append(g.Particles, NewParticle(g.Ship.X, g.Ship.Y, vx, vy, life, clr))
	}
	g.ShakeAmount = 12
}

func (g *Game) spawnAsteroidExplosion(a *Asteroid) {
	var count int
	switch a.Size {
	case SizeLarge:
		count = 20
	case SizeMedium:
		count = 12
	case SizeSmall:
		count = 8
	}
	white := color.RGBA{255, 255, 255, 255}
	for i := 0; i < count; i++ {
		angle := rand.Float64() * 2 * math.Pi
		speed := 20 + rand.Float64()*80
		vx := math.Cos(angle) * speed
		vy := math.Sin(angle) * speed
		life := 0.3 + rand.Float64()*0.7
		g.Particles = append(g.Particles, NewParticle(a.X, a.Y, vx, vy, life, white))
	}
	switch a.Size {
	case SizeLarge:
		g.ShakeAmount = 6
	case SizeMedium:
		g.ShakeAmount = 3
	case SizeSmall:
		g.ShakeAmount = 1.5
	}
}

// ---------------------------------------------------------------------------
// Prune helpers
// ---------------------------------------------------------------------------

func (g *Game) pruneBullets() {
	n := 0
	for _, b := range g.Bullets {
		if b.Alive {
			g.Bullets[n] = b
			n++
		}
	}
	g.Bullets = g.Bullets[:n]
}

func (g *Game) pruneAsteroids() {
	n := 0
	for _, a := range g.Asteroids {
		if a.Alive {
			g.Asteroids[n] = a
			n++
		}
	}
	g.Asteroids = g.Asteroids[:n]
}

func (g *Game) pruneParticles() {
	n := 0
	for _, p := range g.Particles {
		if p.Alive {
			g.Particles[n] = p
			n++
		}
	}
	g.Particles = g.Particles[:n]
}

// ---------------------------------------------------------------------------
// Draw / Layout
// ---------------------------------------------------------------------------

func (g *Game) Draw(screen *ebiten.Image) {
	screen.Fill(color.RGBA{0, 0, 0, 255})
	drawGame(screen, g)
}

func (g *Game) Layout(outsideWidth, outsideHeight int) (int, int) {
	return screenWidth, screenHeight
}

// ---------------------------------------------------------------------------
// High score persistence
// ---------------------------------------------------------------------------

func highScorePath() string {
	home, err := os.UserHomeDir()
	if err != nil {
		return ""
	}
	return filepath.Join(home, ".asteroids_highscore_go")
}

func loadHighScore() int {
	path := highScorePath()
	if path == "" {
		return 0
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return 0
	}
	s := strings.TrimSpace(string(data))
	val, err := strconv.Atoi(s)
	if err != nil {
		return 0
	}
	return val
}

func saveHighScore(score int) {
	path := highScorePath()
	if path == "" {
		return
	}
	data := []byte(fmt.Sprintf("%d", score))
	_ = os.WriteFile(path, data, 0644)
}
