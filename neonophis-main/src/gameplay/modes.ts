// Game modes — §14.

import type { GameState } from '../engine/state';
import { spawnFood } from './food';
import { rand } from '../engine/rng';
import { t } from '../i18n';

export type ModeId = 'classic' | 'chaos' | 'timeattack' | 'relax';

export interface ModeConfig {
  id: ModeId;
  initialMaxFoods: number;
  powerupBaseChance: number;
  rareTypeChance: number;
  ttlPowerup: number;
  baseMoveIntervalTicks: number;
  // Speed-up curve: returns moveIntervalTicks given applesEaten.
  moveIntervalForApples(apples: number): number;
  shouldEndOnCollision: boolean;
  hasTimer: boolean;
  applesPerSpeedup: number;
  chaosEvents: boolean;
}

export const MODES: Record<ModeId, ModeConfig> = {
  classic: {
    id: 'classic',
    initialMaxFoods: 1,
    powerupBaseChance: 0.10,
    rareTypeChance: 0.10,
    ttlPowerup: 600,
    baseMoveIntervalTicks: 8,
    moveIntervalForApples(a) {
      return Math.max(2, 8 - Math.floor(a / 5));
    },
    shouldEndOnCollision: true,
    hasTimer: false,
    applesPerSpeedup: 5,
    chaosEvents: false,
  },
  chaos: {
    id: 'chaos',
    initialMaxFoods: 2,
    powerupBaseChance: 0.30,
    rareTypeChance: 0.20,
    ttlPowerup: 700,
    baseMoveIntervalTicks: 7,
    moveIntervalForApples(a) {
      return Math.max(2, 7 - Math.floor(a / 6));
    },
    shouldEndOnCollision: true,
    hasTimer: false,
    applesPerSpeedup: 6,
    chaosEvents: true,
  },
  timeattack: {
    id: 'timeattack',
    initialMaxFoods: 3,
    powerupBaseChance: 0.20,
    rareTypeChance: 0.15,
    ttlPowerup: 480,
    baseMoveIntervalTicks: 6,
    moveIntervalForApples(a) {
      return Math.max(3, 6 - Math.floor(a / 8));
    },
    shouldEndOnCollision: false,
    hasTimer: true,
    applesPerSpeedup: 8,
    chaosEvents: false,
  },
  relax: {
    id: 'relax',
    initialMaxFoods: 4,
    powerupBaseChance: 0.25,
    rareTypeChance: 0.25,
    ttlPowerup: 900,
    baseMoveIntervalTicks: 10,
    moveIntervalForApples() { return 10; },
    shouldEndOnCollision: false,
    hasTimer: false,
    applesPerSpeedup: 999,
    chaosEvents: false,
  },
};

// Mode display strings are resolved through i18n at call time (the active
// language can change at runtime), so they are not stored on ModeConfig.
export function modeLabel(id: ModeId): string {
  return t(`mode.${id}.label`);
}

export function modeBlurb(id: ModeId): string {
  return t(`mode.${id}.blurb`);
}

export interface ChaosEvent {
  id: string;
  /** i18n key — resolve with chaosLabel() / t() at display time. */
  labelKey: string;
  apply(state: GameState): void;
}

export function chaosLabel(ev: ChaosEvent): string {
  return t(ev.labelKey);
}

const CHAOS_EVENTS: ChaosEvent[] = [
  {
    id: 'food-storm', labelKey: 'chaos.foodStorm',
    apply(s) {
      for (let i = 0; i < 6; i++) {
        spawnFood(s, { powerupBaseChance: 0.4, rareTypeChance: 0.2, ttlPowerup: 400 });
      }
    },
  },
  {
    id: 'speed-burst', labelKey: 'chaos.speedBurst',
    apply(s) {
      s.moveIntervalTicks = Math.max(2, s.moveIntervalTicks - 2);
    },
  },
  {
    id: 'slow-mo', labelKey: 'chaos.slowMo',
    apply(s) {
      s.moveIntervalTicks = Math.min(20, s.moveIntervalTicks + 4);
    },
  },
  {
    id: 'powerup-rain', labelKey: 'chaos.powerupRain',
    apply(s) {
      for (let i = 0; i < 3; i++) {
        spawnFood(s, { powerupBaseChance: 1, rareTypeChance: 0, ttlPowerup: 500 });
      }
    },
  },
];

export function pickChaosEvent(): ChaosEvent {
  return CHAOS_EVENTS[Math.floor(rand() * CHAOS_EVENTS.length)]!;
}
