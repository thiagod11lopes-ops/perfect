// Combo system — chain of eats; multiplier grows; decays without action.

import type { GameState } from '../engine/state';
import { emit, EVT } from '../engine/events';

export function bumpCombo(state: GameState): void {
  state.combo.count += 1;
  if (state.combo.count > state.combo.best) state.combo.best = state.combo.count;
  if (state.combo.count > state.stats.highestCombo) state.stats.highestCombo = state.combo.count;
  state.combo.multiplier = 1 + Math.floor(state.combo.count / 3);
  state.combo.decayTicks = state.combo.decayMax;
  emit(EVT.COMBO_UP, state.combo.count);
}

export function tickCombo(state: GameState): void {
  if (state.combo.count <= 0) return;
  state.combo.decayTicks -= 1;
  if (state.combo.decayTicks <= 0) resetCombo(state);
}

export function resetCombo(state: GameState): void {
  if (state.combo.count > 0) emit(EVT.COMBO_RESET, state.combo.count);
  state.combo.count = 0;
  state.combo.multiplier = 1;
  state.combo.decayTicks = 0;
}
