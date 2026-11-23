// Música procedural — §9 do CLAUDE.md.
//
// Estado em múltiplos eixos:
//   * score  → tier base de BPM (calmo → enérgico)
//   * combo  → camada de tier 0/1/2 (bateria, dissonância, mudança de
//              assinatura)
//   * fire   → +BPM, +tier, drone sub-grave no compasso 0
//   * ice    → −BPM, −tier, sino agudo no compasso 0
//   * magnet → suspende a melodia aleatória e toca uma fanfarra militar
//              original (saws empilhados emulando uma seção de metais).
//
// Tier 0 (combo 0–4):  pentatônica de Dó menor, 4/4, bateria esparsa.
// Tier 1 (combo 5–9):  +caixa em backbeat, detune ±15 cents, cromáticos
//                      ocasionais, +15 BPM.
// Tier 2 (combo 10+):  7/8, kick blast-beat, hat double-time,
//                      detune ±35 cents, clusters dissonantes (sabor
//                      Igorrr/Primus), baixo frenético com saltos de oitava,
//                      +25 BPM.
//
// Fire e ice empilham no tier de combo. Combinados, fire+ice se cancelam em
// BPM/tier mas as texturas (drone + sino) tocam juntas — caos esperado em
// modos com power-ups concorrentes.
//
// REFATOR: toda constante saiu daqui e virou DEFAULT_MUSIC_CONFIG em
// musicConfig.ts. O motor lê o config a cada tick; trocar o config muda o
// som no próximo 8th sem resetar o loop. Os defaults preservam a
// sonoridade original 1:1.

import { ensureAudio, getCtx, isMuted, midiToFreq, play } from './synth';
import {
  getMusicConfig,
  computeBpm,
  computeIntensity,
  computeComboTier,
} from './musicConfig';

let timer: number | null = null;
let step = 0;

let curScore = 0;
let curCombo = 0;
let fireOn = false;
let iceOn  = false;
let magnetOn = false;
let magnetIdx = 0;

export interface MusicMod {
  fire?: boolean;
  ice?: boolean;
  magnet?: boolean;
}

export function startMusic(): void {
  ensureAudio();
  if (timer !== null) return;
  scheduleNext();
}

export function stopMusic(): void {
  if (timer !== null) { clearTimeout(timer); timer = null; }
  step = 0;
}

// Starts ambient menu music (score=0, combo=0, no power-ups — tier 0, 100 BPM).
// Safe to call multiple times; no-op if already running.
export function startMenuMusic(): void {
  ensureAudio();
  curScore = 0; curCombo = 0; fireOn = false; iceOn = false; magnetOn = false;
  if (timer !== null) return;
  scheduleNext();
}

export function setMusicState(score: number, combo: number, mod: MusicMod = {}): void {
  const wasMagnet = magnetOn;
  curScore = score;
  curCombo = combo;
  fireOn = !!mod.fire;
  iceOn  = !!mod.ice;
  magnetOn = !!mod.magnet;
  // Reinicia a fanfarra do começo a cada nova ativação do ímã.
  if (magnetOn && !wasMagnet) magnetIdx = 0;
}

function scheduleNext(): void {
  const bpm = computeBpm(getMusicConfig(), curScore, curCombo, fireOn, iceOn);
  const interval = (60_000 / bpm) / 2;  // intervalo entre 8ths
  timer = window.setTimeout(() => {
    if (!isMuted() && getCtx()) tickStep();
    scheduleNext();
  }, interval);
}

function tickStep(): void {
  const cfg = getMusicConfig();
  const tier = computeComboTier(cfg, curCombo, fireOn, iceOn);
  const intensity = computeIntensity(cfg, curScore, curCombo, fireOn, iceOn);
  const barLen = cfg.barLengthByTier[tier];
  const inBar = step % barLen;

  // Detune microtonal aplicado em vozes melódicas — cresce com o tier.
  const detuneCents = cfg.detuneCentsByTier[tier];
  const dt = (): number => (Math.random() - 0.5) * detuneCents;

  // ─── BAIXO ─────────────────────────────────────────────────
  const bassCfg = tier === 0 ? cfg.bass.tier0
                 : tier === 1 ? cfg.bass.tier1
                              : cfg.bass.tier2;
  if (inBar % bassCfg.every === 0 && bassCfg.pattern.length > 0) {
    const idx = ((step / bassCfg.every) | 0) % bassCfg.pattern.length;
    const n = bassCfg.pattern[idx]!;
    play({
      wave: bassCfg.wave,
      freq: midiToFreq(cfg.rootMidi + bassCfg.octaveShift + n),
      adsr: bassCfg.adsr,
      gain: bassCfg.gainBase + intensity * bassCfg.gainPerIntensity,
      detune: dt(),
      filter: bassCfg.filter,
      cutoff: bassCfg.cutoffBase + intensity * bassCfg.cutoffPerIntensity,
      q: bassCfg.q,
    });
  }

  // ─── MELODIA ───────────────────────────────────────────────
  // Enquanto o ímã está ativo, a fanfarra é a voz melódica — silencia a
  // melodia aleatória para os dois não brigarem.
  if (!magnetOn) {
    const mel = cfg.melody.byTier[tier];
    const onBeat = step % 2 === 0;
    const chance = onBeat
      ? mel.onBeatBase + intensity * mel.onBeatIntensityFactor
      : mel.offBeatBase + intensity * mel.offBeatIntensityFactor + mel.offBeatBonus;
    if (Math.random() < chance) {
      const oct = Math.random() < cfg.melody.octaveUpChance ? cfg.melody.octaveUpSemitones : 0;
      let note: number;
      if (mel.chromaticChance > 0 && Math.random() < mel.chromaticChance) {
        // Cromático fora-de-escala — sabor dissonante.
        note = Math.floor(Math.random() * 12);
      } else {
        note = cfg.scale[Math.floor(Math.random() * cfg.scale.length)] ?? 0;
      }
      play({
        wave: mel.wave,
        freq: midiToFreq(cfg.rootMidi + cfg.melody.baseOffset + oct + note),
        adsr: mel.adsr,
        gain: mel.gainBase + intensity * mel.gainPerIntensity,
        detune: dt(),
      });
    }
  }

  // ─── BUMBO (KICK) ──────────────────────────────────────────
  const kt = cfg.kick.byTier[tier];
  const kickActive = kt.alwaysActive || intensity > kt.intensityThreshold;
  if (kickActive && kt.positions.includes(inBar)) {
    const heavy = tier >= cfg.kick.heavyTier;
    const preset = heavy ? cfg.kick.heavy : cfg.kick.light;
    play({
      wave: 'noise',
      freq: preset.noise.freq,
      adsr: preset.noise.adsr,
      gain: preset.noise.gainBase + intensity * preset.noise.gainPerIntensity,
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

  // ─── CAIXA (SNARE) ─────────────────────────────────────────
  const snarePos = cfg.snare.positionsByTier[tier];
  if (snarePos && snarePos.includes(inBar)) {
    playSnare(cfg.snare.gainByTier[tier] ?? 0);
  }

  // ─── CHIMBAL (HI-HAT) ──────────────────────────────────────
  // Mesmo modelo de kick/snare: positions explícitas + gate opcional por
  // intensidade. intensityMin <= 0 desativa o gate (toca sempre).
  const ht = cfg.hat.byTier[tier];
  const hatGated = ht.intensityMin <= 0 || intensity > ht.intensityMin;
  if (hatGated && ht.gain > 0 && ht.positions.includes(inBar)) {
    playHat(ht.gain);
  }

  // ─── CLUSTER DISSONANTE (TIER 2) ───────────────────────────
  const clr = cfg.cluster;
  if (clr.enabledTiers.includes(tier) && inBar === clr.position && Math.random() < clr.chance) {
    for (const interval of clr.intervals) {
      play({
        wave: clr.wave,
        freq: midiToFreq(cfg.rootMidi + clr.baseOffset + interval),
        adsr: clr.adsr,
        gain: clr.gain,
        detune: dt(),
        filter: clr.filter,
        cutoff: clr.cutoff,
        q: clr.q,
      });
    }
  }

  // ─── TEXTURAS DE POWER-UP ──────────────────────────────────
  // Fire: drone sub-grave no compasso 0. Adiciona ameaça.
  if (fireOn && inBar === cfg.fireTexture.position) {
    for (const v of cfg.fireTexture.voices) {
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
  // Ice: sino agudo + quinta no compasso 0. Brilho cristalino.
  if (iceOn && inBar === cfg.iceTexture.position) {
    for (const v of cfg.iceTexture.voices) {
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
  // Magnet: fanfarra militar com bateria completa.
  if (magnetOn && cfg.magnet.melody.length > 0 && step % cfg.magnet.every === 0) {
    const semitones = cfg.magnet.melody[magnetIdx % cfg.magnet.melody.length]!;
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
    // Timpani / bombo grave em cada nota da fanfarra.
    const ti = cfg.magnet.timpani;
    play({
      wave: ti.wave,
      freq: ti.freq,
      freqEnd: ti.freqEnd,
      freqTime: ti.freqTime,
      adsr: ti.adsr,
      gain: ti.gain,
      filter: ti.filter,
      cutoff: ti.cutoff,
      q: ti.q,
    });
    magnetIdx++;
  }

  // Percussão militar contínua do magnet.
  if (magnetOn) {
    const sn = cfg.magnet.snare;
    if (inBar % sn.stepMod === 0) {
      play({
        wave: 'noise',
        freq: sn.noise.freq,
        adsr: sn.noise.adsr,
        gain: sn.noise.gain,
        filter: sn.noise.filter,
        cutoff: sn.noise.cutoff,
        q: sn.noise.q,
      });
      play({
        wave: sn.body.wave,
        freq: sn.body.freq,
        adsr: sn.body.adsr,
        gain: sn.body.gain,
      });
    }
    const cr = cfg.magnet.crash;
    if (cr.positions.includes(inBar) && Math.random() < cr.chance) {
      const v = cr.voice;
      play({
        wave: v.wave,
        freq: v.freq,
        freqEnd: v.freqEnd,
        freqTime: v.freqTime,
        adsr: v.adsr,
        gain: v.gain,
        filter: v.filter,
        cutoff: v.cutoff,
        q: v.q,
      });
    }
  }

  step = (step + 1) | 0;
}

// Caixa "padrão" usada pela linha rítmica principal (tier 1 e 2).
function playSnare(gain: number): void {
  if (gain <= 0) return;
  const sn = getMusicConfig().snare;
  play({
    wave: 'noise',
    freq: sn.noise.freq,
    adsr: sn.noise.adsr,
    gain,
    filter: sn.noise.filter,
    cutoff: sn.noise.cutoff,
    q: sn.noise.q,
  });
  play({
    wave: sn.body.wave,
    freq: sn.body.freq,
    adsr: sn.body.adsr,
    gain: gain * sn.body.gainFactor,
  });
}

function playHat(gain: number): void {
  if (gain <= 0) return;
  const h = getMusicConfig().hat.noise;
  play({
    wave: 'noise',
    freq: h.freq,
    adsr: h.adsr,
    gain,
    filter: h.filter,
    cutoff: h.cutoff,
    q: h.q,
  });
}
