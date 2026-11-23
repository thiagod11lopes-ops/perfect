// Mutadores tipados do MusicConfig editado.
//
// Cada ação aqui muta IN-PLACE o `editedConfig` do store e chama
// `reemitEditedConfig()` para acordar os subscribers. O motor de música lê
// `getMusicConfig()` no início de cada tick (a cada ~150ms a 100 BPM), então
// mudanças aparecem audíveis quase imediatamente.
//
// Não fazemos deep-clone porque (a) é desperdício para edições de uma
// célula, (b) o único leitor concorrente é o motor que lê dentro de
// setTimeout (sem race com o evento de UI síncrono), (c) os listeners
// inspecionam os dados imediatamente, sem manter referências antigas.

import type { Tier } from './tracks';
import { getEditedConfig, reemitEditedConfig } from './state';

// ─── Step-grid (snare / kick) ──────────────────────────────────────────────

/** Adiciona ou remove uma posição de drum. Mantém ordenado (visual mais previsível). */
export function toggleSnarePosition(tier: Tier, position: number): void {
  const arr = getEditedConfig().snare.positionsByTier[tier];
  togglePosition(arr, position);
  reemitEditedConfig();
}

export function toggleKickPosition(tier: Tier, position: number): void {
  const arr = getEditedConfig().kick.byTier[tier].positions;
  togglePosition(arr, position);
  reemitEditedConfig();
}

export function toggleHatPosition(tier: Tier, position: number): void {
  const arr = getEditedConfig().hat.byTier[tier].positions;
  togglePosition(arr, position);
  reemitEditedConfig();
}

export function setHatIntensityMin(tier: Tier, value: number): void {
  getEditedConfig().hat.byTier[tier].intensityMin = clamp(value, 0, 1);
  reemitEditedConfig();
}

export function setHatGain(tier: Tier, value: number): void {
  getEditedConfig().hat.byTier[tier].gain = clamp(value, 0, 1);
  reemitEditedConfig();
}

function togglePosition(arr: number[], position: number): void {
  const idx = arr.indexOf(position);
  if (idx >= 0) {
    arr.splice(idx, 1);
  } else {
    arr.push(position);
    arr.sort((a, b) => a - b);
  }
}

// ─── Knobs de drum ─────────────────────────────────────────────────────────

export function setKickAlwaysActive(tier: Tier, value: boolean): void {
  getEditedConfig().kick.byTier[tier].alwaysActive = value;
  reemitEditedConfig();
}

export function setKickIntensityThreshold(tier: Tier, value: number): void {
  getEditedConfig().kick.byTier[tier].intensityThreshold = clamp(value, 0, 1);
  reemitEditedConfig();
}

export function setSnareGain(tier: Tier, value: number): void {
  const arr = [...getEditedConfig().snare.gainByTier] as [number, number, number];
  arr[tier] = clamp(value, 0, 1);
  getEditedConfig().snare.gainByTier = arr;
  reemitEditedConfig();
}

// ─── Piano-roll de baixo ───────────────────────────────────────────────────

/** Define o semitom de uma posição específica do padrão de baixo. */
export function setBassNoteAt(tier: Tier, index: number, semitones: number): void {
  const cfg = getEditedConfig();
  const bass = tier === 0 ? cfg.bass.tier0
              : tier === 1 ? cfg.bass.tier1
                           : cfg.bass.tier2;
  if (index < 0 || index >= bass.pattern.length) return;
  bass.pattern[index] = semitones | 0;
  reemitEditedConfig();
}

/** Redimensiona o padrão. Cresce com 0 (raiz), encurta truncando. */
export function resizeBassPattern(tier: Tier, newLength: number): void {
  const len = clamp(newLength | 0, 1, 32);
  const cfg = getEditedConfig();
  const bass = tier === 0 ? cfg.bass.tier0
              : tier === 1 ? cfg.bass.tier1
                           : cfg.bass.tier2;
  if (len > bass.pattern.length) {
    while (bass.pattern.length < len) bass.pattern.push(0);
  } else if (len < bass.pattern.length) {
    bass.pattern.length = len;
  }
  reemitEditedConfig();
}

/** Muda a cadência: a cada quantos 8ths o baixo dispara. */
export function setBassEvery(tier: Tier, every: number): void {
  const cfg = getEditedConfig();
  const bass = tier === 0 ? cfg.bass.tier0
              : tier === 1 ? cfg.bass.tier1
                           : cfg.bass.tier2;
  bass.every = clamp(every | 0, 1, 16);
  reemitEditedConfig();
}

// ─── Piano-roll da fanfarra (magnet) ──────────────────────────────────────

export function setMagnetMelodyAt(index: number, semitones: number): void {
  const arr = getEditedConfig().magnet.melody;
  if (index < 0 || index >= arr.length) return;
  arr[index] = semitones | 0;
  reemitEditedConfig();
}

export function resizeMagnetMelody(newLength: number): void {
  const arr = getEditedConfig().magnet.melody;
  const len = clamp(newLength | 0, 1, 64);
  if (len > arr.length) {
    while (arr.length < len) arr.push(0);
  } else if (len < arr.length) {
    arr.length = len;
  }
  reemitEditedConfig();
}

// ─── Util ──────────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
