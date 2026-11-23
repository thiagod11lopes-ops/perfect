// Global game state machine and shared world state.
// Authoritative grid, snake, food, combo, mode, etc. live here.

import type { ModeId } from '../gameplay/modes';
import type { ActivePowerUp } from '../gameplay/powerups';
import { gridH, gridW } from './grid';

export const GRID_W = 32;
export const GRID_H = 24;
export const TICK_HZ = 60;

export type Phase = 'MENU' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'TRANSITION';

export interface Cell { x: number; y: number; }

export interface FoodItem {
  x: number; y: number;
  kind: FoodKind;
  hue: number;          // for rainbow shimmer
  bornTick: number;
  ttl: number;          // ticks; 0 = forever
}

export type FoodKind =
  | 'apple'
  | 'cherry'
  | 'star'
  | 'rainbow'
  | 'fire'
  | 'ice'
  | 'magnet';

export interface Snake {
  body: Cell[];           // head at index 0
  prevBody: Cell[];       // for interpolation
  dir: Direction;
  pendingDir: Direction;
  growth: number;         // pending growth in segments
  alive: boolean;
}

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface ComboState {
  count: number;          // current combo chain
  best: number;           // best combo this run
  multiplier: number;     // active points multiplier
  decayTicks: number;     // remaining ticks before combo resets
  decayMax: number;
}

export interface RunStats {
  score: number;
  applesEaten: number;
  powerupsEaten: number;
  startTimeMs: number;
  endTimeMs: number;
  highestCombo: number;
}

export interface Cosmetics {
  hat: 'none' | 'cowboy' | 'crown' | 'shades';
  skin: 'classic' | 'gold' | 'matrix';
  discoMode: boolean;
}

export interface GameState {
  phase: Phase;
  mode: ModeId;
  tick: number;            // logical tick counter
  seed: number;
  snake: Snake;
  foods: FoodItem[];
  maxFoods: number;
  combo: ComboState;
  stats: RunStats;
  powerups: ActivePowerUp[];
  cosmetics: Cosmetics;
  moveIntervalTicks: number;  // how many logical ticks between snake moves
  ticksSinceMove: number;
  timeRemainingMs: number;    // for TimeAttack; -1 = unlimited
  speedMultiplier: number;    // dynamic, used by powerups
  scoreMultiplier: number;
  invincible: boolean;
  passWalls: boolean;
  magnetRadius: number;
  paused: boolean;
  hudFlash: number;           // 0..1 for HUD pulses
  bgIntensity: number;        // music/bg intensity 0..1
}

export function createInitialState(mode: ModeId, seed: number): GameState {
  const w = gridW();
  const h = gridH();
  const startX = Math.floor(w / 2);
  const startY = Math.floor(h / 2);
  const body: Cell[] = [
    { x: startX,     y: startY },
    { x: startX - 1, y: startY },
    { x: startX - 2, y: startY },
  ];
  return {
    phase: 'PLAYING',
    mode,
    tick: 0,
    seed,
    snake: {
      body,
      prevBody: body.map(c => ({ ...c })),
      dir: 'RIGHT',
      pendingDir: 'RIGHT',
      growth: 0,
      alive: true,
    },
    foods: [],
    maxFoods: 1,
    combo: { count: 0, best: 0, multiplier: 1, decayTicks: 0, decayMax: 180 },
    stats: {
      score: 0, applesEaten: 0, powerupsEaten: 0,
      startTimeMs: performance.now(), endTimeMs: 0, highestCombo: 0,
    },
    powerups: [],
    cosmetics: { hat: 'none', skin: 'classic', discoMode: false },
    moveIntervalTicks: 8, // ~7.5 cells/sec at 60Hz logical
    ticksSinceMove: 0,
    timeRemainingMs: mode === 'timeattack' ? 60_000 : -1,
    speedMultiplier: 1,
    scoreMultiplier: 1,
    invincible: false,
    passWalls: mode === 'timeattack' || mode === 'relax',
    magnetRadius: 0,
    paused: false,
    hudFlash: 0,
    bgIntensity: 0,
  };
}

export function isOpposite(a: Direction, b: Direction): boolean {
  return (
    (a === 'UP' && b === 'DOWN') ||
    (a === 'DOWN' && b === 'UP') ||
    (a === 'LEFT' && b === 'RIGHT') ||
    (a === 'RIGHT' && b === 'LEFT')
  );
}

export function dirToDelta(d: Direction): { dx: number; dy: number } {
  switch (d) {
    case 'UP':    return { dx:  0, dy: -1 };
    case 'DOWN':  return { dx:  0, dy:  1 };
    case 'LEFT':  return { dx: -1, dy:  0 };
    case 'RIGHT': return { dx:  1, dy:  0 };
  }
}
