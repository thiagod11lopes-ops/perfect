// Credits screen — scrolling arcade roll. Renders on the game canvas.

import { drawNeonText } from '../render/ui';
import { FONT_BODY, FONT_DISPLAY } from '../render/fonts';
import { t } from '../i18n';

type LineKind = 'header' | 'subheader' | 'body' | 'italic' | 'link' | 'separator' | 'spacer';

// `key` → resolved via i18n at render time. `text` → literal (proper nouns,
// names, URLs that don't translate). Spacers/separators carry neither.
interface CreditLine {
  kind: LineKind;
  key?: string;
  text?: string;
  color?: string;
}

function lineText(l: CreditLine): string {
  return l.key ? t(l.key) : (l.text ?? '');
}

const LINES: CreditLine[] = [
  { key: 'title',                   kind: 'header',    color: '#00ffd5' },
  { key: 'tagline',                 kind: 'subheader', color: '#ff5fae' },
  { kind: 'spacer' },
  { kind: 'separator' },
  { kind: 'spacer' },

  { key: 'credits.createdBy',       kind: 'subheader', color: '#ffe855' },
  { text: 'ADRIANO FRANCO',         kind: 'header',    color: '#ffe855' },
  { text: 'adrianofranco.com',      kind: 'link',      color: '#ffb830' },
  { kind: 'spacer' },
  { key: 'credits.roles',           kind: 'body',      color: 'rgba(255,255,255,0.85)' },
  { key: 'credits.quote1a',         kind: 'italic',    color: 'rgba(255,232,85,0.65)' },
  { key: 'credits.quote1b',         kind: 'italic',    color: 'rgba(255,232,85,0.65)' },
  { kind: 'spacer' },
  { kind: 'separator' },
  { kind: 'spacer' },

  { key: 'credits.codePartner',     kind: 'subheader', color: '#cc88ff' },
  { text: '✦  CLAUDINHO  ✦',       kind: 'header',    color: '#cc88ff' },
  { text: 'Claude AI · Anthropic',  kind: 'body',      color: '#dd99ff' },
  { kind: 'spacer' },
  { key: 'credits.partnerLine1',    kind: 'body',      color: 'rgba(255,255,255,0.85)' },
  { key: 'credits.partnerLine2',    kind: 'body',      color: 'rgba(255,255,255,0.85)' },
  { key: 'credits.partnerLine3',    kind: 'body',      color: 'rgba(255,255,255,0.85)' },
  { key: 'credits.partnerLine4',    kind: 'body',      color: 'rgba(255,255,255,0.85)' },
  { kind: 'spacer' },
  { key: 'credits.disclaimer1',     kind: 'italic',    color: 'rgba(200,170,255,0.65)' },
  { key: 'credits.disclaimer2',     kind: 'italic',    color: 'rgba(200,170,255,0.65)' },
  { kind: 'spacer' },
  { kind: 'separator' },
  { kind: 'spacer' },

  { key: 'credits.techInspiration', kind: 'subheader', color: '#ff8844' },
  { text: 'MAPPING THE COMMODORE 64', kind: 'header',  color: '#ff8844' },
  { text: 'Sheldon Leemon',         kind: 'body',      color: '#ffaa66' },
  { text: 'COMPUTE! Publications, 1984', kind: 'body', color: '#ffaa66' },
  { kind: 'spacer' },
  { key: 'credits.book1',           kind: 'body',      color: 'rgba(255,255,255,0.85)' },
  { key: 'credits.book2',           kind: 'body',      color: 'rgba(255,255,255,0.85)' },
  { key: 'credits.book3',           kind: 'body',      color: 'rgba(255,255,255,0.85)' },
  { key: 'credits.book4',           kind: 'body',      color: 'rgba(255,255,255,0.85)' },
  { kind: 'spacer' },
  { kind: 'separator' },
  { kind: 'spacer' },

  { key: 'credits.madeWith',        kind: 'subheader', color: '#ff5fae' },
  { text: '© 2026 Adriano Franco',  kind: 'body',      color: 'rgba(255,255,255,0.55)' },
  // blank trail so last line scrolls fully off before looping
  { kind: 'spacer' },
  { kind: 'spacer' },
  { kind: 'spacer' },
  { kind: 'spacer' },
  { kind: 'spacer' },
  { kind: 'spacer' },
];

function lineH(kind: LineKind, base: number): number {
  switch (kind) {
    case 'header':    return base * 1.85;
    case 'subheader': return base * 1.15;
    case 'body':
    case 'italic':
    case 'link':      return base * 0.92;
    case 'separator': return base * 0.5;
    case 'spacer':    return base * 0.65;
  }
}

function totalH(base: number): number {
  return LINES.reduce((acc, l) => acc + lineH(l.kind, base), 0);
}

export function renderCredits(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  timeMs: number,
  scrollOffsetPx = 0,
): void {
  ctx.save();
  ctx.clearRect(0, 0, w, h);

  const base = Math.max(28, Math.min(52, h / 18));
  const speed = 50; // px / s
  const total = totalH(base);
  // Full cycle = content + one screen of blank pause before loop.
  const cycle = total + h;
  const raw = (timeMs / 1000 * speed) + scrollOffsetPx;
  const elapsed = ((raw % cycle) + cycle) % cycle;
  let y = h - elapsed;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (const line of LINES) {
    const lh = lineH(line.kind, base);
    const cy = y + lh / 2;

    if (cy > -lh && cy < h + lh) {
      if (line.kind === 'separator') {
        drawSeparator(ctx, w, cy);
      } else if (line.kind !== 'spacer') {
        drawLine(ctx, line, w / 2, cy, base, timeMs, w);
      }
    }
    y += lh;
  }

  // "Back" hint — pinned at bottom; hidden on mobile where the touch VOLTAR button shows instead
  if (w >= 460) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.font = `${Math.max(13, Math.min(20, w / 50))}px ${FONT_BODY}`;
    ctx.globalAlpha = 0.45 + 0.2 * Math.sin(timeMs / 420);
    ctx.fillStyle = '#fff';
    ctx.fillText(t('credits.back'), w / 2, h - 14);
    ctx.restore();
  }

  ctx.restore();
}

function drawSeparator(ctx: CanvasRenderingContext2D, w: number, cy: number): void {
  ctx.save();
  const sepW = Math.min(380, w * 0.55);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 10]);
  ctx.beginPath();
  ctx.moveTo(w / 2 - sepW / 2, cy);
  ctx.lineTo(w / 2 + sepW / 2, cy);
  ctx.stroke();
  ctx.restore();
}

function clampToWidth(
  ctx: CanvasRenderingContext2D,
  font: string, text: string, size: number, maxW: number,
): number {
  ctx.font = `${size}px ${font}`;
  const measured = ctx.measureText(text).width;
  return measured > maxW ? Math.max(10, size * (maxW / measured)) : size;
}

function drawLine(
  ctx: CanvasRenderingContext2D,
  line: CreditLine,
  x: number, y: number,
  base: number,
  timeMs: number,
  maxWidth: number,
): void {
  const color = line.color ?? '#fff';
  const text = lineText(line);
  const avail = maxWidth * 0.88; // leave a small margin on each side
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  switch (line.kind) {
    case 'header': {
      let size = Math.max(22, Math.min(78, base * 1.4));
      size = clampToWidth(ctx, FONT_DISPLAY, text, size, avail);
      ctx.font = `${size}px ${FONT_DISPLAY}`;
      const wob = Math.sin(timeMs / 310 + y * 0.005) * 2.5;
      drawNeonText(ctx, text, x, y + wob, color);
      break;
    }
    case 'subheader': {
      let size = Math.max(14, Math.min(34, base * 0.82));
      size = clampToWidth(ctx, FONT_BODY, text, size, avail);
      ctx.font = `${size}px ${FONT_BODY}`;
      ctx.globalAlpha = 0.92;
      drawNeonText(ctx, text, x, y, color);
      break;
    }
    case 'link': {
      let size = Math.max(12, Math.min(26, base * 0.68));
      size = clampToWidth(ctx, FONT_BODY, text, size, avail);
      ctx.font = `${size}px ${FONT_BODY}`;
      ctx.globalAlpha = 0.82 + 0.18 * Math.sin(timeMs / 520);
      drawNeonText(ctx, text, x, y, color);
      break;
    }
    case 'body': {
      let size = Math.max(12, Math.min(24, base * 0.63));
      size = clampToWidth(ctx, FONT_BODY, text, size, avail);
      ctx.font = `${size}px ${FONT_BODY}`;
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = color;
      ctx.fillText(text, x, y);
      break;
    }
    case 'italic': {
      let size = Math.max(11, Math.min(21, base * 0.56));
      size = clampToWidth(ctx, FONT_BODY, text, size, avail);
      ctx.font = `${size}px ${FONT_BODY}`;
      ctx.globalAlpha = 0.70;
      ctx.fillStyle = color;
      ctx.fillText(text, x, y);
      break;
    }
  }
  ctx.restore();
}
