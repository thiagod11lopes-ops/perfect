// Painel de Propriedades (right panel).
//
// Reage ao `selectedTrack` do store. Para tracks com múltiplas vozes
// (snare = noise+body, kick = noise+body, magnet = brass×3 + timpani),
// exibe abas pra escolher qual voz editar. As mudanças mutam o
// `editedConfig` in-place e chamam reemitEditedConfig() — o motor reage no
// próximo tick.
//
// Cada track também tem um botão "Audicionar" que toca a voz uma vez sem
// depender do loop estar rodando — útil pra testar timbre rápido.

import { play, type ADSR, type Waveform } from '../../audio/synth';
import { midiToFreq } from '../../audio/synth';
import {
  getEditedConfig,
  getSelectedTrack,
  reemitEditedConfig,
  subscribe,
} from '../state';
import {
  makeButton,
  makeDropdown,
  makeSection,
  makeSlider,
  makeTabs,
} from './controls';

let host: HTMLElement;

// Aba de voz selecionada por track. Persistido em memória pra preservar
// escolha quando o usuário volta pra mesma track.
const selectedSubVoice = new Map<string, string>();

const WAVEFORMS: ReadonlyArray<Waveform> = ['sine', 'square', 'sawtooth', 'triangle', 'noise', 'pulse'];
const FILTER_TYPES = ['low', 'high', 'band'] as const;

export function mountPropertiesPanel(targetHost: HTMLElement): void {
  host = targetHost;
  host.classList.add('properties-host');
  subscribe(refresh);
  refresh();
}

function refresh(): void {
  const trackId = getSelectedTrack();
  host.innerHTML = '';
  if (trackId.startsWith('bass.')) {
    const tier = parseTier(trackId);
    if (tier !== null) buildBassProps(tier);
    return;
  }
  if (trackId.startsWith('snare.')) {
    const tier = parseTier(trackId);
    if (tier !== null) buildSnareProps(tier);
    return;
  }
  if (trackId.startsWith('kick.')) {
    const tier = parseTier(trackId);
    if (tier !== null) buildKickProps(tier);
    return;
  }
  if (trackId.startsWith('hat.')) {
    const tier = parseTier(trackId);
    if (tier !== null) buildHatProps(tier);
    return;
  }
  if (trackId === 'magnet.melody') {
    buildMagnetProps();
    return;
  }
  if (trackId === 'globals') {
    buildSidePanelMessage('GLOBAIS', 'editor completo no painel central — tonalidade, escala, BPM, intensidade, tier e detune');
    return;
  }
  if (trackId === 'cluster') {
    buildSidePanelMessage('CLUSTER', 'editor completo no painel central — tiers, intervalos do acorde, voz e filtro');
    return;
  }
  if (trackId === 'fireTexture') {
    buildSidePanelMessage('FIRE TEXTURE', 'editor completo no painel central — vozes do drone com adicionar/remover');
    return;
  }
  if (trackId === 'iceTexture') {
    buildSidePanelMessage('ICE TEXTURE', 'editor completo no painel central — vozes do sino com adicionar/remover');
    return;
  }
  if (trackId === 'melody.knobs') {
    buildSidePanelMessage('MELODIA PROCEDURAL', 'editor completo no painel central — probabilidades, voz e ADSR por tier');
    return;
  }
  buildPlaceholderProps(trackId);
}

function buildSidePanelMessage(title: string, subtitle: string): void {
  host.appendChild(buildHeader(title, subtitle));
  const ph = document.createElement('div');
  ph.className = 'prop-placeholder';
  ph.textContent = '↘ veja o centro';
  host.appendChild(ph);
}

function parseTier(id: string): 0 | 1 | 2 | null {
  if (id.endsWith('tier0')) return 0;
  if (id.endsWith('tier1')) return 1;
  if (id.endsWith('tier2')) return 2;
  return null;
}

// ─── Header e helpers visuais ──────────────────────────────────────────────

function buildHeader(title: string, subtitle?: string): HTMLElement {
  const h = document.createElement('div');
  h.className = 'prop-header';
  h.innerHTML = `
    <div class="prop-title">${title}</div>
    ${subtitle ? `<div class="prop-subtitle">${subtitle}</div>` : ''}
  `;
  return h;
}

function buildPlaceholderProps(trackId: string): void {
  host.appendChild(buildHeader('—', `${trackId} sem editor de propriedades ainda`));
  const ph = document.createElement('div');
  ph.className = 'prop-placeholder';
  ph.textContent = 'Vem nos próximos passos.';
  host.appendChild(ph);
}

// ─── BASS ──────────────────────────────────────────────────────────────────

function buildBassProps(tier: 0 | 1 | 2): void {
  const cfg = getEditedConfig();
  const bass = tier === 0 ? cfg.bass.tier0 : tier === 1 ? cfg.bass.tier1 : cfg.bass.tier2;

  host.appendChild(buildHeader(`BAIXO · TIER ${tier}`, `padrão de ${bass.pattern.length} notas`));
  host.appendChild(makeButton({
    label: '▶ Audicionar',
    onClick: () => auditionBass(tier),
  }));

  // Voz principal
  const voice = makeSection('Voz');
  voice.appendChild(makeDropdown({
    label: 'Wave',
    value: bass.wave,
    options: WAVEFORMS,
    onChange: (w) => { bass.wave = w as Waveform; reemitEditedConfig(); },
  }));
  voice.appendChild(makeSlider({
    label: 'Octave',
    value: bass.octaveShift,
    min: -36, max: 36, step: 12,
    format: (v) => `${v > 0 ? '+' : ''}${v} st`,
    onChange: (v) => { bass.octaveShift = v; reemitEditedConfig(); },
  }));
  host.appendChild(voice);

  // ADSR
  host.appendChild(buildAdsrSection(bass.adsr));

  // Gain (base + per-intensity)
  const gain = makeSection('Gain');
  gain.appendChild(makeSlider({
    label: 'Base',
    value: bass.gainBase, min: 0, max: 0.5, step: 0.005,
    format: (v) => v.toFixed(3),
    onChange: (v) => { bass.gainBase = v; reemitEditedConfig(); },
  }));
  gain.appendChild(makeSlider({
    label: '/ Int.',
    value: bass.gainPerIntensity, min: 0, max: 0.3, step: 0.005,
    format: (v) => v.toFixed(3),
    onChange: (v) => { bass.gainPerIntensity = v; reemitEditedConfig(); },
  }));
  host.appendChild(gain);

  // Filtro
  host.appendChild(buildFilterSection({
    type: bass.filter,
    cutoff: bass.cutoffBase,
    cutoffPerIntensity: bass.cutoffPerIntensity,
    q: bass.q,
    onTypeChange: (t) => { bass.filter = t; reemitEditedConfig(); },
    onCutoffChange: (v) => { bass.cutoffBase = v; reemitEditedConfig(); },
    onCutoffPerIntChange: (v) => { bass.cutoffPerIntensity = v; reemitEditedConfig(); },
    onQChange: (v) => { bass.q = v; reemitEditedConfig(); },
  }));
}

// ─── SNARE ─────────────────────────────────────────────────────────────────

function buildSnareProps(tier: 0 | 1 | 2): void {
  const cfg = getEditedConfig();

  host.appendChild(buildHeader(
    `CAIXA · TIER ${tier}`,
    `voz compartilhada entre todos os tiers · ${cfg.snare.positionsByTier[tier].length} hits no padrão`,
  ));
  host.appendChild(makeButton({
    label: '▶ Audicionar',
    onClick: () => auditionSnare(tier),
  }));

  // Tabs: noise / body
  const trackKey = `snare.tier${tier}`;
  const sub = selectedSubVoice.get(trackKey) ?? 'noise';
  host.appendChild(makeTabs({
    tabs: [{ id: 'noise', label: 'Noise' }, { id: 'body', label: 'Body' }],
    selected: sub,
    onSelect: (id) => { selectedSubVoice.set(trackKey, id); refresh(); },
  }));

  if (sub === 'noise') {
    const n = cfg.snare.noise;
    const voice = makeSection('Noise');
    voice.appendChild(makeSlider({
      label: 'Freq', value: n.freq, min: 100, max: 4000, step: 50,
      format: (v) => `${v.toFixed(0)} Hz`,
      onChange: (v) => { n.freq = v; reemitEditedConfig(); },
    }));
    host.appendChild(voice);
    host.appendChild(buildAdsrSection(n.adsr));
    host.appendChild(buildFilterSection({
      type: n.filter, cutoff: n.cutoff, q: n.q,
      onTypeChange: (t) => { n.filter = t; reemitEditedConfig(); },
      onCutoffChange: (v) => { n.cutoff = v; reemitEditedConfig(); },
      onQChange: (v) => { n.q = v; reemitEditedConfig(); },
    }));
  } else {
    const b = cfg.snare.body;
    const voice = makeSection('Body');
    voice.appendChild(makeDropdown({
      label: 'Wave', value: b.wave, options: WAVEFORMS,
      onChange: (w) => { b.wave = w as Waveform; reemitEditedConfig(); },
    }));
    voice.appendChild(makeSlider({
      label: 'Freq', value: b.freq, min: 50, max: 1000, step: 10,
      format: (v) => `${v.toFixed(0)} Hz`,
      onChange: (v) => { b.freq = v; reemitEditedConfig(); },
    }));
    voice.appendChild(makeSlider({
      label: 'Gain ×', value: b.gainFactor, min: 0, max: 2, step: 0.05,
      format: (v) => `${v.toFixed(2)}×`,
      onChange: (v) => { b.gainFactor = v; reemitEditedConfig(); },
    }));
    host.appendChild(voice);
    host.appendChild(buildAdsrSection(b.adsr));
  }

  // Gain por tier
  const tierGain = makeSection(`Gain · Tier ${tier}`);
  tierGain.appendChild(makeSlider({
    label: 'Gain',
    value: cfg.snare.gainByTier[tier]!,
    min: 0, max: 0.5, step: 0.01,
    format: (v) => v.toFixed(2),
    onChange: (v) => {
      const arr = [...cfg.snare.gainByTier] as [number, number, number];
      arr[tier] = v;
      cfg.snare.gainByTier = arr;
      reemitEditedConfig();
    },
  }));
  host.appendChild(tierGain);
}

// ─── KICK ──────────────────────────────────────────────────────────────────

function buildKickProps(tier: 0 | 1 | 2): void {
  const cfg = getEditedConfig();
  const heavy = tier >= cfg.kick.heavyTier;
  const preset = heavy ? cfg.kick.heavy : cfg.kick.light;
  const presetName = heavy ? 'heavy' : 'light';

  host.appendChild(buildHeader(
    `BUMBO · TIER ${tier}`,
    `usa preset "${presetName}" — editar afeta todos os tiers que compartilham`,
  ));
  host.appendChild(makeButton({
    label: '▶ Audicionar',
    onClick: () => auditionKick(tier),
  }));

  const trackKey = `kick.tier${tier}`;
  const sub = selectedSubVoice.get(trackKey) ?? 'noise';
  host.appendChild(makeTabs({
    tabs: [{ id: 'noise', label: 'Noise' }, { id: 'body', label: 'Body' }],
    selected: sub,
    onSelect: (id) => { selectedSubVoice.set(trackKey, id); refresh(); },
  }));

  if (sub === 'noise') {
    const n = preset.noise;
    const voice = makeSection('Noise (transient)');
    voice.appendChild(makeSlider({
      label: 'Freq', value: n.freq, min: 50, max: 1000, step: 10,
      format: (v) => `${v.toFixed(0)} Hz`,
      onChange: (v) => { n.freq = v; reemitEditedConfig(); },
    }));
    host.appendChild(voice);
    host.appendChild(buildAdsrSection(n.adsr));
    const gainSec = makeSection('Gain');
    gainSec.appendChild(makeSlider({
      label: 'Base', value: n.gainBase, min: 0, max: 0.5, step: 0.005,
      format: (v) => v.toFixed(3),
      onChange: (v) => { n.gainBase = v; reemitEditedConfig(); },
    }));
    gainSec.appendChild(makeSlider({
      label: '/ Int.', value: n.gainPerIntensity, min: 0, max: 0.3, step: 0.005,
      format: (v) => v.toFixed(3),
      onChange: (v) => { n.gainPerIntensity = v; reemitEditedConfig(); },
    }));
    host.appendChild(gainSec);
    host.appendChild(buildFilterSection({
      type: n.filter, cutoff: n.cutoff, q: n.q,
      onTypeChange: (t) => { n.filter = t; reemitEditedConfig(); },
      onCutoffChange: (v) => { n.cutoff = v; reemitEditedConfig(); },
      onQChange: (v) => { n.q = v; reemitEditedConfig(); },
    }));
  } else {
    const b = preset.body;
    const voice = makeSection('Body (corpo grave)');
    voice.appendChild(makeDropdown({
      label: 'Wave', value: b.wave, options: WAVEFORMS,
      onChange: (w) => { b.wave = w as Waveform; reemitEditedConfig(); },
    }));
    voice.appendChild(makeSlider({
      label: 'Freq', value: b.freq, min: 30, max: 400, step: 5,
      format: (v) => `${v.toFixed(0)} Hz`,
      onChange: (v) => { b.freq = v; reemitEditedConfig(); },
    }));
    voice.appendChild(makeSlider({
      label: 'Freq end', value: b.freqEnd, min: 20, max: 200, step: 5,
      format: (v) => `${v.toFixed(0)} Hz`,
      onChange: (v) => { b.freqEnd = v; reemitEditedConfig(); },
    }));
    voice.appendChild(makeSlider({
      label: 'Sweep t', value: b.freqTime, min: 0.01, max: 0.5, step: 0.01,
      format: (v) => `${(v * 1000).toFixed(0)} ms`,
      onChange: (v) => { b.freqTime = v; reemitEditedConfig(); },
    }));
    voice.appendChild(makeSlider({
      label: 'Gain', value: b.gain, min: 0, max: 0.5, step: 0.005,
      format: (v) => v.toFixed(3),
      onChange: (v) => { b.gain = v; reemitEditedConfig(); },
    }));
    host.appendChild(voice);
    host.appendChild(buildAdsrSection(b.adsr));
  }
}

// ─── HAT ───────────────────────────────────────────────────────────────────
// Hat tem uma única voz de noise compartilhada por todos os tiers.
// O ritmo (positions) e o gate (intensityMin/gain) ficam no editor central;
// aqui só o timbre do chiado.

function buildHatProps(tier: 0 | 1 | 2): void {
  const cfg = getEditedConfig();
  const n = cfg.hat.noise;

  host.appendChild(buildHeader(
    `CHIMBAL · TIER ${tier}`,
    `voz de noise compartilhada entre todos os tiers · ${cfg.hat.byTier[tier].positions.length} hits`,
  ));
  host.appendChild(makeButton({
    label: '▶ Audicionar',
    onClick: () => auditionHat(tier),
  }));

  const voice = makeSection('Noise');
  voice.appendChild(makeSlider({
    label: 'Freq', value: n.freq, min: 1000, max: 16000, step: 100,
    format: (v) => `${(v / 1000).toFixed(1)}k`,
    onChange: (v) => { n.freq = v; reemitEditedConfig(); },
  }));
  host.appendChild(voice);
  host.appendChild(buildAdsrSection(n.adsr));
  host.appendChild(buildFilterSection({
    type: n.filter, cutoff: n.cutoff, q: n.q,
    onTypeChange: (t) => { n.filter = t; reemitEditedConfig(); },
    onCutoffChange: (v) => { n.cutoff = v; reemitEditedConfig(); },
    onQChange: (v) => { n.q = v; reemitEditedConfig(); },
  }));
}

// ─── MAGNET ────────────────────────────────────────────────────────────────

function buildMagnetProps(): void {
  const cfg = getEditedConfig();

  host.appendChild(buildHeader(`MAGNET · Fanfarra`, `${cfg.magnet.brass.length} brass + timpani + percussão militar`));
  host.appendChild(makeButton({
    label: '▶ Audicionar (1 nota)',
    onClick: () => auditionMagnet(),
  }));

  // Tabs: brass-N e timpani
  const tabs: ReadonlyArray<{ id: string; label: string }> = [
    ...cfg.magnet.brass.map((_, i) => ({ id: `brass${i}`, label: `Brass ${i + 1}` })),
    { id: 'timpani', label: 'Timpani' },
  ];
  const sub = selectedSubVoice.get('magnet.melody') ?? 'brass0';
  host.appendChild(makeTabs({
    tabs,
    selected: sub,
    onSelect: (id) => { selectedSubVoice.set('magnet.melody', id); refresh(); },
  }));

  if (sub.startsWith('brass')) {
    const idx = Number(sub.slice('brass'.length));
    const b = cfg.magnet.brass[idx];
    if (!b) return;
    const voice = makeSection(`Brass ${idx + 1}`);
    voice.appendChild(makeDropdown({
      label: 'Wave', value: b.wave, options: WAVEFORMS,
      onChange: (w) => { b.wave = w as Waveform; reemitEditedConfig(); },
    }));
    voice.appendChild(makeSlider({
      label: 'Intervalo', value: b.intervalSemitones, min: -12, max: 24, step: 1,
      format: (v) => `${v > 0 ? '+' : ''}${v} st`,
      onChange: (v) => { b.intervalSemitones = v; reemitEditedConfig(); },
    }));
    voice.appendChild(makeSlider({
      label: 'Detune', value: b.detune ?? 0, min: -50, max: 50, step: 1,
      format: (v) => `${v} c`,
      onChange: (v) => { b.detune = v; reemitEditedConfig(); },
    }));
    voice.appendChild(makeSlider({
      label: 'Gain', value: b.gain, min: 0, max: 0.5, step: 0.005,
      format: (v) => v.toFixed(3),
      onChange: (v) => { b.gain = v; reemitEditedConfig(); },
    }));
    host.appendChild(voice);
    host.appendChild(buildAdsrSection(b.adsr));
    if (b.filter) {
      host.appendChild(buildFilterSection({
        type: b.filter,
        cutoff: b.cutoff ?? 1000,
        q: b.q ?? 1,
        onTypeChange: (t) => { b.filter = t; reemitEditedConfig(); },
        onCutoffChange: (v) => { b.cutoff = v; reemitEditedConfig(); },
        onQChange: (v) => { b.q = v; reemitEditedConfig(); },
      }));
    }
  } else if (sub === 'timpani') {
    const t = cfg.magnet.timpani;
    const voice = makeSection('Timpani');
    voice.appendChild(makeDropdown({
      label: 'Wave', value: t.wave, options: WAVEFORMS,
      onChange: (w) => { t.wave = w as Waveform; reemitEditedConfig(); },
    }));
    voice.appendChild(makeSlider({
      label: 'Freq', value: t.freq, min: 30, max: 400, step: 5,
      format: (v) => `${v.toFixed(0)} Hz`,
      onChange: (v) => { t.freq = v; reemitEditedConfig(); },
    }));
    voice.appendChild(makeSlider({
      label: 'Freq end', value: t.freqEnd ?? t.freq, min: 20, max: 200, step: 5,
      format: (v) => `${v.toFixed(0)} Hz`,
      onChange: (v) => { t.freqEnd = v; reemitEditedConfig(); },
    }));
    voice.appendChild(makeSlider({
      label: 'Sweep t', value: t.freqTime ?? 0.1, min: 0.01, max: 0.5, step: 0.01,
      format: (v) => `${(v * 1000).toFixed(0)} ms`,
      onChange: (v) => { t.freqTime = v; reemitEditedConfig(); },
    }));
    voice.appendChild(makeSlider({
      label: 'Gain', value: t.gain, min: 0, max: 0.5, step: 0.005,
      format: (v) => v.toFixed(3),
      onChange: (v) => { t.gain = v; reemitEditedConfig(); },
    }));
    host.appendChild(voice);
    host.appendChild(buildAdsrSection(t.adsr));
  }
}

// ─── Seções reutilizáveis ──────────────────────────────────────────────────

function buildAdsrSection(adsr: ADSR): HTMLElement {
  const sec = makeSection('ADSR');
  sec.appendChild(makeSlider({
    label: 'A', value: adsr.a, min: 0, max: 0.5, step: 0.001,
    format: (v) => `${(v * 1000).toFixed(0)} ms`,
    onChange: (v) => { adsr.a = v; reemitEditedConfig(); },
  }));
  sec.appendChild(makeSlider({
    label: 'D', value: adsr.d, min: 0, max: 1, step: 0.005,
    format: (v) => `${(v * 1000).toFixed(0)} ms`,
    onChange: (v) => { adsr.d = v; reemitEditedConfig(); },
  }));
  sec.appendChild(makeSlider({
    label: 'S', value: adsr.s, min: 0, max: 1, step: 0.01,
    format: (v) => v.toFixed(2),
    onChange: (v) => { adsr.s = v; reemitEditedConfig(); },
  }));
  sec.appendChild(makeSlider({
    label: 'R', value: adsr.r, min: 0, max: 2, step: 0.005,
    format: (v) => `${(v * 1000).toFixed(0)} ms`,
    onChange: (v) => { adsr.r = v; reemitEditedConfig(); },
  }));
  return sec;
}

interface FilterSecOpts {
  type: 'low' | 'high' | 'band';
  cutoff: number;
  cutoffPerIntensity?: number;
  q: number;
  onTypeChange: (t: 'low' | 'high' | 'band') => void;
  onCutoffChange: (v: number) => void;
  onCutoffPerIntChange?: (v: number) => void;
  onQChange: (v: number) => void;
}

function buildFilterSection(opts: FilterSecOpts): HTMLElement {
  const sec = makeSection('Filtro');
  sec.appendChild(makeDropdown({
    label: 'Tipo',
    value: opts.type,
    options: FILTER_TYPES,
    onChange: (v) => opts.onTypeChange(v as 'low' | 'high' | 'band'),
  }));
  sec.appendChild(makeSlider({
    label: 'Cutoff', value: opts.cutoff, min: 50, max: 8000, step: 50,
    format: (v) => `${v.toFixed(0)} Hz`,
    onChange: opts.onCutoffChange,
  }));
  if (opts.cutoffPerIntensity !== undefined && opts.onCutoffPerIntChange) {
    sec.appendChild(makeSlider({
      label: '/ Int.', value: opts.cutoffPerIntensity, min: 0, max: 5000, step: 50,
      format: (v) => `${v.toFixed(0)} Hz`,
      onChange: opts.onCutoffPerIntChange,
    }));
  }
  sec.appendChild(makeSlider({
    label: 'Q', value: opts.q, min: 0.1, max: 30, step: 0.1,
    format: (v) => v.toFixed(1),
    onChange: opts.onQChange,
  }));
  return sec;
}

// ─── Audicionar (toca a voz uma vez sem rodar o loop) ──────────────────────
// Reusa o `play()` de synth.ts — exatamente o mesmo caminho que o motor usa.
// Frequências representativas: nota raiz pra vozes melódicas, freq absoluta
// pras vozes percussivas.

function auditionBass(tier: 0 | 1 | 2): void {
  const cfg = getEditedConfig();
  const bass = tier === 0 ? cfg.bass.tier0 : tier === 1 ? cfg.bass.tier1 : cfg.bass.tier2;
  // Toca o primeiro semitom do padrão (geralmente 0 = raiz).
  const note = bass.pattern[0] ?? 0;
  play({
    wave: bass.wave,
    freq: midiToFreq(cfg.rootMidi + bass.octaveShift + note),
    adsr: bass.adsr,
    gain: bass.gainBase + 0.5 * bass.gainPerIntensity,  // intensidade = 0.5 (médio)
    filter: bass.filter,
    cutoff: bass.cutoffBase + 0.5 * bass.cutoffPerIntensity,
    q: bass.q,
  });
}

function auditionSnare(tier: 0 | 1 | 2): void {
  const cfg = getEditedConfig();
  const gain = cfg.snare.gainByTier[tier]!;
  const n = cfg.snare.noise;
  const b = cfg.snare.body;
  if (gain <= 0) {
    // Tier sem gain — toca com volume default pra o usuário ouvir.
    auditionSnareWithGain(0.10);
    return;
  }
  play({
    wave: 'noise', freq: n.freq, adsr: n.adsr,
    gain, filter: n.filter, cutoff: n.cutoff, q: n.q,
  });
  play({
    wave: b.wave, freq: b.freq, adsr: b.adsr,
    gain: gain * b.gainFactor,
  });
}

function auditionSnareWithGain(g: number): void {
  const cfg = getEditedConfig();
  const n = cfg.snare.noise;
  const b = cfg.snare.body;
  play({
    wave: 'noise', freq: n.freq, adsr: n.adsr,
    gain: g, filter: n.filter, cutoff: n.cutoff, q: n.q,
  });
  play({
    wave: b.wave, freq: b.freq, adsr: b.adsr,
    gain: g * b.gainFactor,
  });
}

function auditionHat(tier: 0 | 1 | 2): void {
  const cfg = getEditedConfig();
  const n = cfg.hat.noise;
  const gain = cfg.hat.byTier[tier].gain || 0.05;
  play({
    wave: 'noise', freq: n.freq, adsr: n.adsr,
    gain, filter: n.filter, cutoff: n.cutoff, q: n.q,
  });
}

function auditionKick(tier: 0 | 1 | 2): void {
  const cfg = getEditedConfig();
  const heavy = tier >= cfg.kick.heavyTier;
  const preset = heavy ? cfg.kick.heavy : cfg.kick.light;
  // Intensidade média (0.5) pra audição.
  play({
    wave: 'noise',
    freq: preset.noise.freq,
    adsr: preset.noise.adsr,
    gain: preset.noise.gainBase + 0.5 * preset.noise.gainPerIntensity,
    filter: preset.noise.filter,
    cutoff: preset.noise.cutoff,
    q: preset.noise.q,
  });
  play({
    wave: preset.body.wave,
    freq: preset.body.freq,
    freqEnd: preset.body.freqEnd,
    freqTime: preset.body.freqTime,
    adsr: preset.body.adsr,
    gain: preset.body.gain,
  });
}

function auditionMagnet(): void {
  const cfg = getEditedConfig();
  const semitones = cfg.magnet.melody[0] ?? 0;
  const baseMidi = cfg.rootMidi + cfg.magnet.baseOffset + semitones;
  for (const b of cfg.magnet.brass) {
    play({
      wave: b.wave,
      freq: midiToFreq(baseMidi + b.intervalSemitones),
      detune: b.detune,
      adsr: b.adsr,
      gain: b.gain,
      filter: b.filter,
      cutoff: b.cutoff,
      q: b.q,
    });
  }
  const t = cfg.magnet.timpani;
  play({
    wave: t.wave,
    freq: t.freq,
    freqEnd: t.freqEnd,
    freqTime: t.freqTime,
    adsr: t.adsr,
    gain: t.gain,
  });
}
