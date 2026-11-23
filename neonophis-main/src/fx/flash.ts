// Fullscreen flashes + zoom pulses.

interface Flash {
  remaining: number;
  duration: number;
  color: string;
  intensity: number;
}

interface Zoom {
  remaining: number;
  duration: number;
  amount: number;     // e.g. 0.05 = up to 5%
}

const flashes: Flash[] = [];
let activeZoom: Zoom | null = null;

export function flash(color: string, durationMs: number, intensity = 1): void {
  flashes.push({
    remaining: durationMs / 1000,
    duration: durationMs / 1000,
    color, intensity,
  });
}

export function zoomPulse(amount: number, durationMs: number): void {
  activeZoom = { remaining: durationMs / 1000, duration: durationMs / 1000, amount };
}

export function tickFlashes(dt: number): void {
  for (let i = flashes.length - 1; i >= 0; i--) {
    flashes[i]!.remaining -= dt;
    if (flashes[i]!.remaining <= 0) flashes.splice(i, 1);
  }
  if (activeZoom) {
    activeZoom.remaining -= dt;
    if (activeZoom.remaining <= 0) activeZoom = null;
  }
}

export function renderFlashes(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  for (const f of flashes) {
    const a = (f.remaining / f.duration) * f.intensity;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = f.color;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}

export function getZoomScale(): number {
  if (!activeZoom) return 1;
  const t = activeZoom.remaining / activeZoom.duration;
  // Quick out, slow back
  return 1 + activeZoom.amount * Math.sin(t * Math.PI);
}

export function clearFlashes(): void {
  flashes.length = 0;
  activeZoom = null;
}
