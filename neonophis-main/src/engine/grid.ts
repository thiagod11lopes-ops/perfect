/** Grid size — standalone uses full board; PERFECT embed reads URL params. */

const BASE_GRID_W = 32;
const BASE_GRID_H = 24;

function isEmbedMode(): boolean {
  if (typeof window === 'undefined') return false;
  const p = new URLSearchParams(window.location.search);
  return p.get('embed') === '1' || p.get('perfect') === '1';
}

function clampGridDim(raw: number | undefined, fallback: number, max: number): number {
  if (raw === undefined || !Number.isFinite(raw)) return fallback;
  return Math.min(max, Math.max(6, Math.floor(raw)));
}

export function isPerfectEmbedMode(): boolean {
  return isEmbedMode();
}

export function isPhoneEmbed(): boolean {
  if (typeof window === 'undefined' || !isEmbedMode()) return false;
  const p = new URLSearchParams(window.location.search);
  return p.get('phone') === '1';
}

export function embedCellPxOverride(): number | null {
  if (typeof window === 'undefined' || !isEmbedMode()) return null;
  const p = new URLSearchParams(window.location.search);
  const raw = p.get('cellPx') ?? p.get('cell');
  if (raw == null) return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return null;
  return Math.min(48, Math.max(6, Math.floor(n)));
}

export function gridW(): number {
  if (!isEmbedMode()) return BASE_GRID_W;
  const p = new URLSearchParams(window.location.search);
  const raw = p.get('gridW') ?? p.get('cols');
  const n = raw != null ? Number.parseInt(raw, 10) : NaN;
  return clampGridDim(Number.isFinite(n) ? n : undefined, 12, 48);
}

export function gridH(): number {
  if (!isEmbedMode()) return BASE_GRID_H;
  const p = new URLSearchParams(window.location.search);
  const raw = p.get('gridH') ?? p.get('rows');
  const n = raw != null ? Number.parseInt(raw, 10) : NaN;
  return clampGridDim(Number.isFinite(n) ? n : undefined, 20, 64);
}