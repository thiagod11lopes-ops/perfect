// Editor do cluster dissonante — montado quando track 'cluster' selecionada.
//
// Cluster é o "stab" dissonante de tier 2 (sabor Igorrr/Primus). Configura:
//   - Em quais tiers dispara
//   - Posição no compasso
//   - Probabilidade de disparar
//   - Conjunto de intervalos do acorde (semitons relativos à raiz)
//   - Voz: wave, ADSR, gain, filtro

import { play, midiToFreq, type Waveform } from '../../audio/synth';
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

export function buildClusterEditor(host: HTMLElement): void {
  host.classList.add('editor-host');
  host.innerHTML = '';
  const cfg = getEditedConfig();
  const cl = cfg.cluster;

  // Header + audicionar
  const header = document.createElement('div');
  header.className = 'editor-header';
  header.innerHTML = `
    <h2>CLUSTER DISSONANTE</h2>
    <span class="editor-subtitle">stab harmônico — só dispara em tiers selecionados</span>
  `;
  host.appendChild(header);

  const scroll = document.createElement('div');
  scroll.className = 'globals-scroll';
  host.appendChild(scroll);

  scroll.appendChild(makeButton({
    label: '▶ Audicionar cluster',
    onClick: () => auditionCluster(),
  }));

  // ─── Tiers em que dispara ────────────────────────────────────────────────
  const tiersSec = makeSection('TIERS ATIVOS');
  const tierTogs = document.createElement('div');
  tierTogs.className = 'tier-toggles';
  for (let t = 0; t < 3; t++) {
    const tier = t;
    const btn = document.createElement('button');
    btn.className = 'tier-toggle';
    if (cl.enabledTiers.includes(t)) btn.classList.add('is-active');
    btn.textContent = `Tier ${t}`;
    btn.addEventListener('click', () => {
      const set = new Set(cl.enabledTiers);
      if (set.has(tier)) set.delete(tier); else set.add(tier);
      cl.enabledTiers = [...set].sort((a, b) => a - b);
      reemitEditedConfig();
      btn.classList.toggle('is-active');
    });
    tierTogs.appendChild(btn);
  }
  tiersSec.appendChild(tierTogs);
  scroll.appendChild(tiersSec);

  // ─── Disparo ─────────────────────────────────────────────────────────────
  const fireSec = makeSection('DISPARO');
  fireSec.appendChild(makeNumberInput({
    label: 'Posição', value: cl.position, min: 0, max: 31, step: 1,
    suffix: '8th',
    onChange: (v) => { cl.position = v; reemitEditedConfig(); },
  }));
  fireSec.appendChild(makeSlider({
    label: 'Chance', value: cl.chance, min: 0, max: 1, step: 0.01,
    format: (v) => `${(v * 100).toFixed(0)}%`,
    onChange: (v) => { cl.chance = v; reemitEditedConfig(); },
  }));
  fireSec.appendChild(makeSlider({
    label: 'Offset', value: cl.baseOffset, min: -36, max: 36, step: 1,
    format: (v) => `${v > 0 ? '+' : ''}${v} st`,
    onChange: (v) => { cl.baseOffset = v; reemitEditedConfig(); },
  }));
  scroll.appendChild(fireSec);

  // ─── Intervalos do acorde ────────────────────────────────────────────────
  const intervalsSec = makeSection('INTERVALOS DO ACORDE');
  const hint = document.createElement('div');
  hint.className = 'globals-hint';
  hint.textContent = 'semitons relativos à raiz + offset acima. ex: [0, 6, 13] = raiz + trítono + 9ª menor.';
  intervalsSec.appendChild(hint);

  const list = document.createElement('div');
  list.className = 'cluster-intervals';

  function renderIntervals(): void {
    list.innerHTML = '';
    cl.intervals.forEach((semi, idx) => {
      const row = document.createElement('div');
      row.className = 'cluster-interval-row';
      row.innerHTML = `
        <span class="cluster-interval-label">${idx + 1}</span>
        <input type="number" min="-24" max="36" step="1" value="${semi}">
        <button class="cluster-interval-rm" title="remover">×</button>
      `;
      const input = row.querySelector<HTMLInputElement>('input')!;
      const rm = row.querySelector<HTMLButtonElement>('.cluster-interval-rm')!;
      input.addEventListener('change', () => {
        cl.intervals[idx] = Number(input.value) | 0;
        reemitEditedConfig();
      });
      rm.addEventListener('click', () => {
        cl.intervals.splice(idx, 1);
        reemitEditedConfig();
        renderIntervals();
      });
      list.appendChild(row);
    });
  }
  renderIntervals();
  intervalsSec.appendChild(list);

  const addBtn = document.createElement('button');
  addBtn.className = 'prop-button prop-button-ghost';
  addBtn.textContent = '+ Adicionar intervalo';
  addBtn.addEventListener('click', () => {
    cl.intervals.push(0);
    reemitEditedConfig();
    renderIntervals();
  });
  intervalsSec.appendChild(addBtn);
  scroll.appendChild(intervalsSec);

  // ─── Voz (wave + ADSR + gain + filtro) ───────────────────────────────────
  const voiceSec = makeSection('VOZ');
  voiceSec.appendChild(makeDropdown({
    label: 'Wave', value: cl.wave, options: WAVEFORMS,
    onChange: (w) => { cl.wave = w as Waveform; reemitEditedConfig(); },
  }));
  voiceSec.appendChild(makeSlider({
    label: 'Gain', value: cl.gain, min: 0, max: 0.5, step: 0.005,
    format: (v) => v.toFixed(3),
    onChange: (v) => { cl.gain = v; reemitEditedConfig(); },
  }));
  scroll.appendChild(voiceSec);

  const adsrSec = makeSection('ADSR');
  adsrSec.appendChild(makeSlider({
    label: 'A', value: cl.adsr.a, min: 0, max: 0.5, step: 0.001,
    format: (v) => `${(v * 1000).toFixed(0)} ms`,
    onChange: (v) => { cl.adsr.a = v; reemitEditedConfig(); },
  }));
  adsrSec.appendChild(makeSlider({
    label: 'D', value: cl.adsr.d, min: 0, max: 1, step: 0.005,
    format: (v) => `${(v * 1000).toFixed(0)} ms`,
    onChange: (v) => { cl.adsr.d = v; reemitEditedConfig(); },
  }));
  adsrSec.appendChild(makeSlider({
    label: 'S', value: cl.adsr.s, min: 0, max: 1, step: 0.01,
    format: (v) => v.toFixed(2),
    onChange: (v) => { cl.adsr.s = v; reemitEditedConfig(); },
  }));
  adsrSec.appendChild(makeSlider({
    label: 'R', value: cl.adsr.r, min: 0, max: 2, step: 0.005,
    format: (v) => `${(v * 1000).toFixed(0)} ms`,
    onChange: (v) => { cl.adsr.r = v; reemitEditedConfig(); },
  }));
  scroll.appendChild(adsrSec);

  const filterSec = makeSection('FILTRO');
  filterSec.appendChild(makeDropdown({
    label: 'Tipo', value: cl.filter, options: FILTER_TYPES,
    onChange: (t) => { cl.filter = t as 'low' | 'high' | 'band'; reemitEditedConfig(); },
  }));
  filterSec.appendChild(makeSlider({
    label: 'Cutoff', value: cl.cutoff, min: 50, max: 8000, step: 50,
    format: (v) => `${v.toFixed(0)} Hz`,
    onChange: (v) => { cl.cutoff = v; reemitEditedConfig(); },
  }));
  filterSec.appendChild(makeSlider({
    label: 'Q', value: cl.q, min: 0.1, max: 30, step: 0.1,
    format: (v) => v.toFixed(1),
    onChange: (v) => { cl.q = v; reemitEditedConfig(); },
  }));
  scroll.appendChild(filterSec);
}

function auditionCluster(): void {
  const cfg = getEditedConfig();
  const cl = cfg.cluster;
  for (const interval of cl.intervals) {
    play({
      wave: cl.wave,
      freq: midiToFreq(cfg.rootMidi + cl.baseOffset + interval),
      adsr: cl.adsr,
      gain: cl.gain,
      filter: cl.filter,
      cutoff: cl.cutoff,
      q: cl.q,
    });
  }
}
