interface TitleScreenProps {
  highScore: number;
}

export function TitleScreen({ highScore }: TitleScreenProps) {
  return (
    <div className="overlay">
      <div className="overlay-title">ASTEROIDS</div>
      <div className="overlay-subtitle">PRESS SPACE TO START</div>
      {highScore > 0 && (
        <div className="overlay-high-score" style={{ marginTop: '20px' }}>
          HIGH SCORE: {highScore.toString().padStart(6, '0')}
        </div>
      )}
      <div className="overlay-controls">
        ARROW KEYS / WASD - MOVE &amp; ROTATE<br />
        SPACE - SHOOT
      </div>
    </div>
  );
}
