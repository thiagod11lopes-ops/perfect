// Power-ups — §11. Composable, modular. Each implements onActivate/onTick/onExpire.

import type { GameState } from '../engine/state';
import { emit, EVT } from '../engine/events';
import { gridH, gridW } from '../engine/grid';

export type PowerUpId = 'rainbow' | 'fire' | 'ice' | 'magnet';

export interface PowerUp {
  id: PowerUpId;
  duration: number;             // ms
  onActivate(state: GameState): void;
  onTick(state: GameState, dtMs: number): void;
  onExpire(state: GameState): void;
}

export interface ActivePowerUp {
  id: PowerUpId;
  remainingMs: number;
  totalMs: number;
}

const REGISTRY: Record<PowerUpId, PowerUp> = {
  rainbow: {
    id: 'rainbow', duration: 5000,
    onActivate(s) { s.invincible = true; s.passWalls = true; },
    onTick() { /* noop */ },
    onExpire(s) {
      s.invincible = false;
      // Don't override passWalls if mode allows
      if (s.mode !== 'timeattack' && s.mode !== 'relax') s.passWalls = false;
      emit(EVT.POWERUP_EXPIRE, 'rainbow');
    },
  },
  ice: {
    id: 'ice', duration: 4000,
    onActivate(s) { s.speedMultiplier *= 0.5; },
    onTick() { /* noop */ },
    onExpire(s) {
      s.speedMultiplier /= 0.5;
      emit(EVT.POWERUP_EXPIRE, 'ice');
    },
  },
  fire: {
    id: 'fire', duration: 6000,
    onActivate(s) { s.speedMultiplier *= 1.5; s.scoreMultiplier *= 2; },
    onTick() { /* noop */ },
    onExpire(s) {
      s.speedMultiplier /= 1.5;
      s.scoreMultiplier /= 2;
      emit(EVT.POWERUP_EXPIRE, 'fire');
    },
  },
  magnet: {
    id: 'magnet', duration: 5000,
    onActivate(s) { s.magnetRadius = 4; },
    onTick(s) {
      const head = s.snake.body[0]!;
      for (const f of s.foods) {
        const dx = f.x - head.x;
        const dy = f.y - head.y;
        const dist = Math.abs(dx) + Math.abs(dy);
        if (dist <= s.magnetRadius && dist > 0) {
          // Move 1 step toward head (orthogonal preference)
          if (Math.abs(dx) >= Math.abs(dy)) {
            f.x += dx > 0 ? -1 : 1;
          } else {
            f.y += dy > 0 ? -1 : 1;
          }
          if (f.x < 0) f.x = 0;
          const gW = gridW();
          const gH = gridH();
          if (f.x >= gW) f.x = gW - 1;
          if (f.y < 0) f.y = 0;
          if (f.y >= gH) f.y = gH - 1;
        }
      }
    },
    onExpire(s) {
      s.magnetRadius = 0;
      emit(EVT.POWERUP_EXPIRE, 'magnet');
    },
  },
};

export function activatePowerUp(state: GameState, id: PowerUpId): void {
  const p = REGISTRY[id];
  // If already active, refresh duration; otherwise activate.
  const existing = state.powerups.find(a => a.id === id);
  if (existing) {
    existing.remainingMs = p.duration;
    existing.totalMs = p.duration;
    return;
  }
  p.onActivate(state);
  state.powerups.push({ id, remainingMs: p.duration, totalMs: p.duration });
}

export function tickPowerUps(state: GameState, dtMs: number): void {
  for (let i = state.powerups.length - 1; i >= 0; i--) {
    const a = state.powerups[i]!;
    a.remainingMs -= dtMs;
    REGISTRY[a.id].onTick(state, dtMs);
    if (a.remainingMs <= 0) {
      REGISTRY[a.id].onExpire(state);
      state.powerups.splice(i, 1);
    }
  }
}

export function clearAllPowerUps(state: GameState): void {
  for (let i = state.powerups.length - 1; i >= 0; i--) {
    REGISTRY[state.powerups[i]!.id].onExpire(state);
  }
  state.powerups.length = 0;
}

export function powerUpForFood(kind: string): PowerUpId | null {
  switch (kind) {
    case 'rainbow': return 'rainbow';
    case 'fire':    return 'fire';
    case 'ice':     return 'ice';
    case 'magnet':  return 'magnet';
    default:        return null;
  }
}
