// Editor das texturas Fire e Ice (parametrizado).
//
// Mesma estrutura: posição no compasso (quando dispara) + lista de vozes.
// Cada voz tem `semitones` (offset relativo à raiz) + parâmetros do synth.
// Permite adicionar/remover vozes — útil pra empilhar harmônicos.

import { play, midiToFreq, type Waveform } from '../../audio/synth';
import type { PowerUpTextureConfig, RelativeNoteVoice } from '../../audio/musicConfig';
import { getEditedConfig, reemitEditedConfig } from '../state';
import {
  makeButton,
  makeDropdown,
  makeNumberInput,
  makeSection,
  makeSlider,
} from './controls';

const WAVEFORMS: ReadonlyArray<Waveform> = ['sine', 'square', 'sawtooth', 'triangle', 'noise', 'pulse'];
const FILTER_TYPES: ReadonlyArray<string> = ['low', 'high', 'band'];

export function buildTextureEditor(host: HTMLElement, kind: 'fire' | 'ice'): void {
  host.classList.add('editor-host');
  host.innerHTML = '';

  const cfg = getEditedConfig();
  const tex = kind === 'fire' ? cfg.fireTexture : cfg.iceTexture;
  const labelKind = kind === 'fire' ? '🔥 FIRE' : '❄️ ICE';
  const subtitle = kind === 'fire'
    ? 'drone sub-grave que toca enquanto o power-up fire está ativo'
    : 'sino agudo que toca enquanto o power-up ice está ativo';

  const header = document.createElement('div');
  header.className = 'editor-header';
  header.innerHTML = `<h2>${labelKind} TEXTURE</h2><span class="editor-subtitle">${subtitle}</span>`;
  host.appendChild(header);

  const scroll = document.createElement('div');
  scroll.className = 'globals-scroll';
  host.appendChild(scroll);

  scroll.appendChild(makeButton({
    label: '▶ Audicionar textura',
    onClick: () => auditionTexture(tex),
  }));

  // Posição
  const fireSec = makeSection('DISPARO');
  fireSec.appendChild(makeNumberInput({
    label: 'Posição', value: tex.position, min: 0, max: 31, step: 1,
    suffix: '8th',
    onChange: (v) => { tex.position = v; reemitEditedConfig(); },
  }));
  scroll.appendChild(fireSec);

  // Vozes
  const voicesSec = makeSection('VOZES');
  const hint = document.createElement('div');
  hint.className = 'globals-hint';
  hint.textContent = `${tex.voices.length} voz(es). Cada uma toca em paralelo no disparo.`;
  voicesSec.appendChild(hint);

  const voicesList = document.createElement('div');
  voicesList.className = 'voice-list';

  function renderVoices(): void {
    voicesList.innerHTML = '';
    tex.voices.forEach((v, idx) => {
      voicesList.appendChild(buildVoiceCard(tex, v, idx, () => {
        renderVoices();
        // Atualiza hint após adicionar/remover.
        hint.textContent = `${tex.voices.length} voz(es). Cada uma toca em paralelo no disparo.`;
      }));
    });
  }
  renderVoices();
  voicesSec.appendChild(voicesList);

  const addBtn = document.createElement('button');
  addBtn.className = 'prop-button prop-button-ghost';
  addBtn.textContent = '+ Adicionar voz';
  addBtn.addEventListener('click', () => {
    // Voz default: triangle, ADSR suave, sem filtro.
    const newVoice: RelativeNoteVoice = {
      semitones: 0,
      wave: 'triangle',
      adsr: { a: 0.01, d: 0.20, s: 0.10, r: 0.20 },
      gain: 0.05,
    };
    (tex.voices as RelativeNoteVoice[]).push(newVoice);
    reemitEditedConfig();
    renderVoices();
    hint.textContent = `${tex.voices.length} voz(es). Cada uma toca em paralelo no disparo.`;
  });
  voicesSec.appendChild(addBtn);

  scroll.appendChild(voicesSec);
}

// ─── Card de voz individual ────────────────────────────────────────────────

function buildVoiceCard(
  tex: PowerUpTextureConfig,
  v: RelativeNoteVoice,
  idx: number,
  onChanged: () => void,
): HTMLElement {
  const card = document.createElement('div');
  card.className = 'voice-card';
  const head = document.createElement('div');
  head.className = 'voice-card-head';
  head.innerHTML = `<span>Voz ${idx + 1}</span>`;
  const rmBtn = document.createElement('button');
  rmBtn.className = 'voice-card-rm';
  rmBtn.textContent = '×';
  rmBtn.title = 'remover voz';
  rmBtn.addEventListener('click', () => {
    (tex.voices as RelativeNoteVoice[]).splice(idx, 1);
    reemitEditedConfig();
    onChanged();
  });
  head.appendChild(rmBtn);
  card.appendChild(head);

  card.appendChild(makeSlider({
    label: 'Semi', value: v.semitones, min: -36, max: 36, step: 1,
    format: (val) => `${val > 0 ? '+' : ''}${val} st`,
    onChange: (val) => { v.semitones = val; reemitEditedConfig(); },
  }));
  card.appendChild(makeDropdown({
    label: 'Wave', value: v.wave, options: WAVEFORMS,
    onChange: (w) => { v.wave = w as Waveform; reemitEditedConfig(); },
  }));
  card.appendChild(makeSlider({
    label: 'Gain', value: v.gain, min: 0, max: 0.5, step: 0.005,
    format: (val) => val.toFixed(3),
    onChange: (val) => { v.gain = val; reemitEditedConfig(); },
  }));
  card.appendChild(makeSlider({
    label: 'A', value: v.adsr.a, min: 0, max: 0.5, step: 0.001,
    format: (val) => `${(val * 1000).toFixed(0)} ms`,
    onChange: (val) => { v.adsr.a = val; reemitEditedConfig(); },
  }));
  card.appendChild(makeSlider({
    label: 'D', value: v.adsr.d, min: 0, max: 1.5, step: 0.005,
    format: (val) => `${(val * 1000).toFixed(0)} ms`,
    onChange: (val) => { v.adsr.d = val; reemitEditedConfig(); },
  }));
  card.appendChild(makeSlider({
    label: 'S', value: v.adsr.s, min: 0, max: 1, step: 0.01,
    format: (val) => val.toFixed(2),
    onChange: (val) => { v.adsr.s = val; reemitEditedConfig(); },
  }));
  card.appendChild(makeSlider({
    label: 'R', value: v.adsr.r, min: 0, max: 2, step: 0.005,
    format: (val) => `${(val * 1000).toFixed(0)} ms`,
    onChange: (val) => { v.adsr.r = val; reemitEditedConfig(); },
  }));

  // Filtro opcional — checkbox pra ligar/desligar a presença do campo.
  const filterRow = document.createElement('div');
  filterRow.className = 'voice-filter-toggle';
  filterRow.innerHTML = `
    <label>
      <input type="checkbox" ${v.filter ? 'checked' : ''}>
      <span>Filtro ativo</span>
    </label>
  `;
  const filterCheck = filterRow.querySelector<HTMLInputElement>('input')!;
  card.appendChild(filterRow);

  const filterSubsection = document.createElement('div');
  filterSubsection.className = 'voice-filter-sub';

  function renderFilter(): void {
    filterSubsection.innerHTML = '';
    if (!v.filter) return;
    filterSubsection.appendChild(makeDropdown({
      label: 'Tipo', value: v.filter, options: FILTER_TYPES,
      onChange: (t) => { v.filter = t as 'low' | 'high' | 'band'; reemitEditedConfig(); },
    }));
    filterSubsection.appendChild(makeSlider({
      label: 'Cutoff', value: v.cutoff ?? 1000, min: 50, max: 8000, step: 50,
      format: (val) => `${val.toFixed(0)} Hz`,
      onChange: (val) => { v.cutoff = val; reemitEditedConfig(); },
    }));
    filterSubsection.appendChild(makeSlider({
      label: 'Q', value: v.q ?? 1, min: 0.1, max: 30, step: 0.1,
      format: (val) => val.toFixed(1),
      onChange: (val) => { v.q = val; reemitEditedConfig(); },
    }));
  }
  renderFilter();
  card.appendChild(filterSubsection);

  filterCheck.addEventListener('change', () => {
    if (filterCheck.checked) {
      v.filter = v.filter ?? 'low';
      v.cutoff = v.cutoff ?? 1000;
      v.q = v.q ?? 1;
    } else {
      delete v.filter;
      delete v.cutoff;
      delete v.q;
    }
    reemitEditedConfig();
    renderFilter();
  });

  return card;
}

// ─── Audicionar (toca todas as vozes da textura uma vez) ───────────────────

function auditionTexture(tex: PowerUpTextureConfig): void {
  const cfg = getEditedConfig();
  for (const v of tex.voices) {
    play({
      wave: v.wave,
      freq: midiToFreq(cfg.rootMidi + v.semitones),
      adsr: v.adsr,
      gain: v.gain,
      detune: v.detune,
      filter: v.filter,
      cutoff: v.cutoff,
      q: v.q,
    });
  }
}
