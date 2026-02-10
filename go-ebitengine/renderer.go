package main

import (
	"fmt"
	"image/color"
	"math"

	"github.com/hajimehoshi/ebiten/v2"
	"github.com/hajimehoshi/ebiten/v2/ebitenutil"
	"github.com/hajimehoshi/ebiten/v2/vector"
)

var (
	colorWhite  = color.RGBA{255, 255, 255, 255}
	colorOrange = color.RGBA{255, 165, 0, 255}
	colorYellow = color.RGBA{255, 255, 0, 255}
)

// ---------------------------------------------------------------------------
// Main draw dispatcher
// ---------------------------------------------------------------------------

func drawGame(screen *ebiten.Image, g *Game) {
	ox := g.ShakeOffsetX
	oy := g.ShakeOffsetY

	drawStars(screen, g, ox, oy)

	switch g.Phase {
	case PhaseTitle:
		drawTitle(screen, g)
	case PhasePlaying:
		drawPlaying(screen, g, ox, oy)
	case PhaseGameOver:
		drawPlaying(screen, g, ox, oy)
		drawGameOver(screen, g)
	}
}

func drawPlaying(screen *ebiten.Image, g *Game, ox, oy float64) {
	// Asteroids
	for _, a := range g.Asteroids {
		if a.Alive {
			drawAsteroidWrapped(screen, a, ox, oy)
		}
	}

	// Bullets
	for _, b := range g.Bullets {
		if b.Alive {
			drawBulletWrapped(screen, b, ox, oy)
		}
	}

	// Ship
	if g.Ship.Alive && g.Ship.Visible {
		drawShipWrapped(screen, g.Ship, ox, oy)
	}

	// Particles
	for _, p := range g.Particles {
		if p.Alive {
			drawParticle(screen, p, ox, oy)
		}
	}

	// HUD
	drawHUD(screen, g)
}

// ---------------------------------------------------------------------------
// Star field
// ---------------------------------------------------------------------------

func drawStars(screen *ebiten.Image, g *Game, ox, oy float64) {
	for _, s := range g.Stars {
		b := uint8(s.Brightness * 255)
		clr := color.RGBA{b, b, b, 255}
		vector.DrawFilledCircle(screen,
			float32(s.X+ox), float32(s.Y+oy), float32(s.Size*0.5),
			clr, false)
	}
}

// ---------------------------------------------------------------------------
// Ship drawing
// ---------------------------------------------------------------------------

func drawShipWrapped(screen *ebiten.Image, s *Ship, ox, oy float64) {
	offsets := wrapOffsets(s.X, s.Y, shipSize)
	for _, o := range offsets {
		drawShipAt(screen, s, s.X+o[0]+ox, s.Y+o[1]+oy)
	}
}

func drawShipAt(screen *ebiten.Image, s *Ship, cx, cy float64) {
	// Ship triangle: nose, left, right
	noseLen := shipSize * 0.6
	rearLen := shipSize * 0.5
	rearAngle := 2.4 // radians, ~137 degrees from forward

	nx := cx + math.Cos(s.Angle)*noseLen
	ny := cy + math.Sin(s.Angle)*noseLen
	lx := cx + math.Cos(s.Angle+rearAngle)*rearLen
	ly := cy + math.Sin(s.Angle+rearAngle)*rearLen
	rx := cx + math.Cos(s.Angle-rearAngle)*rearLen
	ry := cy + math.Sin(s.Angle-rearAngle)*rearLen

	strokeLine(screen, nx, ny, lx, ly, 1.5, colorWhite)
	strokeLine(screen, lx, ly, rx, ry, 1.5, colorWhite)
	strokeLine(screen, rx, ry, nx, ny, 1.5, colorWhite)

	// Thrust flame
	if s.Thrusting {
		flameLen := shipSize * (0.35 + s.ThrustFlicker*3)
		baseSpread := 0.4
		bx := cx - math.Cos(s.Angle)*flameLen
		by := cy - math.Sin(s.Angle)*flameLen

		fl1x := cx + math.Cos(s.Angle+math.Pi-baseSpread)*rearLen*0.4
		fl1y := cy + math.Sin(s.Angle+math.Pi-baseSpread)*rearLen*0.4
		fl2x := cx + math.Cos(s.Angle+math.Pi+baseSpread)*rearLen*0.4
		fl2y := cy + math.Sin(s.Angle+math.Pi+baseSpread)*rearLen*0.4

		flameColor := colorOrange
		if s.ThrustFlicker > 0.02 {
			flameColor = colorYellow
		}

		strokeLine(screen, fl1x, fl1y, bx, by, 1.0, flameColor)
		strokeLine(screen, fl2x, fl2y, bx, by, 1.0, flameColor)
	}
}

// ---------------------------------------------------------------------------
// Asteroid drawing
// ---------------------------------------------------------------------------

func drawAsteroidWrapped(screen *ebiten.Image, a *Asteroid, ox, oy float64) {
	offsets := wrapOffsets(a.X, a.Y, a.Radius)
	for _, o := range offsets {
		drawAsteroidAt(screen, a, a.X+o[0]+ox, a.Y+o[1]+oy)
	}
}

func drawAsteroidAt(screen *ebiten.Image, a *Asteroid, cx, cy float64) {
	n := len(a.Vertices)
	if n < 2 {
		return
	}
	for i := 0; i < n; i++ {
		j := (i + 1) % n
		ang1 := a.Vertices[i][0] + a.RotationAngle
		dist1 := a.Vertices[i][1]
		ang2 := a.Vertices[j][0] + a.RotationAngle
		dist2 := a.Vertices[j][1]

		x1 := cx + math.Cos(ang1)*dist1
		y1 := cy + math.Sin(ang1)*dist1
		x2 := cx + math.Cos(ang2)*dist2
		y2 := cy + math.Sin(ang2)*dist2

		strokeLine(screen, x1, y1, x2, y2, 1.0, colorWhite)
	}
}

// ---------------------------------------------------------------------------
// Bullet drawing
// ---------------------------------------------------------------------------

func drawBulletWrapped(screen *ebiten.Image, b *Bullet, ox, oy float64) {
	offsets := wrapOffsets(b.X, b.Y, b.Radius)
	for _, o := range offsets {
		vector.DrawFilledCircle(screen,
			float32(b.X+o[0]+ox), float32(b.Y+o[1]+oy), float32(b.Radius),
			colorWhite, true)
	}
}

// ---------------------------------------------------------------------------
// Particle drawing
// ---------------------------------------------------------------------------

func drawParticle(screen *ebiten.Image, p *Particle, ox, oy float64) {
	alpha := p.Lifetime / p.MaxLifetime
	if alpha < 0 {
		alpha = 0
	}
	clr := color.RGBA{
		p.Color.R,
		p.Color.G,
		p.Color.B,
		uint8(alpha * 255),
	}
	vector.DrawFilledCircle(screen,
		float32(p.X+ox), float32(p.Y+oy), 2,
		clr, false)
}

// ---------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------

func drawHUD(screen *ebiten.Image, g *Game) {
	// Score (6-digit padded) top-left
	scoreStr := fmt.Sprintf("%06d", g.Score)
	ebitenutil.DebugPrintAt(screen, scoreStr, 10, 10)

	// Wave number
	waveStr := fmt.Sprintf("WAVE %d", g.Wave)
	ebitenutil.DebugPrintAt(screen, waveStr, 10, 28)

	// High score top-right
	hiStr := fmt.Sprintf("HI %06d", g.HighScore)
	ebitenutil.DebugPrintAt(screen, hiStr, screenWidth-100, 10)

	// Life icons
	drawLifeIcons(screen, g)
}

func drawLifeIcons(screen *ebiten.Image, g *Game) {
	for i := 0; i < g.Lives; i++ {
		cx := float64(30 + i*25)
		cy := float64(60)
		drawMiniShip(screen, cx, cy)
	}
}

func drawMiniShip(screen *ebiten.Image, cx, cy float64) {
	angle := -math.Pi / 2 // pointing up
	size := 8.0
	noseLen := size * 0.6
	rearLen := size * 0.5
	rearAngle := 2.4

	nx := cx + math.Cos(angle)*noseLen
	ny := cy + math.Sin(angle)*noseLen
	lx := cx + math.Cos(angle+rearAngle)*rearLen
	ly := cy + math.Sin(angle+rearAngle)*rearLen
	rx := cx + math.Cos(angle-rearAngle)*rearLen
	ry := cy + math.Sin(angle-rearAngle)*rearLen

	strokeLine(screen, nx, ny, lx, ly, 1.0, colorWhite)
	strokeLine(screen, lx, ly, rx, ry, 1.0, colorWhite)
	strokeLine(screen, rx, ry, nx, ny, 1.0, colorWhite)
}

// ---------------------------------------------------------------------------
// Title / Game Over overlays
// ---------------------------------------------------------------------------

func drawTitle(screen *ebiten.Image, g *Game) {
	ebitenutil.DebugPrintAt(screen, "A S T E R O I D S", screenWidth/2-55, screenHeight/2-60)

	if int(g.TitleBlink*2)%2 == 0 {
		ebitenutil.DebugPrintAt(screen, "PRESS SPACE OR ENTER TO START", screenWidth/2-95, screenHeight/2)
	}

	hiStr := fmt.Sprintf("HIGH SCORE: %06d", g.HighScore)
	ebitenutil.DebugPrintAt(screen, hiStr, screenWidth/2-60, screenHeight/2+40)
}

func drawGameOver(screen *ebiten.Image, g *Game) {
	ebitenutil.DebugPrintAt(screen, "G A M E   O V E R", screenWidth/2-55, screenHeight/2-40)

	scoreStr := fmt.Sprintf("SCORE: %06d", g.Score)
	ebitenutil.DebugPrintAt(screen, scoreStr, screenWidth/2-45, screenHeight/2)

	if int(g.TitleBlink*2)%2 == 0 {
		ebitenutil.DebugPrintAt(screen, "PRESS SPACE OR ENTER TO RESTART", screenWidth/2-100, screenHeight/2+40)
	}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func strokeLine(dst *ebiten.Image, x1, y1, x2, y2 float64, width float64, clr color.Color) {
	vector.StrokeLine(dst,
		float32(x1), float32(y1), float32(x2), float32(y2),
		float32(width), clr, true)
}

// wrapOffsets returns a list of (dx, dy) offsets for double-draw at edges.
// Always includes (0,0). Adds mirrored copies when entity is near an edge.
func wrapOffsets(x, y, margin float64) [][2]float64 {
	offsets := [][2]float64{{0, 0}}

	nearLeft := x < margin
	nearRight := x > screenWidth-margin
	nearTop := y < margin
	nearBottom := y > screenHeight-margin

	if nearLeft {
		offsets = append(offsets, [2]float64{screenWidth, 0})
	}
	if nearRight {
		offsets = append(offsets, [2]float64{-screenWidth, 0})
	}
	if nearTop {
		offsets = append(offsets, [2]float64{0, screenHeight})
	}
	if nearBottom {
		offsets = append(offsets, [2]float64{0, -screenHeight})
	}

	// Corners
	if nearLeft && nearTop {
		offsets = append(offsets, [2]float64{screenWidth, screenHeight})
	}
	if nearLeft && nearBottom {
		offsets = append(offsets, [2]float64{screenWidth, -screenHeight})
	}
	if nearRight && nearTop {
		offsets = append(offsets, [2]float64{-screenWidth, screenHeight})
	}
	if nearRight && nearBottom {
		offsets = append(offsets, [2]float64{-screenWidth, -screenHeight})
	}

	return offsets
}
