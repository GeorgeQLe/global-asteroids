import type { GameState } from '../game/types';

interface HUDProps {
  gameState: GameState;
}

function ShipIcon() {
  return (
    <svg width="20" height="24" viewBox="-14 -14 28 28">
      <polygon
        points="0,-12 -8,8 -3,4 3,4 8,8"
        fill="none"
        stroke="white"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function HUD({ gameState }: HUDProps) {
  const { score, lives, highScore, wave, phase } = gameState;

  if (phase !== 'playing') return null;

  return (
    <div className="hud">
      <div className="hud-score">{score.toString().padStart(6, '0')}</div>
      <div className="hud-high-score">HI {highScore.toString().padStart(6, '0')}</div>
      <div className="hud-lives">
        {Array.from({ length: lives }, (_, i) => (
          <ShipIcon key={i} />
        ))}
      </div>
      <div className="hud-wave">WAVE {wave}</div>
    </div>
  );
}
