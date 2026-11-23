// Editor central — escuta `selectedTrack` e monta o componente certo.
//
// Cada vez que a track muda, destruímos o conteúdo anterior e montamos um
// novo editor (step-grid, piano-roll, ou placeholder). Cada editor se
// inscreve no store para refletir mudanças no editedConfig — assim as
// edições do USUÁRIO (via UI) e externas (futuras: import JSON, undo, etc.)
// mantêm a UI sincronizada.

import {
  resizeBassPattern,
  resizeMagnetMelody,
  setBassEvery,
  setBassNoteAt,
  setHatGain,
  setHatIntensityMin,
  setKickAlwaysActive,
  setKickIntensityThreshold,
  setMagnetMelodyAt,
  toggleHatPosition,
  toggleKickPosition,
  toggleSnarePosition,
} from '../actions';
import {
  getEditedConfig,
  getSelectedTrack,
  subscribe,
} from '../state';
import { findTrack, type EditorKind, type Tier } from '../tracks';
import { buildClusterEditor } from './clusterEditor';
import { buildGlobalsEditor } from './globalsEditor';
import { buildMelodyEditor } from './melodyEditor';
import { buildTextureEditor } from './textureEditor';
import { createPianoRoll, type PianoRollHandle } from './pianoRoll';
import { createStepGrid, type StepGridHandle } from './stepGrid';

let host: HTMLElement;
let currentEditorKind: EditorKind | null = null;
let currentTier: Tier | null = null;

// Handles do componente atual — usados para atualização incremental quando
// o config muda (sem rebuilding total).
let stepGridHandle: StepGridHandle | null = null;
let pianoRollHandle: PianoRollHandle | null = null;

export function mountEditor(targetHost: HTMLElement): void {
  host = targetHost;
  host.classList.add('editor-host');

  subscribe(syncEditor);
  syncEditor();
}

function syncEditor(): void {
  const trackId = getSelectedTrack();
  const def = findTrack(trackId);
  if (!def) {
    renderEmpty(`track desconhecida: ${trackId}`);
    return;
  }

  const tier = (def.tier ?? null) as Tier | null;

  // Se mudou de track / tipo de editor, refaz o DOM. Senão, só atualiza
  // o estado interno do componente vivo.
  const editorChanged = currentEditorKind !== def.editor || currentTier !== tier;

  if (editorChanged) {
    currentEditorKind = def.editor;
    currentTier = tier;
    host.innerHTML = '';
    stepGridHandle = null;
    pianoRollHandle = null;
    buildEditor(def.editor, def.label, tier);
  } else {
    refreshLiveEditor(def.editor, tier);
  }
}

// ─── Construção dos editores ───────────────────────────────────────────────

function buildEditor(kind: EditorKind, label: string, tier: Tier | null): void {
  const cfg = getEditedConfig();

  switch (kind) {
    case 'step-grid-snare': {
      if (tier == null) return;
      const positions = cfg.snare.positionsByTier[tier];
      const barLen = cfg.barLengthByTier[tier];
      buildStepGridLayout({
        title: `CAIXA · ${label}`,
        subtitle: `${barLen} 8ths · compasso ${tier === 2 ? '7/8' : '4/4'}`,
        barLen,
        positions,
        onToggle: (pos) => toggleSnarePosition(tier, pos),
        knobs: null,
      });
      break;
    }
    case 'step-grid-kick': {
      if (tier == null) return;
      const ktier = cfg.kick.byTier[tier];
      const barLen = cfg.barLengthByTier[tier];
      buildStepGridLayout({
        title: `BUMBO · ${label}`,
        subtitle: `${barLen} 8ths · compasso ${tier === 2 ? '7/8' : '4/4'}`,
        barLen,
        positions: ktier.positions,
        onToggle: (pos) => toggleKickPosition(tier, pos),
        knobs: () => buildKickKnobs(tier),
      });
      break;
    }
    case 'step-grid-hat': {
      if (tier == null) return;
      const htier = cfg.hat.byTier[tier];
      const barLen = cfg.barLengthByTier[tier];
      buildStepGridLayout({
        title: `CHIMBAL · ${label}`,
        subtitle: `${barLen} 8ths · compasso ${tier === 2 ? '7/8' : '4/4'}`,
        barLen,
        positions: htier.positions,
        onToggle: (pos) => toggleHatPosition(tier, pos),
        knobs: () => buildHatKnobs(tier),
      });
      break;
    }
    case 'piano-roll-bass': {
      if (tier == null) return;
      const bass = tier === 0 ? cfg.bass.tier0 : tier === 1 ? cfg.bass.tier1 : cfg.bass.tier2;
      buildPianoRollLayout({
        title: `BAIXO · ${label}`,
        subtitle: `${bass.pattern.length} notas · ${bass.wave}`,
        pattern: bass.pattern,
        pitchMin: -24,
        pitchMax: 24,
        onSetNote: (i, pitch) => setBassNoteAt(tier, i, pitch),
        knobs: () => buildBassKnobs(tier),
      });
      break;
    }
    case 'piano-roll-magnet': {
      const melody = cfg.magnet.melody;
      buildPianoRollLayout({
        title: `MAGNET · Fanfarra Militar`,
        subtitle: `${melody.length} notas · brass triplo + percussão militar`,
        pattern: melody,
        pitchMin: -12,
        pitchMax: 24,
        onSetNote: (i, pitch) => setMagnetMelodyAt(i, pitch),
        knobs: () => buildMagnetKnobs(),
      });
      break;
    }
    case 'globals': {
      buildGlobalsEditor(host);
      break;
    }
    case 'cluster': {
      buildClusterEditor(host);
      break;
    }
    case 'fire-texture': {
      buildTextureEditor(host, 'fire');
      break;
    }
    case 'ice-texture': {
      buildTextureEditor(host, 'ice');
      break;
    }
    case 'melody-knobs': {
      buildMelodyEditor(host);
      break;
    }
    case 'placeholder': {
      renderEmpty(`Editor de "${label}" virá nos próximos passos do roadmap.`);
      break;
    }
  }
}

// ─── Layouts comuns ────────────────────────────────────────────────────────

interface StepGridLayoutOpts {
  title: string;
  subtitle: string;
  barLen: number;
  positions: ReadonlyArray<number>;
  onToggle: (position: number) => void;
  knobs: (() => HTMLElement) | null;
}

function buildStepGridLayout(opts: StepGridLayoutOpts): void {
  const wrap = document.createElement('div');
  wrap.className = 'editor-wrap';

  wrap.appendChild(buildEditorHeader(opts.title, opts.subtitle));

  const gridSection = document.createElement('div');
  gridSection.className = 'editor-section';
  const grid = createStepGrid(opts.positions, opts.barLen, opts.onToggle);
  stepGridHandle = grid;
  gridSection.appendChild(grid.el);
  wrap.appendChild(gridSection);

  if (opts.knobs) {
    const knobsSection = document.createElement('div');
    knobsSection.className = 'editor-section editor-knobs';
    knobsSection.appendChild(opts.knobs());
    wrap.appendChild(knobsSection);
  }

  host.appendChild(wrap);
}

interface PianoRollLayoutOpts {
  title: string;
  subtitle: string;
  pattern: ReadonlyArray<number>;
  pitchMin: number;
  pitchMax: number;
  onSetNote: (index: number, semitones: number) => void;
  knobs: (() => HTMLElement) | null;
}

function buildPianoRollLayout(opts: PianoRollLayoutOpts): void {
  const wrap = document.createElement('div');
  wrap.className = 'editor-wrap';

  wrap.appendChild(buildEditorHeader(opts.title, opts.subtitle));

  const rollSection = document.createElement('div');
  rollSection.className = 'editor-section editor-piano-section';
  const roll = createPianoRoll(opts.pattern, {
    pitchMin: opts.pitchMin,
    pitchMax: opts.pitchMax,
    onSetNote: opts.onSetNote,
  });
  pianoRollHandle = roll;
  rollSection.appendChild(roll.el);
  wrap.appendChild(rollSection);

  if (opts.knobs) {
    const knobsSection = document.createElement('div');
    knobsSection.className = 'editor-section editor-knobs';
    knobsSection.appendChild(opts.knobs());
    wrap.appendChild(knobsSection);
  }

  host.appendChild(wrap);
}

function buildEditorHeader(title: string, subtitle: string): HTMLElement {
  const h = document.createElement('div');
  h.className = 'editor-header';
  h.innerHTML = `
    <h2>${title}</h2>
    <span class="editor-subtitle">${subtitle}</span>
  `;
  return h;
}

function renderEmpty(msg: string): void {
  currentEditorKind = 'placeholder';
  currentTier = null;
  stepGridHandle = null;
  pianoRollHandle = null;
  host.innerHTML = `
    <div class="editor-placeholder">
      <div class="editor-placeholder-icon">🚧</div>
      <div>${msg}</div>
    </div>
  `;
}

// ─── Knobs auxiliares ──────────────────────────────────────────────────────

function buildKickKnobs(tier: Tier): HTMLElement {
  const cfg = getEditedConfig();
  const k = cfg.kick.byTier[tier];
  const wrap = document.createElement('div');
  wrap.className = 'knobs-grid';
  wrap.innerHTML = `
    <label class="knob-row knob-toggle">
      <input type="checkbox" data-role="always" ${k.alwaysActive ? 'checked' : ''}>
      <span>Sempre ativo</span>
    </label>
    <label class="knob-row">
      <span>Threshold de intensidade</span>
      <input type="range" min="0" max="1" step="0.05" value="${k.intensityThreshold}" data-role="thr">
      <span class="knob-value" data-role="thr-val">${k.intensityThreshold.toFixed(2)}</span>
    </label>
  `;
  const always = wrap.querySelector<HTMLInputElement>('[data-role="always"]')!;
  const thr = wrap.querySelector<HTMLInputElement>('[data-role="thr"]')!;
  const thrVal = wrap.querySelector<HTMLElement>('[data-role="thr-val"]')!;
  always.addEventListener('change', () => setKickAlwaysActive(tier, always.checked));
  thr.addEventListener('input', () => {
    const v = Number(thr.value);
    thrVal.textContent = v.toFixed(2);
    setKickIntensityThreshold(tier, v);
  });
  return wrap;
}

function buildHatKnobs(tier: Tier): HTMLElement {
  const cfg = getEditedConfig();
  const h = cfg.hat.byTier[tier];
  const wrap = document.createElement('div');
  wrap.className = 'knobs-grid';
  wrap.innerHTML = `
    <label class="knob-row">
      <span>Threshold de intensidade (0 = sem gate)</span>
      <input type="range" min="0" max="1" step="0.05" value="${h.intensityMin}" data-role="thr">
      <span class="knob-value" data-role="thr-val">${h.intensityMin.toFixed(2)}</span>
    </label>
    <label class="knob-row">
      <span>Gain</span>
      <input type="range" min="0" max="0.3" step="0.005" value="${h.gain}" data-role="gain">
      <span class="knob-value" data-role="gain-val">${h.gain.toFixed(3)}</span>
    </label>
  `;
  const thr = wrap.querySelector<HTMLInputElement>('[data-role="thr"]')!;
  const thrVal = wrap.querySelector<HTMLElement>('[data-role="thr-val"]')!;
  const gain = wrap.querySelector<HTMLInputElement>('[data-role="gain"]')!;
  const gainVal = wrap.querySelector<HTMLElement>('[data-role="gain-val"]')!;
  thr.addEventListener('input', () => {
    const v = Number(thr.value);
    thrVal.textContent = v.toFixed(2);
    setHatIntensityMin(tier, v);
  });
  gain.addEventListener('input', () => {
    const v = Number(gain.value);
    gainVal.textContent = v.toFixed(3);
    setHatGain(tier, v);
  });
  return wrap;
}

function buildBassKnobs(tier: Tier): HTMLElement {
  const cfg = getEditedConfig();
  const bass = tier === 0 ? cfg.bass.tier0 : tier === 1 ? cfg.bass.tier1 : cfg.bass.tier2;
  const wrap = document.createElement('div');
  wrap.className = 'knobs-grid';
  wrap.innerHTML = `
    <label class="knob-row">
      <span>Comprimento do padrão</span>
      <input type="number" min="1" max="32" value="${bass.pattern.length}" data-role="len">
    </label>
    <label class="knob-row">
      <span>Toca a cada (8ths)</span>
      <input type="number" min="1" max="16" value="${bass.every}" data-role="every">
    </label>
  `;
  const len = wrap.querySelector<HTMLInputElement>('[data-role="len"]')!;
  const every = wrap.querySelector<HTMLInputElement>('[data-role="every"]')!;
  len.addEventListener('change', () => resizeBassPattern(tier, Number(len.value)));
  every.addEventListener('change', () => setBassEvery(tier, Number(every.value)));
  return wrap;
}

function buildMagnetKnobs(): HTMLElement {
  const cfg = getEditedConfig();
  const wrap = document.createElement('div');
  wrap.className = 'knobs-grid';
  wrap.innerHTML = `
    <label class="knob-row">
      <span>Comprimento da fanfarra</span>
      <input type="number" min="1" max="64" value="${cfg.magnet.melody.length}" data-role="mlen">
    </label>
    <div class="knob-row knob-info">
      <span>Toca uma nota a cada ${cfg.magnet.every} 8ths (semínima)</span>
    </div>
  `;
  const mlen = wrap.querySelector<HTMLInputElement>('[data-role="mlen"]')!;
  mlen.addEventListener('change', () => resizeMagnetMelody(Number(mlen.value)));
  return wrap;
}

// ─── Refresh incremental quando o config muda ──────────────────────────────
// Chamado pelos subscribes quando a track NÃO mudou — só atualiza o
// componente vivo com os novos dados (evita rebuild caro).

function refreshLiveEditor(kind: EditorKind, tier: Tier | null): void {
  const cfg = getEditedConfig();
  switch (kind) {
    case 'step-grid-snare':
      if (tier != null && stepGridHandle) {
        stepGridHandle.setPositions(cfg.snare.positionsByTier[tier], cfg.barLengthByTier[tier]);
      }
      break;
    case 'step-grid-kick':
      if (tier != null && stepGridHandle) {
        stepGridHandle.setPositions(cfg.kick.byTier[tier].positions, cfg.barLengthByTier[tier]);
      }
      break;
    case 'step-grid-hat':
      if (tier != null && stepGridHandle) {
        stepGridHandle.setPositions(cfg.hat.byTier[tier].positions, cfg.barLengthByTier[tier]);
      }
      break;
    case 'piano-roll-bass':
      if (tier != null && pianoRollHandle) {
        const bass = tier === 0 ? cfg.bass.tier0 : tier === 1 ? cfg.bass.tier1 : cfg.bass.tier2;
        pianoRollHandle.setPattern(bass.pattern);
      }
      break;
    case 'piano-roll-magnet':
      if (pianoRollHandle) pianoRollHandle.setPattern(cfg.magnet.melody);
      break;
    case 'globals':
    case 'cluster':
    case 'fire-texture':
    case 'ice-texture':
    case 'melody-knobs':
      // Esses editores refletem `value` apenas no mount inicial. Edições
      // do próprio painel atualizam a UI via input handlers diretos
      // (.prop-value muda inline). Para edits EXTERNAS (undo, import JSON),
      // seria necessário rebuild — por ora fica como está, e o passo 10
      // resolve com auto-save / persistência.
      break;
    case 'placeholder':
      break;
  }
}
