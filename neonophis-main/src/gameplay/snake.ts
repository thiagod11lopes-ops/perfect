// Snake step — §10. Grid-discrete movement, deque-style.

import { dirToDelta, type GameState } from '../engine/state';
import { gridH, gridW } from '../engine/grid';

export function stepSnake(state: GameState, newDir: GameState['snake']['dir']): { newHead: { x: number; y: number } } {
  const s = state.snake;
  // Snapshot previous body for render interpolation.
  s.prevBody = s.body.map(c => ({ x: c.x, y: c.y }));
  s.dir = newDir;
  const { dx, dy } = dirToDelta(newDir);
  let nx = s.body[0]!.x + dx;
  let ny = s.body[0]!.y + dy;

  if (state.passWalls || state.invincible) {
    const gW = gridW();
    const gH = gridH();
    if (nx < 0) nx = gW - 1; else if (nx >= gW) nx = 0;
    if (ny < 0) ny = gH - 1; else if (ny >= gH) ny = 0;
  }

  // Push new head
  s.body.unshift({ x: nx, y: ny });

  // Pop tail unless growing
  if (s.growth > 0) {
    s.growth--;
  } else {
    s.body.pop();
  }

  return { newHead: { x: nx, y: ny } };
}

export function grow(state: GameState, segments: number): void {
  state.snake.growth += segments;
}

export function snakeOccupiesCell(state: GameState, x: number, y: number, skipHead = false): boolean {
  const body = state.snake.body;
  for (let i = skipHead ? 1 : 0; i < body.length; i++) {
    const c = body[i]!;
    if (c.x === x && c.y === y) return true;
  }
  return false;
}
