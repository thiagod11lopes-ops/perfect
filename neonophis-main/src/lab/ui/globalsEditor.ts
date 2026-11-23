// Editor de Globais — montado no painel central quando track 'globals' é
// selecionada.
//
// Expõe TODAS as constantes globais do motor procedural que antes viviam
// hardcoded em music.ts:
//   - Tonalidade (rootMidi)
//   - Escala (preset + 12 toggles cromáticos)
//   - Curva de BPM por score (4 pontos)
//   - Bônus de combo no BPM
//   - Modificadores de power-up no BPM
//   - Curva de intensidade
//   - Thresholds de tier
//   - Comprimento do compasso por tier (4/4 vs 7/8 etc)
//   - Detune microtonal por tier
//
// Mutações vão direto no editedConfig + reemitEditedConfig() — o motor
// atualiza no próximo tick.

import { getEditedConfig, reemitEditedConfig } from '../state';
import {
  makeDropdown,
  makeNumberInput,
  makeSection,
  makeSlider,
} from './controls';

// ─── Presets de escala ─────────────────────────────────────────────────────

interface ScalePreset {
  label: string;
  scale: number[];
}

const SCALE_PRESETS: ReadonlyArray<ScalePreset> = [
  { label: 'pentatônica menor',  scale: [0, 3, 5, 7, 10] },
  { label: 'pentatônica maior',  scale: [0, 2, 4, 7, 9] },
  { label: 'menor natural',      scale: [0, 2, 3, 5, 7, 8, 10] },
  { label: 'maior',              scale: [0, 2, 4, 5, 7, 9, 11] },
  { label: 'dórica',             scale: [0, 2, 3, 5, 7, 9, 10] },
  { label: 'frígia',             scale: [0, 1, 3, 5, 7, 8, 10] },
  { label: 'lídia',              scale: [0, 2, 4, 6, 7, 9, 11] },
  { label: 'mixolídia',          scale: [0, 2, 4, 5, 7, 9, 10] },
  { label: 'blues',              scale: [0, 3, 5, 6, 7, 10] },
  { label: 'hirajoshi',          scale: [0, 2, 3, 7, 8] },
  { label: 'cromática',          scale: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
];

const PERSONALIZADA = 'personalizada';
const SCALE_OPTIONS: ReadonlyArray<string> = [...SCALE_PRESETS.map((p) => p.label), PERSONALIZADA];
const NOTE_LABELS = ['R', '♭2', '2', '♭3', '3', '4', '♯4', '5', '♭6', '6', '♭7', '7'];

function findScalePresetLabel(scale: ReadonlyArray<number>): string {
  const key = [...scale].sort((a, b) => a - b).join(',');
  for (const p of SCALE_PRESETS) {
    if ([...p.scale].sort((a, b) => a - b).join(',') === key) return p.label;
  }
  return PERSONALIZADA;
}

function midiToName(midi: number): string {
  const names = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  const safe = ((midi % 12) + 12) % 12;
  const oct = Math.floor(midi / 12) - 1;
  return `${names[safe]}${oct}`;
}

// ─── Entry point ───────────────────────────────────────────────────────────

export function buildGlobalsEditor(host: HTMLElement): void {
  host.classList.add('editor-host', 'globals-editor');
  host.innerHTML = '';
  host.appendChild(buildHeader());

  const scroll = document.createElement('div');
  scroll.className = 'globals-scroll';
  host.appendChild(scroll);

  scroll.appendChild(buildTonalidadeSection());
  scroll.appendChild(buildEscalaSection());
  scroll.appendChild(buildBpmCurveSection());
  scroll.appendChild(buildBpmModsSection());
  scroll.appendChild(buildIntensitySection());
  scroll.appendChild(buildTierSection());
  scroll.appendChild(buildBarLengthSection());
  scroll.appendChild(buildDetuneSection());
}

// ─── Header ────────────────────────────────────────────────────────────────

function buildHeader(): HTMLElement {
  const h = document.createElement('div');
  h.className = 'editor-header';
  h.innerHTML = `
    <h2>GLOBAIS · MOTOR PROCEDURAL</h2>
    <span class="editor-subtitle">curvas, escala, thresholds, compasso</span>
  `;
  return h;
}

// ─── Tonalidade (root MIDI) ────────────────────────────────────────────────

function buildTonalidadeSection(): HTMLElement {
  const cfg = getEditedConfig();
  const sec = makeSection('TONALIDADE');
  sec.appendChild(makeSlider({
    label: 'Root MIDI',
    value: cfg.rootMidi,
    min: 24, max: 72, step: 1,
    format: (v) => `${midiToName(v)} (${v})`,
    onChange: (v) => { cfg.rootMidi = v; reemitEditedConfig(); },
  }));
  return sec;
}

// ─── Escala (preset + 12 toggles cromáticos) ───────────────────────────────

function buildEscalaSection(): HTMLElement {
  const cfg = getEditedConfig();
  const sec = makeSection('ESCALA');

  // Preset dropdown
  const presetEl = makeDropdown({
    label: 'Preset',
    value: findScalePresetLabel(cfg.scale),
    options: SCALE_OPTIONS,
    onChange: (label) => {
      const preset = SCALE_PRESETS.find((p) => p.label === label);
      if (!preset) return; // 'personalizada' é só visual — não troca nada
      cfg.scale = [...preset.scale];
      reemitEditedConfig();
      // Refresh os toggles visuais (reconstrói a seção inteira).
      const newSec = buildEscalaSection();
      sec.replaceWith(newSec);
    },
  });
  sec.appendChild(presetEl);

  // 12 toggles cromáticos
  const toggles = document.createElement('div');
  toggles.className = 'scale-toggles';
  const inScale = new Set(cfg.scale);
  for (let i = 0; i < 12; i++) {
    const btn = document.createElement('button');
    btn.className = 'scale-toggle';
    btn.dataset.semitone = String(i);
    if (inScale.has(i)) btn.classList.add('is-active');
    btn.innerHTML = `
      <span class="scale-toggle-num">${i}</span>
      <span class="scale-toggle-name">${NOTE_LABELS[i]}</span>
    `;
    btn.addEventListener('click', () => {
      const set = new Set(cfg.scale);
      if (set.has(i)) set.delete(i);
      else set.add(i);
      cfg.scale = [...set].sort((a, b) => a - b);
      reemitEditedConfig();
      // Refresh: reconstrói a seção inteira (preset + toggles).
      const newSec = buildEscalaSection();
      sec.replaceWith(newSec);
    });
    toggles.appendChild(btn);
  }
  sec.appendChild(toggles);

  return sec;
}

// ─── Curva de BPM por score ────────────────────────────────────────────────

function buildBpmCurveSection(): HTMLElement {
  const cfg = getEditedConfig();
  const sec = makeSection('CURVA DE BPM POR SCORE');

  // Mostra hint de como a tabela funciona
  const hint = document.createElement('div');
  hint.className = 'globals-hint';
  hint.textContent = 'BPM passa para o valor quando score atinge cada threshold.';
  sec.appendChild(hint);

  // Cada step é par (score, bpm). Mutamos diretamente os elementos.
  cfg.bpm.scoreSteps.forEach((step, idx) => {
    const row = document.createElement('div');
    row.className = 'globals-pair';
    row.innerHTML = `
      <span class="globals-pair-label">Step ${idx + 1}</span>
    `;
    row.appendChild(makeNumberInput({
      label: 'Score', value: step.score, min: 0, max: 9999, step: 1,
      onChange: (v) => { step.score = v; reemitEditedConfig(); },
    }));
    row.appendChild(makeNumberInput({
      label: 'BPM', value: step.bpm, min: 30, max: 300, step: 1,
      suffix: 'bpm',
      onChange: (v) => { step.bpm = v; reemitEditedConfig(); },
    }));
    sec.appendChild(row);
  });

  return sec;
}

// ─── Modificadores de BPM (combo + power-ups + min) ────────────────────────

function buildBpmModsSection(): HTMLElement {
  const cfg = getEditedConfig();
  const sec = makeSection('BÔNUS DE BPM');

  // Combo bonuses (cada um: combo threshold + addBpm)
  cfg.bpm.comboBonus.forEach((b, idx) => {
    const row = document.createElement('div');
    row.className = 'globals-pair';
    row.innerHTML = `<span class="globals-pair-label">Combo ${idx + 1}</span>`;
    row.appendChild(makeNumberInput({
      label: 'Combo ≥', value: b.combo, min: 0, max: 100, step: 1,
      onChange: (v) => { b.combo = v; reemitEditedConfig(); },
    }));
    row.appendChild(makeNumberInput({
      label: '+BPM', value: b.addBpm, min: -50, max: 100, step: 1,
      suffix: 'bpm',
      onChange: (v) => { b.addBpm = v; reemitEditedConfig(); },
    }));
    sec.appendChild(row);
  });

  // Power-up + min
  sec.appendChild(makeSlider({
    label: '🔥 Fire',
    value: cfg.bpm.fireBpm, min: -50, max: 50, step: 1,
    format: (v) => `${v > 0 ? '+' : ''}${v} bpm`,
    onChange: (v) => { cfg.bpm.fireBpm = v; reemitEditedConfig(); },
  }));
  sec.appendChild(makeSlider({
    label: '❄️ Ice',
    value: cfg.bpm.iceBpm, min: -50, max: 50, step: 1,
    format: (v) => `${v > 0 ? '+' : ''}${v} bpm`,
    onChange: (v) => { cfg.bpm.iceBpm = v; reemitEditedConfig(); },
  }));
  sec.appendChild(makeSlider({
    label: 'Min BPM',
    value: cfg.bpm.minBpm, min: 30, max: 200, step: 1,
    format: (v) => `${v} bpm`,
    onChange: (v) => { cfg.bpm.minBpm = v; reemitEditedConfig(); },
  }));

  return sec;
}

// ─── Curva de intensidade ──────────────────────────────────────────────────

function buildIntensitySection(): HTMLElement {
  const cfg = getEditedConfig();
  const sec = makeSection('INTENSIDADE');

  const hint = document.createElement('div');
  hint.className = 'globals-hint';
  hint.textContent = 'intensidade = clamp(score / divisor + bônus, 0..1).';
  sec.appendChild(hint);

  sec.appendChild(makeNumberInput({
    label: 'Divisor',
    value: cfg.intensity.scoreDivisor, min: 50, max: 5000, step: 10,
    onChange: (v) => { cfg.intensity.scoreDivisor = v; reemitEditedConfig(); },
  }));

  cfg.intensity.comboBonus.forEach((b, idx) => {
    const row = document.createElement('div');
    row.className = 'globals-pair';
    row.innerHTML = `<span class="globals-pair-label">Combo ${idx + 1}</span>`;
    row.appendChild(makeNumberInput({
      label: 'Combo ≥', value: b.combo, min: 0, max: 100, step: 1,
      onChange: (v) => { b.combo = v; reemitEditedConfig(); },
    }));
    row.appendChild(makeSlider({
      label: '+Int', value: b.add, min: 0, max: 1, step: 0.01,
      format: (v) => v.toFixed(2),
      onChange: (v) => { b.add = v; reemitEditedConfig(); },
    }));
    sec.appendChild(row);
  });

  sec.appendChild(makeSlider({
    label: '🔥 Fire',
    value: cfg.intensity.fireAdd, min: -1, max: 1, step: 0.01,
    format: (v) => `${v > 0 ? '+' : ''}${v.toFixed(2)}`,
    onChange: (v) => { cfg.intensity.fireAdd = v; reemitEditedConfig(); },
  }));
  sec.appendChild(makeSlider({
    label: '❄️ Ice',
    value: cfg.intensity.iceAdd, min: -1, max: 1, step: 0.01,
    format: (v) => `${v > 0 ? '+' : ''}${v.toFixed(2)}`,
    onChange: (v) => { cfg.intensity.iceAdd = v; reemitEditedConfig(); },
  }));

  return sec;
}

// ─── Tier de combo ─────────────────────────────────────────────────────────

function buildTierSection(): HTMLElement {
  const cfg = getEditedConfig();
  const sec = makeSection('TIER DE COMBO');

  sec.appendChild(makeNumberInput({
    label: 'Tier 1 ≥', value: cfg.tier.tier1, min: 1, max: 100, step: 1,
    suffix: 'combo',
    onChange: (v) => { cfg.tier.tier1 = v; reemitEditedConfig(); },
  }));
  sec.appendChild(makeNumberInput({
    label: 'Tier 2 ≥', value: cfg.tier.tier2, min: 1, max: 100, step: 1,
    suffix: 'combo',
    onChange: (v) => { cfg.tier.tier2 = v; reemitEditedConfig(); },
  }));
  sec.appendChild(makeSlider({
    label: '🔥 Δ',
    value: cfg.tier.fireDelta, min: -2, max: 2, step: 1,
    format: (v) => `${v > 0 ? '+' : ''}${v}`,
    onChange: (v) => { cfg.tier.fireDelta = v; reemitEditedConfig(); },
  }));
  sec.appendChild(makeSlider({
    label: '❄️ Δ',
    value: cfg.tier.iceDelta, min: -2, max: 2, step: 1,
    format: (v) => `${v > 0 ? '+' : ''}${v}`,
    onChange: (v) => { cfg.tier.iceDelta = v; reemitEditedConfig(); },
  }));
  return sec;
}

// ─── Comprimento do compasso por tier ──────────────────────────────────────

function buildBarLengthSection(): HTMLElement {
  const cfg = getEditedConfig();
  const sec = makeSection('COMPASSO (8ths) POR TIER');

  const hint = document.createElement('div');
  hint.className = 'globals-hint';
  hint.textContent = '16 = 4/4 · 14 = 7/8 · 12 = 3/4 etc.';
  sec.appendChild(hint);

  for (let tier = 0 as 0 | 1 | 2; tier < 3; tier = (tier + 1) as 0 | 1 | 2) {
    const t = tier;
    sec.appendChild(makeNumberInput({
      label: `Tier ${t}`,
      value: cfg.barLengthByTier[t], min: 4, max: 32, step: 1,
      suffix: '8ths',
      onChange: (v) => { cfg.barLengthByTier[t] = v; reemitEditedConfig(); },
    }));
  }
  return sec;
}

// ─── Detune microtonal por tier ────────────────────────────────────────────

function buildDetuneSection(): HTMLElement {
  const cfg = getEditedConfig();
  const sec = makeSection('DETUNE MICROTONAL POR TIER');

  const hint = document.createElement('div');
  hint.className = 'globals-hint';
  hint.textContent = 'aleatorização ±N cents nas vozes melódicas. 0 = sem detune.';
  sec.appendChild(hint);

  for (let tier = 0 as 0 | 1 | 2; tier < 3; tier = (tier + 1) as 0 | 1 | 2) {
    const t = tier;
    sec.appendChild(makeSlider({
      label: `Tier ${t}`,
      value: cfg.detuneCentsByTier[t], min: 0, max: 100, step: 1,
      format: (v) => `±${v} c`,
      onChange: (v) => { cfg.detuneCentsByTier[t] = v; reemitEditedConfig(); },
    }));
  }
  return sec;
}
