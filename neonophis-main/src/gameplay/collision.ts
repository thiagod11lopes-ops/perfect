// Grid-based collision. §10.

import { type GameState } from '../engine/state';
import { gridH, gridW } from '../engine/grid';

export type CollisionKind = 'none' | 'wall' | 'self';

export function checkHeadCollision(state: GameState): CollisionKind {
  const head = state.snake.body[0]!;
  if (state.invincible || state.passWalls) {
    // walls handled by wrap in stepSnake when these flags are on; only self when not invincible
    if (state.invincible) return 'none';
  }
  const gW = gridW();
  const gH = gridH();
  if (head.x < 0 || head.x >= gW || head.y < 0 || head.y >= gH) return 'wall';
  // Self: in relax mode only the tail tip is lethal; elsewhere any body cell.
  const body = state.snake.body;
  if (state.mode === 'relax') {
    const tail = body[body.length - 1];
    if (tail && tail.x === head.x && tail.y === head.y) return 'self';
  } else {
    for (let i = 1; i < body.length; i++) {
      const c = body[i]!;
      if (c.x === head.x && c.y === head.y) return 'self';
    }
  }
  return 'none';
}
