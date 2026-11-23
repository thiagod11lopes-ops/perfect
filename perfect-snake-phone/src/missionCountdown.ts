/** Contagem regressiva full-screen antes da primeira jogada. */
export const START_COUNTDOWN_MS = 5_000;

let layer: HTMLDivElement | null = null;
let lastDigit = -1;
let mounted = false;

export function mountCountdown(host: HTMLElement): void {
  if (mounted) return;
  mounted = true;
  layer = document.createElement('div');
  layer.className = 'mission-countdown';
  layer.setAttribute('role', 'timer');
  layer.setAttribute('aria-hidden', 'true');

  const halo = document.createElement('div');
  halo.className = 'mission-countdown-halo';

  const ring = document.createElement('div');
  ring.className = 'mission-countdown-ring';

  const digit = document.createElement('span');
  digit.className = 'mission-countdown-digit';
  digit.textContent = '5';

  layer.appendChild(halo);
  layer.appendChild(ring);
  layer.appendChild(digit);
  host.appendChild(layer);
}

export function syncCountdownLayer(countdownMs: number, nowMs: number): void {
  if (!layer) return;
  const n = Math.max(1, Math.ceil(countdownMs / 1000));
  const digit = layer.querySelector<HTMLElement>('.mission-countdown-digit');
  if (!digit) return;

  if (n !== lastDigit) {
    lastDigit = n;
    digit.textContent = String(n);
    digit.classList.remove('mission-countdown-pop');
    void digit.offsetWidth;
    digit.classList.add('mission-countdown-pop');
  }

  const phase = (nowMs % 1000) / 1000;
  layer.style.setProperty('--cd-phase', String(phase));
}

export function resetCountdownUi(): void {
  layer?.remove();
  layer = null;
  lastDigit = -1;
  mounted = false;
}

export function dismissCountdown(): void {
  if (!layer) return;
  layer.classList.add('mission-countdown-out');
  const el = layer;
  window.setTimeout(() => {
    el.remove();
    if (layer === el) layer = null;
  }, 420);
  lastDigit = -1;
  mounted = false;
}