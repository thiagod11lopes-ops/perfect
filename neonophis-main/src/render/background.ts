// Animated neon background on a separate offscreen canvas, refreshed at ~30Hz.
// §6.

let bgCtx: CanvasRenderingContext2D | null = null;
let bgCanvas: HTMLCanvasElement | null = null;
let lastUpdate = 0;
let phase = 0;
// CSS-space dimensions captured at resize. The context already has the
// (capped) dpr baked into its transform, so we draw in CSS px — same model
// as renderer.ts. Recomputing from window.devicePixelRatio here is wrong:
// resize caps dpr at 2 while devicePixelRatio is often 3 on phones, which
// shrank the painted area to ~2/3 of the screen ("strange bg on mobile").
let cssW = 0;
let cssH = 0;

export function initBackground(canvas: HTMLCanvasElement): void {
  bgCanvas = canvas;
  bgCtx = canvas.getContext('2d', { alpha: false })!;
}

export function resizeBackground(w: number, h: number, dpr: number): void {
  if (!bgCanvas) return;
  bgCanvas.width = Math.floor(w * dpr);
  bgCanvas.height = Math.floor(h * dpr);
  bgCanvas.style.width = `${w}px`;
  bgCanvas.style.height = `${h}px`;
  bgCtx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  cssW = w;
  cssH = h;
}

export function updateBackground(timeMs: number, intensity: number, disco: boolean): void {
  if (!bgCtx || !bgCanvas) return;
  // 30Hz cap.
  if (timeMs - lastUpdate < 33) return;
  const dt = (timeMs - lastUpdate) / 1000;
  lastUpdate = timeMs;
  phase += dt * (0.4 + intensity * 0.8);

  const w = cssW;
  const h = cssH;
  const ctx = bgCtx;

  const baseHue = disco ? (timeMs / 20) % 360 : 270 + Math.sin(phase * 0.3) * 30;

  const grad = ctx.createRadialGradient(w * 0.5, h * 0.2, 0, w * 0.5, h * 0.5, Math.max(w, h));
  grad.addColorStop(0, `hsl(${baseHue} 70% 14%)`);
  grad.addColorStop(0.55, `hsl(${(baseHue + 60) % 360} 60% 7%)`);
  grad.addColorStop(1, '#04030d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Wave bands
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const y = (h * 0.5) + Math.sin(phase * (0.6 + i * 0.1) + i) * (h * 0.18);
    const hue = (baseHue + i * 40 + phase * 30) % 360;
    const grad2 = ctx.createLinearGradient(0, y - 80, 0, y + 80);
    grad2.addColorStop(0, `hsla(${hue}, 100%, 60%, 0)`);
    grad2.addColorStop(0.5, `hsla(${hue}, 100%, 60%, ${0.10 + intensity * 0.08})`);
    grad2.addColorStop(1, `hsla(${hue}, 100%, 60%, 0)`);
    ctx.fillStyle = grad2;
    ctx.fillRect(0, y - 80, w, 160);
  }
  ctx.restore();

  // Star/dust dots — pseudo-random but deterministic
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 60; i++) {
    const sx = ((i * 9301 + 49297) % 233280) / 233280 * w;
    const sy = ((i * 12345 + 1103) % 199999) / 199999 * h;
    const tw = 0.5 + Math.sin(phase * 2 + i * 1.7) * 0.5;
    ctx.globalAlpha = 0.2 + tw * 0.5;
    ctx.fillStyle = `hsl(${(baseHue + 180) % 360} 70% 80%)`;
    ctx.fillRect(sx, sy, 2, 2);
  }
  ctx.restore();

  // Horizon glow line
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const linY = h * 0.62 + Math.sin(phase * 0.5) * 8;
  const linG = ctx.createLinearGradient(0, linY - 4, 0, linY + 4);
  linG.addColorStop(0, 'transparent');
  linG.addColorStop(0.5, `hsl(${(baseHue + 120) % 360} 100% 70%)`);
  linG.addColorStop(1, 'transparent');
  ctx.fillStyle = linG;
  ctx.globalAlpha = 0.001 + intensity * 0.001;
  ctx.fillRect(0, linY - 4, w, 8);
  ctx.restore();
}
