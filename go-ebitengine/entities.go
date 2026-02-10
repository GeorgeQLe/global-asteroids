package main

import (
	"image/color"
	"math"
	"math/rand"
)

// ---------------------------------------------------------------------------
// Ship
// ---------------------------------------------------------------------------

type Ship struct {
	X, Y          float64
	VX, VY        float64
	Angle         float64 // radians
	Radius        float64
	Alive         bool
	InvulnTimer   float64
	BlinkTimer    float64
	Visible       bool
	Thrusting     bool
	ThrustFlicker float64
	ShootCooldown float64
}

func NewShip(x, y float64) *Ship {
	return &Ship{
		X:       x,
		Y:       y,
		Angle:   -math.Pi / 2, // pointing up
		Radius:  shipRadius,
		Alive:   true,
		Visible: true,
	}
}

func (s *Ship) Update() {
	if !s.Alive {
		return
	}

	// Invulnerability blink
	if s.InvulnTimer > 0 {
		s.InvulnTimer -= dt
		if s.InvulnTimer < 0 {
			s.InvulnTimer = 0
		}
		s.BlinkTimer -= dt
		if s.BlinkTimer <= 0 {
			s.Visible = !s.Visible
			s.BlinkTimer = 0.1
		}
	} else {
		s.Visible = true
	}

	// Friction
	s.VX *= friction
	s.VY *= friction

	// Speed cap
	speed := math.Sqrt(s.VX*s.VX + s.VY*s.VY)
	if speed > maxSpeed {
		s.VX = s.VX / speed * maxSpeed
		s.VY = s.VY / speed * maxSpeed
	}

	// Move
	s.X += s.VX * dt
	s.Y += s.VY * dt

	// Wrap
	s.X = wrap(s.X, screenWidth)
	s.Y = wrap(s.Y, screenHeight)

	// Shoot cooldown
	if s.ShootCooldown > 0 {
		s.ShootCooldown -= dt
	}

	// Thrust flicker
	if s.Thrusting {
		s.ThrustFlicker -= dt
		if s.ThrustFlicker <= 0 {
			s.ThrustFlicker = 0.03 + rand.Float64()*0.04
		}
	}
}

// ---------------------------------------------------------------------------
// Asteroid
// ---------------------------------------------------------------------------

type AsteroidSize int

const (
	SizeLarge  AsteroidSize = iota
	SizeMedium
	SizeSmall
)

type Asteroid struct {
	X, Y          float64
	VX, VY        float64
	Radius        float64
	RotationAngle float64
	RotationSpeed float64
	Size          AsteroidSize
	Score         int
	Alive         bool
	Vertices      [][2]float64 // (angle, distance) pairs
}

func NewAsteroid(size AsteroidSize, x, y float64) *Asteroid {
	var radius, speed float64
	var score int

	switch size {
	case SizeLarge:
		radius = 40
		speed = 50
		score = 20
	case SizeMedium:
		radius = 20
		speed = 80
		score = 50
	case SizeSmall:
		radius = 10
		speed = 120
		score = 100
	}

	angle := rand.Float64() * 2 * math.Pi
	vx := math.Cos(angle) * speed
	vy := math.Sin(angle) * speed

	rotSpeed := (rand.Float64()*180 - 90) * math.Pi / 180 // -90..90 deg/s in radians

	// Generate jagged vertices
	numVerts := 8 + rand.Intn(5) // 8-12
	verts := make([][2]float64, numVerts)
	for i := 0; i < numVerts; i++ {
		a := float64(i) / float64(numVerts) * 2 * math.Pi
		dist := radius * (1.0 - jaggedness + rand.Float64()*jaggedness*2)
		verts[i] = [2]float64{a, dist}
	}

	return &Asteroid{
		X:             x,
		Y:             y,
		VX:            vx,
		VY:            vy,
		Radius:        radius,
		RotationAngle: 0,
		RotationSpeed: rotSpeed,
		Size:          size,
		Score:         score,
		Alive:         true,
		Vertices:      verts,
	}
}

func (a *Asteroid) Update() {
	if !a.Alive {
		return
	}
	a.X += a.VX * dt
	a.Y += a.VY * dt
	a.RotationAngle += a.RotationSpeed * dt

	a.X = wrap(a.X, screenWidth)
	a.Y = wrap(a.Y, screenHeight)
}

// ---------------------------------------------------------------------------
// Bullet
// ---------------------------------------------------------------------------

type Bullet struct {
	X, Y     float64
	VX, VY   float64
	Radius   float64
	Lifetime float64
	Alive    bool
}

func NewBullet(x, y, angle float64) *Bullet {
	return &Bullet{
		X:        x,
		Y:        y,
		VX:       math.Cos(angle) * bulletSpeed,
		VY:       math.Sin(angle) * bulletSpeed,
		Radius:   2,
		Lifetime: bulletLifetime,
		Alive:    true,
	}
}

func (b *Bullet) Update() {
	if !b.Alive {
		return
	}
	b.X += b.VX * dt
	b.Y += b.VY * dt
	b.Lifetime -= dt
	if b.Lifetime <= 0 {
		b.Alive = false
		return
	}
	b.X = wrap(b.X, screenWidth)
	b.Y = wrap(b.Y, screenHeight)
}

// ---------------------------------------------------------------------------
// Particle
// ---------------------------------------------------------------------------

type Particle struct {
	X, Y        float64
	VX, VY      float64
	Lifetime    float64
	MaxLifetime float64
	Color       color.RGBA
	Alive       bool
}

func NewParticle(x, y, vx, vy, lifetime float64, clr color.RGBA) *Particle {
	return &Particle{
		X:           x,
		Y:           y,
		VX:          vx,
		VY:          vy,
		Lifetime:    lifetime,
		MaxLifetime: lifetime,
		Color:       clr,
		Alive:       true,
	}
}

func (p *Particle) Update() {
	if !p.Alive {
		return
	}
	p.X += p.VX * dt
	p.Y += p.VY * dt
	p.VX *= 0.98
	p.VY *= 0.98
	p.Lifetime -= dt
	if p.Lifetime <= 0 {
		p.Alive = false
	}
}

// ---------------------------------------------------------------------------
// Star (background)
// ---------------------------------------------------------------------------

type Star struct {
	X, Y       float64
	Brightness float64
	Size       float64
}

func NewStar() Star {
	return Star{
		X:          rand.Float64() * screenWidth,
		Y:          rand.Float64() * screenHeight,
		Brightness: 0.3 + rand.Float64()*0.7,
		Size:       0.5 + rand.Float64()*1.5,
	}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func wrap(val, max float64) float64 {
	for val < 0 {
		val += max
	}
	for val >= max {
		val -= max
	}
	return val
}

func distSq(x1, y1, x2, y2 float64) float64 {
	dx := x1 - x2
	dy := y1 - y2
	return dx*dx + dy*dy
}

func circleCollision(x1, y1, r1, x2, y2, r2 float64) bool {
	d := r1 + r2
	return distSq(x1, y1, x2, y2) < d*d
}
