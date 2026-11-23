// Estado central do Audio Lab — em memória.
//
// Dois pedaços mutáveis principais:
//   1) editedConfig    — o MusicConfig que o usuário está editando.
//   2) previewInputs   — score/combo/power-ups simulados para o preview ao vivo.
//
// Padrão de notificação estilo "store" minimalista: subscribe(fn) registra
// um listener; qualquer mutação chama todos os listeners. Sem framework, sem
// reatividade automática — cada painel decide o que re-renderizar.

import {
  DEFAULT_MUSIC_CONFIG,
  getMusicConfig,
  type MusicConfig,
} from '../audio/musicConfig';

// ─── Listeners ─────────────────────────────────────────────────────────────

type Listener = () => void;
const listeners = new Set<Listener>();

/** Registra um listener que dispara em qualquer mutação. Retorna função de cleanup. */
export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

function notify(): void {
  for (const fn of listeners) {
    try { fn(); } catch (err) { console.error('[lab/state] listener falhou:', err); }
  }
}

// ─── Config sendo editado ──────────────────────────────────────────────────

// Clone profundo do config carregado (override salvo, ou default factory).
// CRÍTICO: as actions mutam _editedConfig in-place. Sem o clone, estaríamos
// mutando o objeto DEFAULT_MUSIC_CONFIG / o módulo importado — corrompendo
// o "factory reset" e o boot do jogo.
let _editedConfig: MusicConfig = structuredClone(getMusicConfig());

export function getEditedConfig(): MusicConfig {
  return _editedConfig;
}

/** Restaura o config de fábrica (DEFAULT hardcoded) — clone, nunca a referência. */
export function resetEditedToFactory(): void {
  _editedConfig = structuredClone(DEFAULT_MUSIC_CONFIG);
  notify();
}

export function setEditedConfig(cfg: MusicConfig): void {
  _editedConfig = cfg;
  notify();
}

// ─── Inputs do preview ─────────────────────────────────────────────────────

export interface PreviewInputs {
  score: number;
  combo: number;
  fire: boolean;
  ice: boolean;
  magnet: boolean;
}

const _previewInputs: PreviewInputs = {
  score: 0,
  combo: 0,
  fire: false,
  ice: false,
  magnet: false,
};

export function getPreviewInputs(): Readonly<PreviewInputs> {
  return _previewInputs;
}

export function updatePreviewInputs(patch: Partial<PreviewInputs>): void {
  Object.assign(_previewInputs, patch);
  notify();
}

// ─── Track seleção ─────────────────────────────────────────────────────────
// Identifica qual "faixa" do motor está sendo editada no painel central.
// Cada track corresponde a um pedaço do MusicConfig que tem um editor
// dedicado (step-grid, piano-roll, ou knobs em passos futuros).

export type TrackId =
  | 'bass.tier0' | 'bass.tier1' | 'bass.tier2'
  | 'kick.tier0' | 'kick.tier1' | 'kick.tier2'
  | 'snare.tier0' | 'snare.tier1' | 'snare.tier2'
  | 'magnet.melody'
  // Reservados para próximos passos:
  | 'hat.tier0' | 'hat.tier1' | 'hat.tier2'
  | 'cluster' | 'fireTexture' | 'iceTexture'
  | 'globals' | 'melody.knobs';

let _selectedTrack: TrackId = 'bass.tier2';

export function getSelectedTrack(): TrackId {
  return _selectedTrack;
}

export function setSelectedTrack(t: TrackId): void {
  if (_selectedTrack === t) return;
  _selectedTrack = t;
  notify();
}

// ─── Mutação genérica + notify ─────────────────────────────────────────────
// Helpers expostos para `actions.ts` mutar partes do MusicConfig in-place
// e disparar notify (subscribers recebem). Sem deep clone — o motor lê
// fresh a cada tick, então consistência é preservada por construção.

/** Re-emite o config atual para forçar resync de subscribers e do motor. */
export function reemitEditedConfig(): void {
  notify();
}
