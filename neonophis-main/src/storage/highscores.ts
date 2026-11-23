// Hi-scores persistence — server file (highscores.json) with localStorage fallback.

import type { ModeId } from '../gameplay/modes';

export interface HighScoreEntry {
  score: number;
  playerName: string;
  date: number;            // ms since epoch
  modeSeed: number;
  durationS: number;
  applesEaten: number;
}

const KEY_PREFIX = 'neonophis:hi:';
const MAX = 5;
// Dev:    /__api/scores    → middleware do Vite dev-server
// Prod:   __api/scores     → URL relativa ao index.html, ex:
//         adrianofranco.com.br/neonophis/__api/scores
//         Apache faz ProxyPass desse path para o scores-server.js
const SCORES_ENDPOINT = import.meta.env.DEV ? '/__api/scores' : '__api/scores';

type ScoresFile = Record<ModeId, HighScoreEntry[]>;
const MODES_LIST: ModeId[] = ['classic', 'chaos', 'timeattack', 'relax'];

// In-memory cache — populated from server on init, falls back to localStorage.
const cache: ScoresFile = { classic: [], chaos: [], timeattack: [], relax: [] };

function parseFile(raw: unknown): ScoresFile {
  if (!raw || typeof raw !== 'object') return { classic: [], chaos: [], timeattack: [], relax: [] };
  const result: ScoresFile = { classic: [], chaos: [], timeattack: [], relax: [] };
  for (const mode of MODES_LIST) {
    const arr = (raw as Record<string, unknown>)[mode];
    result[mode] = Array.isArray(arr) ? (arr as HighScoreEntry[]).slice(0, MAX) : [];
  }
  return result;
}

function loadFromLocalStorage(): ScoresFile {
  const result: ScoresFile = { classic: [], chaos: [], timeattack: [], relax: [] };
  for (const mode of MODES_LIST) {
    try {
      const raw = localStorage.getItem(KEY_PREFIX + mode);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as HighScoreEntry[];
      if (Array.isArray(parsed)) result[mode] = parsed.slice(0, MAX);
    } catch { /* ignore */ }
  }
  return result;
}

export async function initHighScores(): Promise<void> {
  // Seed cache from localStorage first (sync, immediate)
  const local = loadFromLocalStorage();
  for (const mode of MODES_LIST) cache[mode] = local[mode] ?? [];

  // Then try server endpoint to get the authoritative file
  try {
    const res = await fetch(SCORES_ENDPOINT);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json() as unknown;
    const parsed = parseFile(json);
    for (const mode of MODES_LIST) cache[mode] = parsed[mode] ?? [];
    console.log('[highscores] carregado do servidor ✓');
  } catch (err) {
    console.warn('[highscores] GET falhou (modo offline — usando localStorage):', err);
  }
}

export function getHighScores(mode: ModeId): HighScoreEntry[] {
  return cache[mode] ?? [];
}

export function checkScoreRank(mode: ModeId, score: number): { qualifies: boolean; rank: number } {
  const list = getHighScores(mode);
  if (list.length < MAX) return { qualifies: true, rank: list.length };
  const rank = list.findIndex(e => score > e.score);
  if (rank === -1) return { qualifies: false, rank: MAX };
  return { qualifies: true, rank };
}

export async function saveScore(mode: ModeId, entry: HighScoreEntry): Promise<void> {
  const list = [...getHighScores(mode), entry];
  list.sort((a, b) => b.score - a.score);
  const trimmed = list.slice(0, MAX);

  console.log('[highscores] enviando POST para', SCORES_ENDPOINT, '— entry:', entry.playerName, entry.score);
  try {
    const res = await fetch(SCORES_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, entry }), // Envia apenas a nova entrada
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    // O servidor retorna o estado completo e autoritativo
    const updatedAll = await res.json() as ScoresFile;
    for (const m of MODES_LIST) cache[m] = updatedAll[m] ?? [];
    console.log('[highscores] sincronizado com o servidor ✓');
  } catch (err) {
    console.error('[highscores] POST falhou → localStorage:', err);
    try {
      localStorage.setItem(KEY_PREFIX + mode, JSON.stringify(trimmed));
    } catch { /* ignore */ }
  }
}

// ── Flags & power-up counter (unchanged, still use localStorage) ──────────

const FLAG_KEY = 'neonophis:flags';

export function getFlags(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(FLAG_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    return {};
  }
}

export function setFlag(name: string, value: boolean): void {
  const flags = getFlags();
  flags[name] = value;
  try { localStorage.setItem(FLAG_KEY, JSON.stringify(flags)); } catch { /* ignore */ }
}

export function isFlag(name: string): boolean {
  return !!getFlags()[name];
}

const POWERUP_COUNT_KEY = 'neonophis:powerups:total';

export function bumpPowerupTotal(): number {
  const cur = Number(localStorage.getItem(POWERUP_COUNT_KEY) || '0') + 1;
  try { localStorage.setItem(POWERUP_COUNT_KEY, String(cur)); } catch { /* ignore */ }
  return cur;
}

export function getPowerupTotal(): number {
  return Number(localStorage.getItem(POWERUP_COUNT_KEY) || '0');
}
