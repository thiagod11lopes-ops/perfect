// SID-flavored synth — §9. Web Audio API, no samples.
// 4 waveforms, ADSR via gain automation, optional pulse-width filter sweep, noise.

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let muted = false;

export function getCtx(): AudioContext | null { return ctx; }

export function ensureAudio(): AudioContext {
  if (!ctx) {
    const C = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    ctx = new C();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.45;
    masterGain.connect(ctx.destination);
  }
  // Some browsers start suspended until a gesture
  if (ctx.state === 'suspended') ctx.resume().catch(() => { /* ignore */ });
  return ctx;
}

export function setMuted(m: boolean): void {
  muted = m;
  if (masterGain) masterGain.gain.setTargetAtTime(m ? 0 : 0.45, ctx!.currentTime, 0.02);
}
export function isMuted(): boolean { return muted; }

export type Waveform = 'sine' | 'square' | 'sawtooth' | 'triangle' | 'noise' | 'pulse';

export interface ADSR {
  a: number;  // attack seconds
  d: number;  // decay seconds
  s: number;  // sustain level 0..1
  r: number;  // release seconds
}

export interface Voice {
  wave: Waveform;
  freq: number;        // Hz
  freqEnd?: number;    // for pitch sweep target
  freqTime?: number;   // sweep time in seconds
  adsr: ADSR;
  gain: number;        // peak gain
  filter?: 'low' | 'high' | 'band';
  cutoff?: number;
  cutoffEnd?: number;
  q?: number;
  detune?: number;     // cents
  pulseWidth?: number; // for pulse 0..1
}

export function play(voice: Voice, hold = 0): void {
  if (!ctx || !masterGain || muted) return;
  const c = ctx;
  const now = c.currentTime;
  const dur = voice.adsr.a + voice.adsr.d + hold + voice.adsr.r;

  const out = c.createGain();
  out.gain.value = 0;
  let last: AudioNode = out;

  // Filter
  if (voice.filter && voice.cutoff) {
    const f = c.createBiquadFilter();
    f.type = voice.filter === 'low' ? 'lowpass' : voice.filter === 'high' ? 'highpass' : 'bandpass';
    f.frequency.value = voice.cutoff;
    f.Q.value = voice.q ?? 4;
    if (voice.cutoffEnd && voice.cutoffEnd !== voice.cutoff) {
      f.frequency.setValueAtTime(voice.cutoff, now);
      f.frequency.linearRampToValueAtTime(voice.cutoffEnd, now + (voice.freqTime ?? voice.adsr.a + voice.adsr.d));
    }
    f.connect(out);
    last = f;
  }

  // Source
  if (voice.wave === 'noise') {
    const buf = makeNoiseBuffer(c, dur);
    const src = c.createBufferSource();
    src.buffer = buf;
    src.connect(last);
    src.start(now);
    src.stop(now + dur + 0.05);
  } else if (voice.wave === 'pulse') {
    // Approximate pulse as two sawtooths with PWM: simpler — use square + harmonic
    const osc = c.createOscillator();
    osc.type = 'square';
    osc.frequency.value = voice.freq;
    if (voice.detune) osc.detune.value = voice.detune;
    if (voice.freqEnd) {
      osc.frequency.setValueAtTime(voice.freq, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, voice.freqEnd), now + (voice.freqTime ?? dur));
    }
    osc.connect(last);
    osc.start(now);
    osc.stop(now + dur + 0.05);
  } else {
    const osc = c.createOscillator();
    osc.type = voice.wave;
    osc.frequency.value = voice.freq;
    if (voice.detune) osc.detune.value = voice.detune;
    if (voice.freqEnd) {
      osc.frequency.setValueAtTime(voice.freq, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, voice.freqEnd), now + (voice.freqTime ?? dur));
    }
    osc.connect(last);
    osc.start(now);
    osc.stop(now + dur + 0.05);
  }

  // ADSR envelope
  const { a, d, s, r } = voice.adsr;
  const peak = voice.gain;
  out.gain.setValueAtTime(0, now);
  out.gain.linearRampToValueAtTime(peak, now + a);
  out.gain.linearRampToValueAtTime(peak * s, now + a + d);
  out.gain.setValueAtTime(peak * s, now + a + d + hold);
  out.gain.linearRampToValueAtTime(0, now + a + d + hold + r);

  out.connect(masterGain);

  // Cleanup
  setTimeout(() => { try { out.disconnect(); } catch { /* ignore */ } }, (dur + 0.5) * 1000);
}

function makeNoiseBuffer(c: AudioContext, dur: number): AudioBuffer {
  const sr = c.sampleRate;
  const len = Math.max(1, Math.ceil(sr * dur));
  const buf = c.createBuffer(1, len, sr);
  const data = buf.getChannelData(0);
  // White noise
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// ─── Analyser tap (uso DEV-ONLY pelo Audio Lab) ────────────────────────────
// Função invocada apenas pelos visualizadores do lab (osciloscópio, FFT,
// meter). Em produção ninguém importa `attachAnalyzer`, então o tree-shake
// remove ela do bundle final.
//
// Implementação: insere um AnalyserNode entre o masterGain e o destination,
// reaproveitando o mesmo node em chamadas repetidas (singleton). Não há
// degradação de sinal — Web Audio garante que o analyser é pass-through.

let analyser: AnalyserNode | null = null;

export function attachAnalyzer(fftSize = 2048): AnalyserNode {
  ensureAudio();
  if (!ctx || !masterGain) {
    throw new Error('[synth] attachAnalyzer chamado sem AudioContext disponível');
  }
  if (analyser) return analyser;

  analyser = ctx.createAnalyser();
  analyser.fftSize = fftSize;
  analyser.smoothingTimeConstant = 0.78;

  // Reroteia: masterGain → analyser → destination (antes ia direto pro
  // destination). Como esta função é chamada antes de qualquer som tocar,
  // não há sinal sendo interrompido — sem clicks.
  masterGain.disconnect();
  masterGain.connect(analyser);
  analyser.connect(ctx.destination);

  return analyser;
}
