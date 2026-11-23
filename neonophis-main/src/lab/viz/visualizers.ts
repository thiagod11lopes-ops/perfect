// Visualizadores do master bus do Audio Lab.
//
// Três painéis em pilha vertical:
//   1) OSCILOSCÓPIO  — domínio do tempo, mostra a forma de onda corrente.
//   2) FFT (ESPECTRO) — domínio da frequência, gradiente ciano→magenta.
//   3) MASTER METER  — RMS contínuo + peak hold com decay.
//
// Tudo compartilha UM ÚNICO AnalyserNode (`attachAnalyzer` de synth.ts) e
// UM ÚNICO loop de requestAnimationFrame. Buffers Uint8Array são alocados
// uma vez e reusados — zero allocations por frame (regra do CLAUDE.md §18).
//
// Cuidado com leaks: cancelAnimationFrame no destroy, ResizeObserver com
// disconnect, AnalyserNode permanece (singleton) — quando a aba fecha, o
// AudioContext é coletado pelo GC do browser.

import { attachAnalyzer } from '../../audio/synth';

const FFT_SIZE = 2048;

interface PeakState {
  peak: number;       // pico corrente segurado (0..1)
  peakDecay: number;  // taxa de decay incremental
}

interface VizHandle {
  destroy(): void;
}

export function mountVisualizers(host: HTMLElement): VizHandle {
  // Estrutura DOM — três linhas, cada uma com label + canvas.
  host.classList.add('viz-panel');
  host.innerHTML = `
    <div class="viz-row">
      <div class="viz-label">osciloscópio</div>
      <canvas data-role="osc"></canvas>
    </div>
    <div class="viz-row">
      <div class="viz-label">fft espectro</div>
      <canvas data-role="fft"></canvas>
    </div>
    <div class="viz-row viz-row-meter">
      <div class="viz-label">master meter</div>
      <canvas data-role="meter"></canvas>
      <span class="viz-meter-value" data-role="meter-val">−∞ dB</span>
    </div>
  `;

  const oscCanvas = host.querySelector<HTMLCanvasElement>('[data-role="osc"]')!;
  const fftCanvas = host.querySelector<HTMLCanvasElement>('[data-role="fft"]')!;
  const meterCanvas = host.querySelector<HTMLCanvasElement>('[data-role="meter"]')!;
  const meterValueEl = host.querySelector<HTMLElement>('[data-role="meter-val"]')!;

  // Cria/reaproveita o analyser. Isso já chama ensureAudio() internamente.
  const analyser = attachAnalyzer(FFT_SIZE);

  // Buffers reutilizáveis — alocados UMA vez.
  // ArrayBuffer explícito: sem isso, TS 5.x infere `ArrayBufferLike` que
  // a Web Audio API rejeita (espera `Uint8Array<ArrayBuffer>` específico).
  const timeBuf = new Uint8Array(new ArrayBuffer(analyser.fftSize));
  const freqBuf = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));

  const peakState: PeakState = { peak: 0, peakDecay: 0 };

  // Setup de DPR + ResizeObserver para manter canvas crisp ao redimensionar.
  const oscCtx = setupCanvas(oscCanvas);
  const fftCtx = setupCanvas(fftCanvas);
  const meterCtx = setupCanvas(meterCanvas);

  const ro = new ResizeObserver(() => {
    setupCanvas(oscCanvas, oscCtx);
    setupCanvas(fftCanvas, fftCtx);
    setupCanvas(meterCanvas, meterCtx);
  });
  ro.observe(oscCanvas);
  ro.observe(fftCanvas);
  ro.observe(meterCanvas);

  // Loop de render — único RAF para os três painéis.
  let rafId = 0;
  let stopped = false;

  function frame(): void {
    if (stopped) return;
    drawOscilloscope(oscCtx, oscCanvas, analyser, timeBuf);
    drawFFT(fftCtx, fftCanvas, analyser, freqBuf);
    drawMeter(meterCtx, meterCanvas, analyser, timeBuf, peakState, meterValueEl);
    rafId = requestAnimationFrame(frame);
  }
  rafId = requestAnimationFrame(frame);

  return {
    destroy(): void {
      stopped = true;
      cancelAnimationFrame(rafId);
      ro.disconnect();
    },
  };
}

// ─── Configuração de canvas com DPR ────────────────────────────────────────

function setupCanvas(canvas: HTMLCanvasElement, existingCtx?: CanvasRenderingContext2D): CanvasRenderingContext2D {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const rect = canvas.getBoundingClientRect();
  // Largura/altura podem ser 0 antes do primeiro layout — protege.
  const w = Math.max(1, Math.floor(rect.width));
  const h = Math.max(1, Math.floor(rect.height));
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  const ctx = existingCtx ?? canvas.getContext('2d')!;
  ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform antes do scale
  ctx.scale(dpr, dpr);
  return ctx;
}

// ─── Osciloscópio ──────────────────────────────────────────────────────────

function drawOscilloscope(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  analyser: AnalyserNode,
  buf: Uint8Array<ArrayBuffer>
): void {
  analyser.getByteTimeDomainData(buf);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;

  // Background
  ctx.fillStyle = '#05030f';
  ctx.fillRect(0, 0, w, h);

  // Grid (linha central)
  ctx.strokeStyle = 'rgba(0, 255, 213, 0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.stroke();

  // Forma de onda
  ctx.strokeStyle = '#00ffd5';
  ctx.lineWidth = 1.5;
  ctx.shadowColor = 'rgba(0, 255, 213, 0.5)';
  ctx.shadowBlur = 4;
  ctx.beginPath();
  const slice = w / buf.length;
  for (let i = 0; i < buf.length; i++) {
    const v = buf[i]! / 128.0; // 0..2, centrado em 1
    const y = (v * h) / 2;
    if (i === 0) ctx.moveTo(0, y);
    else ctx.lineTo(i * slice, y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
}

// ─── FFT (espectro de frequências) ─────────────────────────────────────────

function drawFFT(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  analyser: AnalyserNode,
  buf: Uint8Array<ArrayBuffer>
): void {
  analyser.getByteFrequencyData(buf);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;

  ctx.fillStyle = '#05030f';
  ctx.fillRect(0, 0, w, h);

  // Mostra ~80% dos bins (descarta o topo, que costuma ficar zerado para
  // sample rates típicas — 0–17kHz cobre tudo que importa).
  const visibleBins = Math.floor(buf.length * 0.8);
  const barWidth = w / visibleBins;

  for (let i = 0; i < visibleBins; i++) {
    const v = buf[i]! / 255;
    if (v <= 0.01) continue;
    const barH = v * h;
    // Gradiente: bins graves em ciano, médios em magenta, agudos em quase-branco.
    const t = i / visibleBins; // 0..1 frequência
    const r = Math.floor(0   + t * 255);
    const g = Math.floor(255 - t * 200);
    const b = Math.floor(213 - t * 40);
    ctx.fillStyle = `rgba(${r},${g},${b},${0.4 + v * 0.6})`;
    ctx.fillRect(i * barWidth, h - barH, Math.max(1, barWidth - 0.5), barH);
  }
}

// ─── Master meter (RMS + peak hold) ────────────────────────────────────────

function drawMeter(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  analyser: AnalyserNode,
  buf: Uint8Array<ArrayBuffer>,
  peakState: PeakState,
  valueEl: HTMLElement
): void {
  analyser.getByteTimeDomainData(buf);

  // RMS calculado em domínio normalizado (-1..1).
  let sumSq = 0;
  for (let i = 0; i < buf.length; i++) {
    const v = (buf[i]! - 128) / 128;
    sumSq += v * v;
  }
  const rms = Math.sqrt(sumSq / buf.length);

  // Peak hold com decay suave.
  if (rms > peakState.peak) {
    peakState.peak = rms;
    peakState.peakDecay = 0;
  } else {
    peakState.peakDecay = Math.min(0.02, peakState.peakDecay + 0.0008);
    peakState.peak = Math.max(rms, peakState.peak - peakState.peakDecay);
  }

  const w = canvas.clientWidth;
  const h = canvas.clientHeight;

  // Background
  ctx.fillStyle = '#05030f';
  ctx.fillRect(0, 0, w, h);

  // Escala: 0..0.5 RMS preenche 0..100% do meter (RMS de 0.5 já é alto).
  const norm = Math.min(1, rms * 2);
  const peakNorm = Math.min(1, peakState.peak * 2);

  // Barra RMS com gradiente verde→amarelo→vermelho.
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0,    '#00ffd5');
  grad.addColorStop(0.55, '#ffea00');
  grad.addColorStop(0.85, '#ff00ff');
  grad.addColorStop(1,    '#ff2266');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, norm * w, h);

  // Marcador de peak (linha branca fina).
  if (peakNorm > 0.001) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(Math.max(0, peakNorm * w - 1), 0, 2, h);
  }

  // Texto em dB.
  const db = rms > 1e-5 ? 20 * Math.log10(rms) : -Infinity;
  valueEl.textContent = isFinite(db) ? `${db.toFixed(1)} dB` : '−∞ dB';
}
