import { useRef, useState, useCallback, useEffect } from 'react';
import { GameEngine } from '../game/GameEngine';
import type { GameState } from '../game/types';
import { STARTING_LIVES } from '../game/constants';

const initialState: GameState = {
  score: 0,
  lives: STARTING_LIVES,
  phase: 'title',
  highScore: 0,
  wave: 0,
};

export function useGameEngine() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [gameState, setGameState] = useState<GameState>(initialState);

  const handleStateChange = useCallback((state: GameState) => {
    setGameState(state);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new GameEngine();
    engine.onStateChange = handleStateChange;
    engine.attach(canvas);
    engineRef.current = engine;

    // Push initial state
    setGameState(engine.getState());

    return () => {
      engine.detach();
      engineRef.current = null;
    };
  }, [handleStateChange]);

  return {
    canvasRef,
    gameState,
  };
}
