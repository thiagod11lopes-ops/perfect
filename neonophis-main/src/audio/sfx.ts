// SFX library — §9 mapping table.

import { play, ensureAudio, midiToFreq } from './synth';

export function sfxEat(combo: number): void {
  ensureAudio();
  const base = 660 + Math.min(20, combo) * 30;
  // Square + noise burst
  play({
    wave: 'square',
    freq: base,
    freqEnd: base * 1.6,
    freqTime: 0.08,
    adsr: { a: 0.005, d: 0.08, s: 0, r: 0.05 },
    gain: 0.18,
  });
  play({
    wave: 'noise',
    freq: base,
    adsr: { a: 0, d: 0.04, s: 0, r: 0.02 },
    gain: 0.07,
    filter: 'high',
    cutoff: 1200,
    q: 3,
  });
}

export function sfxComboUp(level: number): void {
  ensureAudio();
  const root = 60 + Math.min(24, level);
  const intervals = [0, 4, 7, 12];
  for (let i = 0; i < intervals.length; i++) {
    setTimeout(() => {
      play({
        wave: 'triangle',
        freq: midiToFreq(root + intervals[i]!),
        adsr: { a: 0.005, d: 0.18, s: 0.2, r: 0.15 },
        gain: 0.13,
        detune: i >= 2 ? 6 : 0,
      });
    }, i * 60);
  }
}

export function sfxPowerUp(): void {
  ensureAudio();
  play({
    wave: 'sawtooth',
    freq: 200,
    freqEnd: 1800,
    freqTime: 0.32,
    adsr: { a: 0.03, d: 0.4, s: 0.3, r: 0.3 },
    gain: 0.18,
    filter: 'low',
    cutoff: 400,
    cutoffEnd: 4000,
  });
  play({
    wave: 'square',
    freq: 400, freqEnd: 3200, freqTime: 0.32,
    adsr: { a: 0.02, d: 0.35, s: 0.2, r: 0.2 },
    gain: 0.07,
  });
}

export function sfxGameOver(): void {
  ensureAudio();
  play({
    wave: 'sawtooth',
    freq: 800, freqEnd: 50, freqTime: 1.2,
    adsr: { a: 0.0, d: 1.5, s: 0, r: 0.4 },
    gain: 0.22,
    filter: 'low',
    cutoff: 1500, cutoffEnd: 200,
  });
  play({
    wave: 'noise',
    freq: 200,
    adsr: { a: 0.0, d: 0.6, s: 0.0, r: 0.4 },
    gain: 0.08,
  });
}

export function sfxBonk(): void {
  ensureAudio();
  play({
    wave: 'noise',
    freq: 150,
    adsr: { a: 0, d: 0.08, s: 0, r: 0.03 },
    gain: 0.18,
    filter: 'low',
    cutoff: 800, q: 2,
  });
}

export function sfxSpeedUp(): void {
  ensureAudio();
  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      play({
        wave: 'sawtooth',
        freq: 880 + i * 220,
        adsr: { a: 0.003, d: 0.05, s: 0.4, r: 0.07 },
        gain: 0.1,
      });
    }, i * 50);
  }
}

export function sfxMenuMove(): void {
  ensureAudio();
  play({
    wave: 'square',
    freq: 600,
    adsr: { a: 0.001, d: 0.04, s: 0, r: 0.02 },
    gain: 0.07,
  });
}

export function sfxMenuSelect(): void {
  ensureAudio();
  play({
    wave: 'triangle',
    freq: 440, freqEnd: 880, freqTime: 0.1,
    adsr: { a: 0.003, d: 0.12, s: 0, r: 0.1 },
    gain: 0.15,
  });
}

export function sfxStart(): void {
  ensureAudio();
  // Cute three-note arp: C E G
  const notes = [60, 64, 67, 72];
  for (let i = 0; i < notes.length; i++) {
    setTimeout(() => {
      play({
        wave: 'square',
        freq: midiToFreq(notes[i]!),
        adsr: { a: 0.004, d: 0.12, s: 0.3, r: 0.18 },
        gain: 0.13,
      });
    }, i * 70);
  }
}

export function sfxEasterUnlock(): void {
  ensureAudio();
  const notes = [72, 76, 79, 84, 88];
  for (let i = 0; i < notes.length; i++) {
    setTimeout(() => {
      play({
        wave: 'triangle',
        freq: midiToFreq(notes[i]!),
        adsr: { a: 0.003, d: 0.18, s: 0.25, r: 0.18 },
        gain: 0.14,
      });
    }, i * 80);
  }
}
