// Catálogo de tracks editáveis do Audio Lab.
//
// Esta tabela é a fonte de verdade para:
//   - O que aparece na lista de tracks (left panel)
//   - Qual editor monta no centro quando a track é selecionada
//   - Qual nome / descrição mostrar
//
// Tracks marcadas como `editor: 'placeholder'` são entradas visíveis na UI
// mas com editor desabilitado — serão preenchidas em passos futuros do
// roadmap (props, hat, cluster, fire/ice, globais, melody knobs).

import type { TrackId } from './state';

export type Tier = 0 | 1 | 2;

export type EditorKind =
  | 'step-grid-snare'   // edita snare.positionsByTier[tier]
  | 'step-grid-kick'    // edita kick.byTier[tier].positions + knobs
  | 'step-grid-hat'     // edita hat.byTier[tier].positions + knobs
  | 'piano-roll-bass'   // edita bass.tierN.pattern
  | 'piano-roll-magnet' // edita magnet.melody
  | 'cluster'           // edita cluster.intervals, position, chance, etc
  | 'fire-texture'      // edita fireTexture (drone)
  | 'ice-texture'       // edita iceTexture (sino)
  | 'melody-knobs'      // edita melody.byTier[*] (probabilidades, wave, ADSR)
  | 'globals'           // edita rootMidi, scale, BPM curve, thresholds…
  | 'placeholder';      // reserva

export interface TrackDef {
  id: TrackId;
  /** Rótulo curto exibido na lista. */
  label: string;
  /** Tag opcional ao lado (ex: "calmo", "frenético"). */
  tag?: string;
  /** Tipo de editor a montar no centro. */
  editor: EditorKind;
  /** Para tracks por-tier, qual tier (0/1/2). */
  tier?: Tier;
}

export interface TrackGroup {
  title: string;
  tracks: TrackDef[];
}

export const TRACK_GROUPS: ReadonlyArray<TrackGroup> = [
  {
    title: 'BAIXO',
    tracks: [
      { id: 'bass.tier0', label: 'Tier 0',  tag: 'calmo',     editor: 'piano-roll-bass', tier: 0 },
      { id: 'bass.tier1', label: 'Tier 1',  tag: 'tensão',    editor: 'piano-roll-bass', tier: 1 },
      { id: 'bass.tier2', label: 'Tier 2',  tag: 'frenético', editor: 'piano-roll-bass', tier: 2 },
    ],
  },
  {
    title: 'BUMBO',
    tracks: [
      { id: 'kick.tier0', label: 'Tier 0', tag: 'gated',  editor: 'step-grid-kick', tier: 0 },
      { id: 'kick.tier1', label: 'Tier 1', tag: '4/4',    editor: 'step-grid-kick', tier: 1 },
      { id: 'kick.tier2', label: 'Tier 2', tag: 'blast',  editor: 'step-grid-kick', tier: 2 },
    ],
  },
  {
    title: 'CAIXA',
    tracks: [
      { id: 'snare.tier0', label: 'Tier 0', tag: 'silêncio', editor: 'step-grid-snare', tier: 0 },
      { id: 'snare.tier1', label: 'Tier 1', tag: 'backbeat', editor: 'step-grid-snare', tier: 1 },
      { id: 'snare.tier2', label: 'Tier 2', tag: '7/8',      editor: 'step-grid-snare', tier: 2 },
    ],
  },
  {
    title: 'MAGNET',
    tracks: [
      { id: 'magnet.melody', label: 'Fanfarra', tag: '22 notas', editor: 'piano-roll-magnet' },
    ],
  },
  {
    title: 'CHIMBAL',
    tracks: [
      { id: 'hat.tier0', label: 'Tier 0', tag: 'gated',  editor: 'step-grid-hat', tier: 0 },
      { id: 'hat.tier1', label: 'Tier 1', tag: 'gated',  editor: 'step-grid-hat', tier: 1 },
      { id: 'hat.tier2', label: 'Tier 2', tag: 'double', editor: 'step-grid-hat', tier: 2 },
    ],
  },
  {
    title: 'TEXTURAS',
    tracks: [
      { id: 'cluster',     label: 'Cluster dissonante', tag: 'tier 2', editor: 'cluster' },
      { id: 'fireTexture', label: '🔥 Fire',            tag: 'drone',  editor: 'fire-texture' },
      { id: 'iceTexture',  label: '❄️ Ice',             tag: 'sino',   editor: 'ice-texture' },
    ],
  },
  {
    title: 'MELODIA PROCEDURAL',
    tracks: [
      { id: 'melody.knobs', label: 'Knobs procedurais', tag: 'random', editor: 'melody-knobs' },
    ],
  },
  {
    title: 'MOTOR',
    tracks: [
      { id: 'globals', label: 'Globais', tag: 'BPM · escala · tier', editor: 'globals' },
    ],
  },
];

/** Lookup por id — útil para o editor descobrir o que montar. */
export function findTrack(id: TrackId): TrackDef | undefined {
  for (const group of TRACK_GROUPS) {
    for (const t of group.tracks) {
      if (t.id === id) return t;
    }
  }
  return undefined;
}
