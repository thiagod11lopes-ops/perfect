import type { Config } from './bridge';
import { postComplete, postProgress } from './bridge';
import { START_COUNTDOWN_MS } from './missionCountdown';
import { playWinCelebration } from './winCelebration';
import type { Dir } from './bridge';
import { consumeDir } from './input';

export type Cell = { x: number; y: number };
export type Expression = 'idle' | 'eat' | 'dead';

/** Haltere ocupa 3×3 células; `food` é o canto superior-esquerdo. */
export type Food = { x: number; y: number };

export const FOOD_CELLS = 3;

/** Arena inclusiva: cobra e halteres só dentro deste retângulo. */
export type PlayBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

export type GridMetrics = {
  cols: number;
  rows: number;
  cellW: number;
  cellH: number;
  cssW: number;
  cssH: number;
  play: PlayBounds;
};

export function computePlayBounds(cols: number, rows: number): PlayBounds {
  const minY = 2;
  const minX = 0;
  const maxX = cols - 2;
  const maxY = rows - 8;
  return {
    minX,
    minY,
    maxX: Math.max(minX, maxX),
    maxY: Math.max(minY, maxY),
  };
}

export type GameState = {
  snake: Cell[];
  prevSnake: Cell[];
  growth: number;
  dir: Dir;
  food: Food;
  collected: number;
  timeLeftMs: number;
  alive: boolean;
  paused: boolean;
  userPaused: boolean;
  /** >0: missão não começou (timer e cobra parados). */
  countdownMs: number;
  cfg: Config;
  grid: GridMetrics;
  moveIntervalTicks: number;
  ticksSinceMove: number;
  expression: Expression;
  eatTicks: number;
  seed: number;
  gameOverLatch: boolean;
};

const TICK_HZ = 60;

export function foodCells(food: Food): Cell[] {
  const out: Cell[] = [];
  for (let dy = 0; dy < FOOD_CELLS; dy++) {
    for (let dx = 0; dx < FOOD_CELLS; dx++) {
      out.push({ x: food.x + dx, y: food.y + dy });
    }
  }
  return out;
}

function headHitsFood(head: Cell, food: Food): boolean {
  return (
    head.x >= food.x &&
    head.x < food.x + FOOD_CELLS &&
    head.y >= food.y &&
    head.y < food.y + FOOD_CELLS
  );
}

function randFood(play: PlayBounds, avoid: Set<string>): Food {
  const spanX = play.maxX - play.minX + 1;
  const spanY = play.maxY - play.minY + 1;
  if (spanX < FOOD_CELLS || spanY < FOOD_CELLS) return { x: play.minX, y: play.minY };
  const maxX = play.maxX - FOOD_CELLS + 1;
  const maxY = play.maxY - FOOD_CELLS + 1;
  for (let safety = 0; safety < 400; safety++) {
    const x = play.minX + Math.floor(Math.random() * (maxX - play.minX + 1));
    const y = play.minY + Math.floor(Math.random() * (maxY - play.minY + 1));
    let ok = true;
    for (let dy = 0; dy < FOOD_CELLS && ok; dy++) {
      for (let dx = 0; dx < FOOD_CELLS; dx++) {
        if (avoid.has(`${x + dx},${y + dy}`)) ok = false;
      }
    }
    if (ok) return { x, y };
  }
  return { x: play.minX, y: play.minY };
}

export function computeGrid(cssW: number, cssH: number): GridMetrics {
  const cols = Math.max(8, Math.floor(cssW / 12));
  const rows = Math.max(10, Math.floor(cssH / 12));
  const cellW = cssW / cols;
  const cellH = cssH / rows;
  const play = computePlayBounds(cols, rows);
  return { cols, rows, cellW, cellH, cssW, cssH, play };
}

function moveIntervalForApples(a: number): number {
  return Math.max(3, 6 - Math.floor(a / 8));
}

export function createGame(cfg: Config, grid: GridMetrics): GameState {
  const p = grid.play;
  const hx = Math.floor((p.minX + p.maxX) / 2);
  const hy = p.maxY;
  const snake: Cell[] = [
    { x: hx, y: hy },
    { x: hx, y: hy + 1 },
    { x: hx, y: hy + 2 },
  ];
  const occupied = new Set(snake.map((c) => `${c.x},${c.y}`));
  const food = randFood(p, occupied);
  return {
    snake,
    prevSnake: snake.map((c) => ({ ...c })),
    growth: 0,
    dir: 'UP',
    food,
    collected: 0,
    timeLeftMs: cfg.durationMs,
    alive: true,
    paused: false,
    userPaused: false,
    countdownMs: START_COUNTDOWN_MS,
    cfg,
    grid,
    moveIntervalTicks: 6,
    ticksSinceMove: 0,
    expression: 'idle',
    eatTicks: 0,
    seed: (Date.now() & 0xffffffff) || 1,
    gameOverLatch: false,
  };
}

export function triggerGameOver(state: GameState): void {
  if (state.gameOverLatch) return;
  state.alive = false;
  state.paused = true;
  state.userPaused = false;
  state.expression = 'dead';
  state.gameOverLatch = true;
}

function wrapCell(c: Cell, play: PlayBounds): Cell {
  let { x, y } = c;
  const w = play.maxX - play.minX + 1;
  const h = play.maxY - play.minY + 1;
  while (x < play.minX) x += w;
  while (x > play.maxX) x -= w;
  while (y < play.minY) y += h;
  while (y > play.maxY) y -= h;
  return { x, y };
}

/** DEV / parent postMessage: último haltere + vídeo de vitória. */
export function forceMissionWin(state: GameState): void {
  state.gameOverLatch = false;
  state.countdownMs = 0;
  state.collected = state.cfg.targetCoins;
  state.paused = true;
  state.userPaused = false;
  state.alive = true;
  state.expression = 'eat';
  postProgress(state.collected, state.cfg.targetCoins);
  playWinCelebration(
    () => postComplete(true, state.collected, state.cfg.targetCoins),
    state.cfg.targetCoins,
  );
}

export function toggleUserPause(state: GameState): boolean {
  if (!state.alive || state.paused || state.countdownMs > 0) return state.userPaused;
  state.userPaused = !state.userPaused;
  return state.userPaused;
}

function stepSnake(state: GameState): void {
  if (!state.alive || state.paused || state.userPaused) return;

  state.prevSnake = state.snake.map((c) => ({ ...c }));
  state.dir = consumeDir(state.dir);

  const head = state.snake[0]!;
  const next: Cell = { x: head.x, y: head.y };
  switch (state.dir) {
    case 'UP': next.y -= 1; break;
    case 'DOWN': next.y += 1; break;
    case 'LEFT': next.x -= 1; break;
    case 'RIGHT': next.x += 1; break;
  }

  const wrapped = wrapCell(next, state.grid.play);
  next.x = wrapped.x;
  next.y = wrapped.y;

  const body = state.snake.slice(0, -1);
  if (body.some((c) => c.x === next.x && c.y === next.y)) {
    triggerGameOver(state);
    return;
  }

  state.snake.unshift(next);

  if (headHitsFood(next, state.food)) {
    state.collected++;
    // +50% do comprimento atual (segmentos pendentes em `growth`).
    const lenBeforeEat = state.snake.length - 1;
    state.growth += Math.max(1, Math.floor(lenBeforeEat * 0.5));
    state.expression = 'eat';
    state.eatTicks = 8;
    state.moveIntervalTicks = moveIntervalForApples(state.collected);
    postProgress(state.collected, state.cfg.targetCoins);

    if (state.collected >= state.cfg.targetCoins) {
      state.paused = true;
      playWinCelebration(
        () => postComplete(true, state.collected, state.cfg.targetCoins),
        state.cfg.targetCoins,
      );
    } else {
      const occ = new Set(state.snake.map((c) => `${c.x},${c.y}`));
      state.food = randFood(state.grid.play, occ);
    }
  }

  if (state.growth > 0) state.growth--;
  else state.snake.pop();
}

export function updateGame(state: GameState, dtSeconds: number): void {
  if (!state.alive || state.paused || state.userPaused) return;

  const dtMs = dtSeconds * 1000;
  if (state.countdownMs > 0) {
    state.countdownMs = Math.max(0, state.countdownMs - dtMs);
    return;
  }

  state.timeLeftMs -= dtMs;
  if (state.timeLeftMs <= 0) {
    state.timeLeftMs = 0;
    if (state.collected >= state.cfg.targetCoins) {
      state.paused = true;
      playWinCelebration(
        () => postComplete(true, state.collected, state.cfg.targetCoins),
        state.cfg.targetCoins,
      );
    } else {
      triggerGameOver(state);
    }
    return;
  }

  if (state.eatTicks > 0) {
    state.eatTicks--;
    if (state.eatTicks === 0 && state.alive) state.expression = 'idle';
  }

  state.ticksSinceMove++;
  if (state.ticksSinceMove >= state.moveIntervalTicks) {
    state.ticksSinceMove = 0;
    stepSnake(state);
  }
}

export function retargetGrid(state: GameState, grid: GridMetrics): GameState {
  if (grid.cols === state.grid.cols && grid.rows === state.grid.rows) {
    state.grid = grid;
    return state;
  }
  return createGame(state.cfg, grid);
}

export const FIXED_DT_S = 1 / TICK_HZ;