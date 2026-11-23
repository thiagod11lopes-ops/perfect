// Shared language toggle — a row of flag pills used on the splash and menu
// screens. Like ui/menu.ts, one geometry function (`layoutToggle`) is the
// single source of truth for both the canvas render and the tap/click
// hit-test, so the visible pill and the touch target can never drift apart.
//
// Flags are drawn programmatically (canvas paths) on purpose: emoji flags
// (🇧🇷/🇺🇸) render as bare letter pairs on Windows Chrome/Firefox and are
// unreliable on <canvas>, which would break the cross-platform bar in §20.

import { availableLangs, getLang, langInfo, type Lang } from '../i18n';
import { FONT_BODY } from '../render/fonts';

export type ToggleAnchor = 'splash' | 'menu';

// The canvas toggle is the desktop path. On coarse pointers the language UI
// is the DOM pill row in input/touchControls.ts (§16 desktop-canvas /
// mobile-DOM split) — drawing it here too would double the control. Pointer
// type doesn't change at runtime, so this is resolved once.
const COARSE =
  typeof window !== 'undefined' &&
  window.matchMedia('(pointer: coarse)').matches;

export interface PillRect {
  lang: Lang;
  x: number;
  y: number;
  w: number;
  h: number;
}

function layoutToggle(w: number, h: number, anchor: ToggleAnchor): PillRect[] {
  const langs = availableLangs();
  const compact = w < 460;
  const pillH = compact
    ? Math.max(26, Math.min(34, h / 20))
    : Math.max(30, Math.min(42, h / 15));
  const pillW = pillH * 2.05;
  const gap = pillH * 0.32;
  const totalW = langs.length * pillW + (langs.length - 1) * gap;

  let startX: number;
  let y: number;
  if (anchor === 'menu') {
    const margin = compact ? 12 : 20;
    startX = w - totalW - margin;
    y = margin;
  } else {
    // splash — bottom-centered, clear of the desktop "PRESS ANY KEY" (0.83h)
    // and the mobile JOGAR button (centered ~48%h).
    startX = w / 2 - totalW / 2;
    y = h - pillH - (compact ? 14 : 22);
  }

  const rects: PillRect[] = [];
  for (let i = 0; i < langs.length; i++) {
    rects.push({ lang: langs[i]!, x: startX + i * (pillW + gap), y, w: pillW, h: pillH });
  }
  return rects;
}

export function langToggleHitTest(
  w: number, h: number, x: number, y: number, anchor: ToggleAnchor,
): Lang | null {
  if (COARSE) return null;
  for (const r of layoutToggle(w, h, anchor)) {
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r.lang;
  }
  return null;
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// Tiny stylized flags. Not heraldically exact — just instantly readable at
// ~26×17px against a dark neon UI.
function drawFlag(
  ctx: CanvasRenderingContext2D,
  code: string, x: number, y: number, fw: number, fh: number,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, fw, fh);
  ctx.clip();

  if (code === 'br') {
    ctx.fillStyle = '#1f9c3a';
    ctx.fillRect(x, y, fw, fh);
    ctx.fillStyle = '#ffdf2b';
    ctx.beginPath();
    ctx.moveTo(x + fw / 2, y + fh * 0.12);
    ctx.lineTo(x + fw * 0.88, y + fh / 2);
    ctx.lineTo(x + fw / 2, y + fh * 0.88);
    ctx.lineTo(x + fw * 0.12, y + fh / 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1c3f9c';
    ctx.beginPath();
    ctx.arc(x + fw / 2, y + fh / 2, fh * 0.21, 0, Math.PI * 2);
    ctx.fill();
  } else if (code === 'us') {
    const stripes = 7;
    for (let i = 0; i < stripes; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#c4313b' : '#f4f4f4';
      ctx.fillRect(x, y + (i * fh) / stripes, fw, fh / stripes + 0.5);
    }
    ctx.fillStyle = '#23306b';
    ctx.fillRect(x, y, fw * 0.42, fh * 0.54);
    ctx.fillStyle = '#f4f4f4';
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 3; c++) {
        ctx.beginPath();
        ctx.arc(
          x + fw * (0.1 + c * 0.13),
          y + fh * (0.16 + r * 0.22),
          Math.max(0.7, fh * 0.045),
          0, Math.PI * 2,
        );
        ctx.fill();
      }
    }
  } else {
    // Unknown locale — neutral chip so a new JSON still gets a usable pill.
    ctx.fillStyle = '#444a66';
    ctx.fillRect(x, y, fw, fh);
  }
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, fw - 1, fh - 1);
  ctx.restore();
}

export function drawLangToggle(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  anchor: ToggleAnchor,
  timeMs: number,
): void {
  if (COARSE) return;
  const rects = layoutToggle(w, h, anchor);
  const active = getLang();
  const pulse = 0.6 + 0.4 * Math.sin(timeMs / 320);

  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  for (const r of rects) {
    const isActive = r.lang === active;
    const info = langInfo(r.lang);
    const fh = r.h * 0.5;
    const fw = fh * 1.5;
    const padX = r.h * 0.26;

    // Pill body
    roundRectPath(ctx, r.x, r.y, r.w, r.h, r.h * 0.28);
    ctx.fillStyle = isActive ? 'rgba(0,255,213,0.14)' : 'rgba(255,255,255,0.05)';
    ctx.fill();
    ctx.lineWidth = isActive ? 2 : 1;
    ctx.strokeStyle = isActive
      ? `rgba(0,255,213,${pulse})`
      : 'rgba(255,255,255,0.22)';
    ctx.stroke();

    ctx.globalAlpha = isActive ? 1 : 0.5;
    drawFlag(ctx, info.flag, r.x + padX, r.y + (r.h - fh) / 2, fw, fh);

    ctx.fillStyle = isActive ? '#eafff9' : 'rgba(230,224,255,0.7)';
    ctx.font = `${Math.floor(r.h * 0.42)}px ${FONT_BODY}`;
    ctx.fillText(info.short, r.x + padX + fw + r.h * 0.22, r.y + r.h / 2 + 1);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}
