interface GameOverScreenProps {
  score: number;
  highScore: number;
}

export function GameOverScreen({ score, highScore }: GameOverScreenProps) {
  return (
    <div className="overlay">
      <div className="overlay-game-over-title">GAME OVER</div>
      <div className="overlay-score-label">FINAL SCORE</div>
      <div className="overlay-score-value">{score.toString().padStart(6, '0')}</div>
      <div className="overlay-high-score">
        HIGH SCORE: {highScore.toString().padStart(6, '0')}
      </div>
      <div className="overlay-subtitle">PRESS SPACE TO PLAY AGAIN</div>
    </div>
  );
}
