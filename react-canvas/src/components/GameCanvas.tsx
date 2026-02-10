import { useGameEngine } from '../hooks/useGameEngine';
import { HUD } from './HUD';
import { TitleScreen } from './TitleScreen';
import { GameOverScreen } from './GameOverScreen';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../game/constants';

export function GameCanvas() {
  const { canvasRef, gameState } = useGameEngine();

  return (
    <div className="game-container">
      <canvas
        ref={canvasRef}
        className="game-canvas"
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
      />
      <HUD gameState={gameState} />
      {gameState.phase === 'title' && (
        <TitleScreen highScore={gameState.highScore} />
      )}
      {gameState.phase === 'gameOver' && (
        <GameOverScreen score={gameState.score} highScore={gameState.highScore} />
      )}
    </div>
  );
}
