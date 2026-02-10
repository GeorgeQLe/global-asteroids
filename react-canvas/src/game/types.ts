export interface Vector2D {
  x: number;
  y: number;
}

export type AsteroidSize = 'large' | 'medium' | 'small';

export type GamePhase = 'title' | 'playing' | 'gameOver';

export interface GameState {
  score: number;
  lives: number;
  phase: GamePhase;
  highScore: number;
  wave: number;
}
