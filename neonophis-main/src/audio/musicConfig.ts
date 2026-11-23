// Schema do motor de música procedural (§9 do CLAUDE.md).
//
// Toda constante / probabilidade / padrão que antes era hardcoded em music.ts
// agora vive aqui como dado puro. O motor lê este config a cada tick — trocar
// o config troca o som imediatamente, sem reset do loop.
//
// Os valores em DEFAULT_MUSIC_CONFIG foram extraídos um-a-um da implementação
// original. Bootar o jogo com o default produz sonoridade BIT-IDÊNTICA à
// versão pré-refator (mesmas notas, mesmos ganhos, mesmas probabilidades).
//
// Editar este config é o que o Audio Lab (dev-only) faz. Em produção, o jogo
// carrega `musicConfig.default.json` (gerado pelo lab) se existir, senão cai
// no DEFAULT_MUSIC_CONFIG embutido.

import type { ADSR, Waveform } from './synth';

// ─── Tipos auxiliares ──────────────────────────────────────────────────────

export type FilterType = 'low' | 'high' | 'band';

/** Voz de drum/textura especificada em Hz fixo (não-melódica). */
export interface FixedFreqVoice {
  wave: Waveform;
  freq: number;
  freqEnd?: number;
  freqTime?: number;
  adsr: ADSR;
  gain: number;
  filter?: FilterType;
  cutoff?: number;
  q?: number;
}

/** Voz melódica especificada em semitons relativos à raiz. */
export interface RelativeNoteVoice {
  /** Offset em semitons aplicado a partir de `rootMidi`. */
  semitones: number;
  wave: Waveform;
  detune?: number;
  adsr: ADSR;
  gain: number;
  filter?: FilterType;
  cutoff?: number;
  q?: number;
}

// ─── Curvas globais ────────────────────────────────────────────────────────

export interface BpmConfig {
  /** Tabela escalonada: BPM passa para `bpm` quando `score >= score`. Ordenar ascendente. */
  scoreSteps: ReadonlyArray<{ score: number; bpm: number }>;
  /** Bônus de BPM aditivos quando o combo cruza thresholds. */
  comboBonus: ReadonlyArray<{ combo: number; addBpm: number }>;
  /** Modificadores de power-up (somam ao BPM final, podem ser negativos). */
  fireBpm: number;
  iceBpm: number;
  /** Piso mínimo de BPM (clamp final). */
  minBpm: number;
}

export interface IntensityConfig {
  /** Intensidade base = clamp(score / scoreDivisor, 0, 1). */
  scoreDivisor: number;
  /** Bônus aditivos por threshold de combo. */
  comboBonus: ReadonlyArray<{ combo: number; add: number }>;
  /** Modificadores de power-up. */
  fireAdd: number;
  iceAdd: number; // negativo para ice
}

export interface TierThresholdsConfig {
  /** Combo mínimo para entrar no tier 1. */
  tier1: number;
  /** Combo mínimo para entrar no tier 2. */
  tier2: number;
  /** Modificadores de tier por power-up (clamp final em 0..2). */
  fireDelta: number;
  iceDelta: number;
}

// ─── Linha de baixo ────────────────────────────────────────────────────────

export interface BassConfig {
  /** Toca quando `inBar % every === 0`. */
  every: number;
  /** Padrão melódico em semitons relativos à raiz. Indexado por `(step / every) % length`. */
  pattern: number[];
  /** Deslocamento de oitava aplicado a cada nota (default -12 = uma oitava abaixo). */
  octaveShift: number;
  wave: Waveform;
  adsr: ADSR;
  /** Ganho final = gainBase + intensity * gainPerIntensity. */
  gainBase: number;
  gainPerIntensity: number;
  filter: FilterType;
  /** Cutoff final = cutoffBase + intensity * cutoffPerIntensity. */
  cutoffBase: number;
  cutoffPerIntensity: number;
  q: number;
}

// ─── Melodia procedural ────────────────────────────────────────────────────

export interface MelodyTierConfig {
  /** Probabilidade nas batidas fortes (step par) = onBeatBase + intensity * onBeatIntensityFactor. */
  onBeatBase: number;
  onBeatIntensityFactor: number;
  /** Probabilidade nas batidas fracas (step ímpar) = offBeatBase + intensity * offBeatIntensityFactor + offBeatBonus. */
  offBeatBase: number;
  offBeatIntensityFactor: number;
  offBeatBonus: number;
  /** Probabilidade de uma nota ficar fora da escala (sabor cromático/dissonante). */
  chromaticChance: number;
  wave: Waveform;
  adsr: ADSR;
  gainBase: number;
  gainPerIntensity: number;
}

export interface MelodyConfig {
  /** Configuração independente por tier. */
  byTier: [MelodyTierConfig, MelodyTierConfig, MelodyTierConfig];
  /** Deslocamento (semitons) da melodia em relação à raiz (default +12 = oitava acima). */
  baseOffset: number;
  /** Probabilidade de a nota ser tocada uma oitava acima. */
  octaveUpChance: number;
  /** Quantos semitons subir quando a "oitava acima" dispara. */
  octaveUpSemitones: number;
}

// ─── Bumbo (kick) ──────────────────────────────────────────────────────────

export interface KickTierConfig {
  /** Posições (em 8ths dentro do compasso) onde o bumbo toca. Vazio = silêncio. */
  positions: number[];
  /** Se true, ignora o threshold de intensidade. */
  alwaysActive: boolean;
  /** Quando alwaysActive=false, exige `intensity > intensityThreshold`. */
  intensityThreshold: number;
}

export interface KickPreset {
  /** Camada de noise (transient/click). */
  noise: {
    freq: number;
    adsr: ADSR;
    /** Ganho final = gainBase + intensity * gainPerIntensity. */
    gainBase: number;
    gainPerIntensity: number;
    filter: FilterType;
    cutoff: number;
    q: number;
  };
  /** Camada de seno com sweep (corpo do bumbo). */
  body: {
    wave: Waveform;
    freq: number;
    freqEnd: number;
    freqTime: number;
    adsr: ADSR;
    gain: number;
  };
}

export interface KickConfig {
  byTier: [KickTierConfig, KickTierConfig, KickTierConfig];
  /** Tiers >= heavyTier usam o preset `heavy`; abaixo, usam `light`. */
  heavyTier: number;
  light: KickPreset;
  heavy: KickPreset;
}

// ─── Caixa (snare) ─────────────────────────────────────────────────────────

export interface SnareConfig {
  /** Posições (em 8ths dentro do compasso) onde a caixa toca, por tier. Vazio = não toca nesse tier. */
  positionsByTier: [number[], number[], number[]];
  /** Ganho da caixa por tier. */
  gainByTier: [number, number, number];
  /** Voz de noise (chiado). */
  noise: {
    freq: number;
    adsr: ADSR;
    filter: FilterType;
    cutoff: number;
    q: number;
  };
  /** Voz de body (corpo). Ganho final = gain * gainFactor relativo ao gain do tier. */
  body: {
    wave: Waveform;
    freq: number;
    adsr: ADSR;
    gainFactor: number;
  };
}

// ─── Chimbal (hi-hat) ──────────────────────────────────────────────────────

export interface HatTierConfig {
  /** Posições (em 8ths dentro do compasso) onde o hat toca. Vazio = silêncio. */
  positions: number[];
  /** Threshold de intensidade — só dispara se intensity > intensityMin. 0 = sem gate. */
  intensityMin: number;
  gain: number;
}

export interface HatConfig {
  byTier: [HatTierConfig, HatTierConfig, HatTierConfig];
  /** Voz compartilhada por todos os tiers (chiado agudo). */
  noise: {
    freq: number;
    adsr: ADSR;
    filter: FilterType;
    cutoff: number;
    q: number;
  };
}

// ─── Acorde dissonante (cluster) ───────────────────────────────────────────

export interface ClusterConfig {
  /** Tiers em que o cluster pode disparar. */
  enabledTiers: number[];
  /** Posição (em 8ths) dentro do compasso. */
  position: number;
  /** Probabilidade de disparar quando elegível. */
  chance: number;
  /** Intervalos do cluster, em semitons relativos à raiz. */
  intervals: number[];
  /** Deslocamento da raiz (default +12). */
  baseOffset: number;
  wave: Waveform;
  adsr: ADSR;
  gain: number;
  filter: FilterType;
  cutoff: number;
  q: number;
}

// ─── Texturas de power-up (fire / ice) ─────────────────────────────────────

export interface PowerUpTextureConfig {
  /** Posição (em 8ths) no compasso onde a textura dispara. */
  position: number;
  /** Vozes a tocar — cada nota é especificada como semitons relativos à raiz. */
  voices: ReadonlyArray<RelativeNoteVoice>;
}

// ─── Magnet (fanfarra militar) ─────────────────────────────────────────────

export interface MagnetBrassVoice {
  /** Intervalo (semitons) acima da nota corrente da melodia. */
  intervalSemitones: number;
  wave: Waveform;
  detune?: number;
  adsr: ADSR;
  gain: number;
  filter?: FilterType;
  cutoff?: number;
  q?: number;
}

export interface MagnetSnareConfig {
  /** Toca quando `inBar % stepMod === 0`. */
  stepMod: number;
  noise: {
    freq: number;
    adsr: ADSR;
    gain: number;
    filter: FilterType;
    cutoff: number;
    q: number;
  };
  body: {
    wave: Waveform;
    freq: number;
    adsr: ADSR;
    gain: number;
  };
}

export interface MagnetCrashConfig {
  /** Posições (em 8ths) onde o prato tem chance de tocar. */
  positions: number[];
  /** Probabilidade de disparar em cada posição elegível. */
  chance: number;
  voice: FixedFreqVoice;
}

export interface MagnetConfig {
  /** Toca uma nota da melodia a cada N steps (default 4 = uma por semínima). */
  every: number;
  /** Melodia da fanfarra em semitons relativos à raiz. */
  melody: number[];
  /** Deslocamento da raiz aplicado a toda a melodia (default +12). */
  baseOffset: number;
  /** Vozes do brass (em unison, com detune para engrossar). */
  brass: ReadonlyArray<MagnetBrassVoice>;
  /** Bumbo / timpani — toca em cada nota da fanfarra. */
  timpani: FixedFreqVoice;
  /** Caixa militar contínua. */
  snare: MagnetSnareConfig;
  /** Pratos crash. */
  crash: MagnetCrashConfig;
}

// ─── Config raiz ───────────────────────────────────────────────────────────

export interface MusicConfig {
  /** Tonalidade base — nota MIDI da raiz da escala (default 48 = C3). */
  rootMidi: number;
  /** Escala em semitons relativos à raiz (default pentatônica menor: [0,3,5,7,10]). */
  scale: number[];
  bpm: BpmConfig;
  intensity: IntensityConfig;
  tier: TierThresholdsConfig;
  /** Comprimento do compasso (em 8ths) por tier. Tier 2 default = 14 (7/8). */
  barLengthByTier: [number, number, number];
  /** Detune microtonal (cents) aplicado em todas as vozes melódicas, por tier. */
  detuneCentsByTier: [number, number, number];
  /** Padrões de baixo independentes por tier. */
  bass: { tier0: BassConfig; tier1: BassConfig; tier2: BassConfig };
  melody: MelodyConfig;
  kick: KickConfig;
  snare: SnareConfig;
  hat: HatConfig;
  cluster: ClusterConfig;
  fireTexture: PowerUpTextureConfig;
  iceTexture: PowerUpTextureConfig;
  magnet: MagnetConfig;
}

// ─── DEFAULTS ──────────────────────────────────────────────────────────────
// Cada valor abaixo veio diretamente da versão anterior de music.ts.
// Mudar aqui muda o som — mas com os defaults intactos, o jogo soa idêntico.

export const DEFAULT_MUSIC_CONFIG: MusicConfig = {
  rootMidi: 48,                      // C3
  scale: [0, 3, 5, 7, 10],           // pentatônica menor

  bpm: {
    scoreSteps: [
      { score: 0,   bpm: 100 },
      { score: 50,  bpm: 120 },
      { score: 150, bpm: 140 },
      { score: 300, bpm: 160 },
    ],
    comboBonus: [
      { combo: 5,  addBpm: 15 },
      { combo: 10, addBpm: 25 },
    ],
    fireBpm: 20,
    iceBpm: -25,
    minBpm: 60,
  },

  intensity: {
    scoreDivisor: 400,
    comboBonus: [
      { combo: 5,  add: 0.20 },
      { combo: 10, add: 0.20 },
    ],
    fireAdd: 0.25,
    iceAdd: -0.30,
  },

  tier: {
    tier1: 5,
    tier2: 10,
    fireDelta: 1,
    iceDelta: -1,
  },

  barLengthByTier: [16, 16, 14],
  detuneCentsByTier: [0, 15, 35],

  bass: {
    // Tier 0 (calmo): mesmas notas do tier 1, sem o bônus de gain/cutoff.
    tier0: {
      every: 4,
      pattern: [0, 0, 7, 5],
      octaveShift: -12,
      wave: 'sawtooth',
      adsr: { a: 0.005, d: 0.18, s: 0.0, r: 0.08 },
      gainBase: 0.10,
      gainPerIntensity: 0.05,
      filter: 'low',
      cutoffBase: 600,
      cutoffPerIntensity: 1200,
      q: 4,
    },
    // Tier 1 (tensão): pattern igual, gain/cutoff levemente acima.
    tier1: {
      every: 4,
      pattern: [0, 0, 7, 5],
      octaveShift: -12,
      wave: 'sawtooth',
      adsr: { a: 0.005, d: 0.18, s: 0.0, r: 0.08 },
      gainBase: 0.14,                // 0.10 + 0.04 bônus original
      gainPerIntensity: 0.05,
      filter: 'low',
      cutoffBase: 1000,              // 600 + 400 bônus original
      cutoffPerIntensity: 1200,
      q: 4,
    },
    // Tier 2 (frenético): pattern denso com saltos de oitava, every=2.
    tier2: {
      every: 2,
      pattern: [0, 12, 7, 0, 5, 12, 0],
      octaveShift: -12,
      wave: 'sawtooth',
      adsr: { a: 0.003, d: 0.12, s: 0, r: 0.05 },
      gainBase: 0.16,
      gainPerIntensity: 0,
      filter: 'low',
      cutoffBase: 1200,
      cutoffPerIntensity: 1500,
      q: 6,
    },
  },

  melody: {
    baseOffset: 12,
    octaveUpChance: 0.30,
    octaveUpSemitones: 12,
    byTier: [
      // Tier 0
      {
        onBeatBase: 0.50,
        onBeatIntensityFactor: 0.40,
        offBeatBase: 0.20,
        offBeatIntensityFactor: 0.30,
        offBeatBonus: 0,
        chromaticChance: 0,
        wave: 'triangle',
        adsr: { a: 0.004, d: 0.16, s: 0.15, r: 0.18 },
        gainBase: 0.08,
        gainPerIntensity: 0.04,
      },
      // Tier 1
      {
        onBeatBase: 0.60,
        onBeatIntensityFactor: 0.40,
        offBeatBase: 0.20,
        offBeatIntensityFactor: 0.30,
        offBeatBonus: 0.15,
        chromaticChance: 0.18,
        wave: 'triangle',
        adsr: { a: 0.004, d: 0.16, s: 0.15, r: 0.18 },
        gainBase: 0.08,
        gainPerIntensity: 0.04,
      },
      // Tier 2
      {
        onBeatBase: 0.55,
        onBeatIntensityFactor: 0.40,
        offBeatBase: 0.20,
        offBeatIntensityFactor: 0.30,
        offBeatBonus: 0.15,
        chromaticChance: 0.30,
        wave: 'square',
        adsr: { a: 0.004, d: 0.16, s: 0.15, r: 0.18 },
        gainBase: 0.08,
        gainPerIntensity: 0.04,
      },
    ],
  },

  kick: {
    byTier: [
      // Tier 0: gated por intensidade, semínimas em compasso 4/4 (16 8ths).
      { positions: [0, 4, 8, 12], alwaysActive: false, intensityThreshold: 0.30 },
      // Tier 1: sempre ativo, mesma cadência que tier 0.
      { positions: [0, 4, 8, 12], alwaysActive: true,  intensityThreshold: 0 },
      // Tier 2: blast-beat — uma batida a cada colcheia em 7/8 (14 8ths).
      { positions: [0, 2, 4, 6, 8, 10, 12], alwaysActive: true, intensityThreshold: 0 },
    ],
    heavyTier: 2,
    light: {
      noise: {
        freq: 100,
        adsr: { a: 0, d: 0.08, s: 0, r: 0.04 },
        gainBase: 0.07,
        gainPerIntensity: 0.05,
        filter: 'low',
        cutoff: 200,
        q: 2,
      },
      body: {
        wave: 'sine',
        freq: 90,
        freqEnd: 40,
        freqTime: 0.08,
        adsr: { a: 0, d: 0.10, s: 0, r: 0.04 },
        gain: 0.10,
      },
    },
    heavy: {
      noise: {
        freq: 100,
        adsr: { a: 0, d: 0.05, s: 0, r: 0.04 },
        gainBase: 0.12,                // 0.07 + 0.05 bônus heavy
        gainPerIntensity: 0.05,
        filter: 'low',
        cutoff: 200,
        q: 2,
      },
      body: {
        wave: 'sine',
        freq: 110,
        freqEnd: 28,
        freqTime: 0.08,
        adsr: { a: 0, d: 0.13, s: 0, r: 0.04 },
        gain: 0.15,
      },
    },
  },

  snare: {
    positionsByTier: [
      [],            // tier 0: silêncio
      [4, 12],       // tier 1: backbeat 2/4 num compasso de 16 8ths
      [2, 6, 10],    // tier 2: inBar % 4 === 2 num compasso de 14 8ths
    ],
    gainByTier: [0, 0.10, 0.13],
    noise: {
      freq: 800,
      adsr: { a: 0, d: 0.07, s: 0, r: 0.04 },
      filter: 'high',
      cutoff: 1200,
      q: 2,
    },
    body: {
      wave: 'triangle',
      freq: 220,
      adsr: { a: 0, d: 0.05, s: 0, r: 0.03 },
      gainFactor: 0.5,
    },
  },

  hat: {
    byTier: [
      // Tiers 0 e 1: chimbal só entra quando intensity > 0.5, em inBar % 4 === 2.
      // Em compasso de 16 8ths (4/4): posições 2, 6, 10, 14.
      { positions: [2, 6, 10, 14], intensityMin: 0.5, gain: 0.04 },
      { positions: [2, 6, 10, 14], intensityMin: 0.5, gain: 0.04 },
      // Tier 2: chimbal em toda colcheia do compasso 7/8 (14 8ths).
      { positions: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], intensityMin: 0, gain: 0.05 },
    ],
    noise: {
      freq: 8000,
      adsr: { a: 0, d: 0.04, s: 0, r: 0.02 },
      filter: 'high',
      cutoff: 6000,
      q: 2,
    },
  },

  cluster: {
    enabledTiers: [2],
    position: 0,
    chance: 0.30,
    intervals: [0, 6, 13],             // raiz + trítono + 9ª menor
    baseOffset: 12,
    wave: 'square',
    adsr: { a: 0.002, d: 0.10, s: 0.10, r: 0.10 },
    gain: 0.07,
    filter: 'band',
    cutoff: 1200,
    q: 4,
  },

  fireTexture: {
    position: 0,
    voices: [
      {
        semitones: -24,                // duas oitavas abaixo da raiz
        wave: 'square',
        adsr: { a: 0.04, d: 0.30, s: 0.20, r: 0.40 },
        gain: 0.06,
        filter: 'low',
        cutoff: 220,
        q: 4,
      },
    ],
  },

  iceTexture: {
    position: 0,
    voices: [
      {
        semitones: 36,                 // três oitavas acima — sino agudo
        wave: 'triangle',
        adsr: { a: 0.005, d: 0.60, s: 0, r: 0.40 },
        gain: 0.06,
      },
      {
        semitones: 43,                 // quinta acima do sino — brilho extra
        wave: 'triangle',
        adsr: { a: 0.005, d: 0.50, s: 0, r: 0.40 },
        gain: 0.04,
      },
    ],
  },

  magnet: {
    every: 4,
    melody: [
      // Frase 1: fanfarra ascendente (SOL SOL SOL SI DO DO DO SI)
       7,  7,  7, 11, 12, 12, 12, 11,
      // Frase 2: pico melódico e descida (LA SI DO RE DO SI LA SOL)
       9, 11, 12, 14, 12, 11,  9,  7,
      // Frase 3: resolução à tônica (SOL SOL SOL SI DO SOL)
       7,  7,  7, 11, 12,  7,
    ],
    baseOffset: 12,
    brass: [
      // Unison engrossado: dois sawtooths com detune ±8 cents.
      {
        intervalSemitones: 0,
        wave: 'sawtooth',
        detune: -8,
        adsr: { a: 0.01, d: 0.12, s: 0.60, r: 0.15 },
        gain: 0.11,
        filter: 'low',
        cutoff: 2000,
        q: 3,
      },
      {
        intervalSemitones: 0,
        wave: 'sawtooth',
        detune: 8,
        adsr: { a: 0.01, d: 0.12, s: 0.60, r: 0.15 },
        gain: 0.11,
        filter: 'low',
        cutoff: 2000,
        q: 3,
      },
      // Quinta acima — brilho de seção de metais.
      {
        intervalSemitones: 7,
        wave: 'sawtooth',
        adsr: { a: 0.01, d: 0.12, s: 0.45, r: 0.13 },
        gain: 0.07,
        filter: 'low',
        cutoff: 1600,
        q: 3,
      },
    ],
    timpani: {
      wave: 'sine',
      freq: 80,
      freqEnd: 40,
      freqTime: 0.12,
      adsr: { a: 0, d: 0.15, s: 0, r: 0.05 },
      gain: 0.14,
    },
    snare: {
      stepMod: 2,
      noise: {
        freq: 1000,
        adsr: { a: 0, d: 0.06, s: 0, r: 0.03 },
        gain: 0.08,
        filter: 'high',
        cutoff: 1400,
        q: 2,
      },
      body: {
        wave: 'triangle',
        freq: 280,
        adsr: { a: 0, d: 0.04, s: 0, r: 0.02 },
        gain: 0.05,
      },
    },
    crash: {
      positions: [0, 8],
      chance: 0.6,
      voice: {
        wave: 'noise',
        freq: 3000,
        adsr: { a: 0.01, d: 0.40, s: 0.15, r: 0.30 },
        gain: 0.06,
        filter: 'high',
        cutoff: 5000,
        q: 1,
      },
    },
  },
};

// ─── Override salvo pelo Audio Lab ─────────────────────────────────────────
// O lab (dev-only) grava src/audio/musicConfig.override.json via endpoint do
// dev-server (ver vite.config.ts → labConfigSaver). Esse arquivo é OPCIONAL:
//
//   - import.meta.glob com padrão de arquivo único não quebra o build se o
//     arquivo não existir — retorna {} nesse caso.
//   - Se existir, é importado estaticamente (eager) e entra normalmente no
//     bundle de produção. É código de jogo (src/audio/), não do lab — então
//     não viola a proteção dev-only.
//
// Resultado: o jogo toca com o config salvo no lab quando ele existe, e cai
// no DEFAULT_MUSIC_CONFIG hardcoded (factory) quando não.

const overrideModules = import.meta.glob<{ default: MusicConfig }>(
  './musicConfig.override.json',
  { eager: true },
);
const savedOverride: MusicConfig | null =
  overrideModules['./musicConfig.override.json']?.default ?? null;

export function hasSavedOverride(): boolean {
  return savedOverride !== null;
}

// ─── Singleton de runtime ──────────────────────────────────────────────────
// O motor lê via getMusicConfig(); o lab e o boot empurram via setMusicConfig().
// Sem reatividade — basta atualizar a referência e o próximo tick já lê o novo.
// Inicializa do override salvo, com fallback no default hardcoded.

let currentConfig: MusicConfig = savedOverride ?? DEFAULT_MUSIC_CONFIG;

export function getMusicConfig(): MusicConfig {
  return currentConfig;
}

export function setMusicConfig(cfg: MusicConfig): void {
  currentConfig = cfg;
}

export function resetMusicConfig(): void {
  currentConfig = DEFAULT_MUSIC_CONFIG;
}

// ─── Funções puras de derivação ────────────────────────────────────────────
// Estes cálculos antes viviam dentro de music.ts lendo estado de módulo.
// Extraídos como funções puras para que o lab possa mostrar predições
// (BPM efetivo, tier, intensidade) sem rodar o motor — e para que music.ts
// e a UI compartilhem exatamente a mesma lógica (DRY).

export function computeBpm(
  cfg: MusicConfig,
  score: number,
  combo: number,
  fire: boolean,
  ice: boolean
): number {
  let bpm = cfg.bpm.scoreSteps[0]?.bpm ?? 100;
  for (const s of cfg.bpm.scoreSteps) {
    if (score >= s.score) bpm = s.bpm;
  }
  for (const b of cfg.bpm.comboBonus) {
    if (combo >= b.combo) bpm += b.addBpm;
  }
  if (fire) bpm += cfg.bpm.fireBpm;
  if (ice) bpm += cfg.bpm.iceBpm;
  return Math.max(cfg.bpm.minBpm, bpm);
}

export function computeIntensity(
  cfg: MusicConfig,
  score: number,
  combo: number,
  fire: boolean,
  ice: boolean
): number {
  let i = Math.min(1, score / cfg.intensity.scoreDivisor);
  for (const b of cfg.intensity.comboBonus) {
    if (combo >= b.combo) i = Math.min(1, i + b.add);
  }
  if (fire) i = Math.min(1, i + cfg.intensity.fireAdd);
  if (ice)  i = Math.max(0, i + cfg.intensity.iceAdd);
  return i;
}

export function computeComboTier(
  cfg: MusicConfig,
  combo: number,
  fire: boolean,
  ice: boolean
): 0 | 1 | 2 {
  let t: 0 | 1 | 2 = 0;
  if (combo >= cfg.tier.tier2)      t = 2;
  else if (combo >= cfg.tier.tier1) t = 1;
  if (fire) t = Math.min(2, t + cfg.tier.fireDelta) as 0 | 1 | 2;
  if (ice)  t = Math.max(0, t + cfg.tier.iceDelta) as 0 | 1 | 2;
  return t;
}
