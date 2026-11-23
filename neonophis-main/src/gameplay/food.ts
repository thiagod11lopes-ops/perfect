// Food spawning + types.

import { rand, randInt } from '../engine/rng';
import { type FoodItem, type FoodKind, type GameState } from '../engine/state';
import { gridH, gridW } from '../engine/grid';
import { isPerfectEmbed } from '../embed/perfect';
import { snakeOccupiesCell } from './snake';

interface SpawnConfig {
  powerupBaseChance: number;  // 0..1
  rareTypeChance: number;     // chance to upgrade common→rare
  ttlPowerup: number;
}

export const FOOD_SCORES: Record<FoodKind, number> = {
  apple: 10,
  cherry: 25,
  star: 50,
  rainbow: 30,
  fire: 30,
  ice: 30,
  magnet: 30,
};

export function spawnFood(state: GameState, cfg: SpawnConfig): FoodItem | null {
  const occupied = new Set<number>();
  const gW = gridW();
  const gH = gridH();
  for (const c of state.snake.body) occupied.add(c.y * gW + c.x);
  for (const f of state.foods) occupied.add(f.y * gW + f.x);

  if (occupied.size >= gW * gH) return null;

  let x = 0, y = 0;
  let safety = 200;
  while (safety-- > 0) {
    x = randInt(0, gW - 1);
    y = randInt(0, gH - 1);
    if (!occupied.has(y * gW + x) && !snakeOccupiesCell(state, x, y)) break;
  }
  if (safety <= 0) return null;

  const kind = pickKind(cfg);
  const ttl = isPowerup(kind) ? cfg.ttlPowerup : 0;
  const item: FoodItem = {
    x, y, kind,
    hue: kind === 'rainbow' ? 0 : kindHue(kind),
    bornTick: state.tick,
    ttl,
  };
  state.foods.push(item);
  return item;
}

export function tickFoods(state: GameState): void {
  for (let i = state.foods.length - 1; i >= 0; i--) {
    const f = state.foods[i]!;
    if (f.ttl > 0 && state.tick - f.bornTick > f.ttl) {
      state.foods.splice(i, 1);
    }
  }
}

export function isPowerup(kind: FoodKind): boolean {
  return kind === 'rainbow' || kind === 'fire' || kind === 'ice' || kind === 'magnet';
}

function pickKind(cfg: SpawnConfig): FoodKind {
  if (isPerfectEmbed()) return 'apple';
  if (rand() < cfg.powerupBaseChance) {
    const ps: FoodKind[] = ['rainbow', 'fire', 'ice', 'magnet'];
    return ps[Math.floor(rand() * ps.length)]!;
  }
  if (rand() < cfg.rareTypeChance) {
    return rand() < 0.5 ? 'cherry' : 'star';
  }
  return 'apple';
}

function kindHue(kind: FoodKind): number {
  switch (kind) {
    case 'apple':   return isPerfectEmbed() ? 48 : 145;
    case 'cherry':  return 350;
    case 'star':    return 50;    // yellow
    case 'fire':    return 18;
    case 'ice':     return 195;
    case 'magnet':  return 280;
    case 'rainbow': return 0;
  }
}
