// Editor da melodia procedural — controla as REGRAS da melodia aleatória.
//
// Diferente das tracks de baixo/fanfarra, a melodia NÃO tem uma sequência de
// notas pra editar. O motor sorteia notas da escala a cada 8th, com
// probabilidades que mudam conforme o tier. Aqui o usuário ajusta essas
// probabilidades (e o som do voice melódico) por tier.
//
// Tabs por tier — usuário vê só um tier de cada vez (3 tabs).

import { play, midiToFreq, type Waveform } from '../../audio/synth';
import type { MelodyTierConfig } from '../../audio/musicConfig';
import { getEditedConfig, reemitEditedConfig } from '../state';
import {
  makeDropdown,
  makeSection,
  makeSlider,
  makeTabs,
  makeButton,
} from './controls';

const WAVEFORMS: ReadonlyArray<Waveform> = ['sine', 'square', 'sawtooth', 'triangle', 'noise', 'pulse'];

let selectedTier: 0 | 1 | 2 = 0;

export function buildMelodyEditor(host: HTMLElement): void {
  host.classList.add('editor-host');
  host.innerHTML = '';

  const cfg = getEditedConfig();

  const header = document.createElement('div');
  header.className = 'editor-header';
  header.innerHTML = `
    <h2>MELODIA PROCEDURAL</h2>
    <span class="editor-subtitle">probabilidades — o motor sorteia notas a cada 8th</span>
  `;
  host.appendChild(header);

  const scroll = document.createElement('div');
  scroll.className = 'globals-scroll';
  host.appendChild(scroll);

  // Audicionar
  scroll.appendChild(makeButton({
    label: '▶ Audicionar nota da escala',
    onClick: () => auditionMelody(),
  }));

  // Globais da melodia
  const globalsSec = makeSection('GLOBAIS DA MELODIA');
  const hint = document.createElement('div');
  hint.className = 'globals-hint';
  hint.textContent = 'aplicam a todos os tiers.';
  globalsSec.appendChild(hint);

  globalsSec.appendChild(makeSlider({
    label: 'Offset', value: cfg.melody.baseOffset, min: -36, max: 36, step: 1,
    format: (v) => `${v > 0 ? '+' : ''}${v} st`,
    onChange: (v) => { cfg.melody.baseOffset = v; reemitEditedConfig(); },
  }));
  globalsSec.appendChild(makeSlider({
    label: 'Oitava+', value: cfg.melody.octaveUpChance, min: 0, max: 1, step: 0.01,
    format: (v) => `${(v * 100).toFixed(0)}%`,
    onChange: (v) => { cfg.melody.octaveUpChance = v; reemitEditedConfig(); },
  }));
  globalsSec.appendChild(makeSlider({
    label: 'Oitava st', value: cfg.melody.octaveUpSemitones, min: 1, max: 24, step: 1,
    format: (v) => `+${v} st`,
    onChange: (v) => { cfg.melody.octaveUpSemitones = v; reemitEditedConfig(); },
  }));
  scroll.appendChild(globalsSec);

  // Tabs por tier
  scroll.appendChild(makeTabs({
    tabs: [
      { id: '0', label: 'Tier 0' },
      { id: '1', label: 'Tier 1' },
      { id: '2', label: 'Tier 2' },
    ],
    selected: String(selectedTier),
    onSelect: (id) => {
      selectedTier = Number(id) as 0 | 1 | 2;
      buildMelodyEditor(host); // rebuild full
    },
  }));

  // Painel do tier selecionado
  const tierPanel = document.createElement('div');
  tierPanel.className = 'melody-tier-panel';
  buildTierPanel(tierPanel, selectedTier);
  scroll.appendChild(tierPanel);
}

function buildTierPanel(host: HTMLElement, tier: 0 | 1 | 2): void {
  const mel = getEditedConfig().melody.byTier[tier];

  // Probabilidades on-beat / off-beat
  const probSec = makeSection(`PROBABILIDADES · TIER ${tier}`);
  const hint = document.createElement('div');
  hint.className = 'globals-hint';
  hint.textContent = 'on-beat = step par · off-beat = step ímpar. Multiplicador escala com a intensidade.';
  probSec.appendChild(hint);

  probSec.appendChild(makeSlider({
    label: 'On base', value: mel.onBeatBase, min: 0, max: 1, step: 0.01,
    format: (v) => `${(v * 100).toFixed(0)}%`,
    onChange: (v) => { mel.onBeatBase = v; reemitEditedConfig(); },
  }));
  probSec.appendChild(makeSlider({
    label: 'On / Int', value: mel.onBeatIntensityFactor, min: 0, max: 2, step: 0.05,
    format: (v) => v.toFixed(2),
    onChange: (v) => { mel.onBeatIntensityFactor = v; reemitEditedConfig(); },
  }));
  probSec.appendChild(makeSlider({
    label: 'Off base', value: mel.offBeatBase, min: 0, max: 1, step: 0.01,
    format: (v) => `${(v * 100).toFixed(0)}%`,
    onChange: (v) => { mel.offBeatBase = v; reemitEditedConfig(); },
  }));
  probSec.appendChild(makeSlider({
    label: 'Off / Int', value: mel.offBeatIntensityFactor, min: 0, max: 2, step: 0.05,
    format: (v) => v.toFixed(2),
    onChange: (v) => { mel.offBeatIntensityFactor = v; reemitEditedConfig(); },
  }));
  probSec.appendChild(makeSlider({
    label: 'Off bonus', value: mel.offBeatBonus, min: 0, max: 1, step: 0.01,
    format: (v) => `${(v * 100).toFixed(0)}%`,
    onChange: (v) => { mel.offBeatBonus = v; reemitEditedConfig(); },
  }));
  probSec.appendChild(makeSlider({
    label: 'Cromática', value: mel.chromaticChance, min: 0, max: 1, step: 0.01,
    format: (v) => `${(v * 100).toFixed(0)}%`,
    onChange: (v) => { mel.chromaticChance = v; reemitEditedConfig(); },
  }));
  host.appendChild(probSec);

  // Voz
  const voiceSec = makeSection(`VOZ · TIER ${tier}`);
  voiceSec.appendChild(makeDropdown({
    label: 'Wave', value: mel.wave, options: WAVEFORMS,
    onChange: (w) => { mel.wave = w as Waveform; reemitEditedConfig(); },
  }));
  voiceSec.appendChild(makeSlider({
    label: 'Gain base', value: mel.gainBase, min: 0, max: 0.5, step: 0.005,
    format: (v) => v.toFixed(3),
    onChange: (v) => { mel.gainBase = v; reemitEditedConfig(); },
  }));
  voiceSec.appendChild(makeSlider({
    label: 'Gain / Int', value: mel.gainPerIntensity, min: 0, max: 0.3, step: 0.005,
    format: (v) => v.toFixed(3),
    onChange: (v) => { mel.gainPerIntensity = v; reemitEditedConfig(); },
  }));
  host.appendChild(voiceSec);

  // ADSR
  const adsrSec = makeSection(`ADSR · TIER ${tier}`);
  adsrSec.appendChild(makeSlider({
    label: 'A', value: mel.adsr.a, min: 0, max: 0.5, step: 0.001,
    format: (v) => `${(v * 1000).toFixed(0)} ms`,
    onChange: (v) => { mel.adsr.a = v; reemitEditedConfig(); },
  }));
  adsrSec.appendChild(makeSlider({
    label: 'D', value: mel.adsr.d, min: 0, max: 1, step: 0.005,
    format: (v) => `${(v * 1000).toFixed(0)} ms`,
    onChange: (v) => { mel.adsr.d = v; reemitEditedConfig(); },
  }));
  adsrSec.appendChild(makeSlider({
    label: 'S', value: mel.adsr.s, min: 0, max: 1, step: 0.01,
    format: (v) => v.toFixed(2),
    onChange: (v) => { mel.adsr.s = v; reemitEditedConfig(); },
  }));
  adsrSec.appendChild(makeSlider({
    label: 'R', value: mel.adsr.r, min: 0, max: 2, step: 0.005,
    format: (v) => `${(v * 1000).toFixed(0)} ms`,
    onChange: (v) => { mel.adsr.r = v; reemitEditedConfig(); },
  }));
  host.appendChild(adsrSec);
}

// ─── Audicionar (toca uma nota aleatória da escala no voice do tier sel.) ──

function auditionMelody(): void {
  const cfg = getEditedConfig();
  const mel: MelodyTierConfig = cfg.melody.byTier[selectedTier];
  const note = cfg.scale[Math.floor(Math.random() * cfg.scale.length)] ?? 0;
  play({
    wave: mel.wave,
    freq: midiToFreq(cfg.rootMidi + cfg.melody.baseOffset + note),
    adsr: mel.adsr,
    gain: mel.gainBase + 0.5 * mel.gainPerIntensity,
  });
}
