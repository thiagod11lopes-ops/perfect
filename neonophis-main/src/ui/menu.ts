// Animated main menu — mode selector with arrow navigation.

import { modeLabel, modeBlurb, type ModeId } from '../gameplay/modes';
import { drawNeonText } from '../render/ui';
import { sfxMenuMove, sfxMenuSelect } from '../audio/sfx';
import { getHighScores } from '../storage/highscores';
import { FONT_BODY, FONT_DISPLAY } from '../render/fonts';
import { t } from '../i18n';
import { drawLangToggle } from './langToggle';

export type MenuItem = ModeId | 'credits' | 'scores';

export const MENU_ORDER: ModeId[] = ['classic', 'chaos', 'timeattack', 'relax'];
export const MENU_ITEMS: MenuItem[] = [...MENU_ORDER, 'scores', 'credits'];
const ORDER = MENU_ITEMS;

export interface MenuState {
  index: number;
  enterPressed: boolean;
}

// Shared geometry — single source of truth for both render and touch hit-test.
function menuLayout(h: number): { startY: number; lineH: number } {
  return {
    startY: h * 0.42,
    lineH: Math.max(40, Math.min(72, h / 12)),
  };
}

// Maps a tap (canvas CSS coords) to a menu item index, or null if outside the list.
// The whole row band is tappable (x ignored) so it's forgiving on small screens.
export function menuHitTest(_w: number, h: number, _x: number, y: number): number | null {
  const { startY, lineH } = menuLayout(h);
  for (let i = 0; i < ORDER.length; i++) {
    const rowY = startY + i * lineH;
    if (y >= rowY - lineH * 0.5 && y <= rowY + lineH * 0.5) return i;
  }
  return null;
}

export function createMenu(): MenuState {
  return { index: 0, enterPressed: false };
}

export function menuMoveUp(s: MenuState): void {
  s.index = (s.index - 1 + ORDER.length) % ORDER.length;
  sfxMenuMove();
}

export function menuMoveDown(s: MenuState): void {
  s.index = (s.index + 1) % ORDER.length;
  sfxMenuMove();
}

export function menuConfirm(s: MenuState): MenuItem {
  s.enterPressed = true;
  sfxMenuSelect();
  return ORDER[s.index]!;
}

export function renderMenu(
  ctx: CanvasRenderingContext2D,
  s: MenuState,
  w: number, h: number,
  timeMs: number,
): void {
  ctx.save();

  // TITLE — Rubik Iso for the 3D arcade impact
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const titleSize = Math.max(32, Math.min(140, w / 8));
  ctx.font = `${titleSize}px ${FONT_DISPLAY}`;
  const wob = Math.sin(timeMs / 240) * 6;
  drawNeonText(ctx, t('title'), w / 2, h * 0.18 + wob, '#00ffd5');
  // sub
  ctx.font = `${titleSize * 0.32}px ${FONT_BODY}`;
  ctx.globalAlpha = 0.85;
  drawNeonText(ctx, t('tagline'), w / 2, h * 0.18 + titleSize * 0.65 + wob, '#ff5fae');
  ctx.globalAlpha = 1;

  // MODE LIST — selected gets Rubik Iso, others Bitcount for hierarchy
  const { startY, lineH } = menuLayout(h);
  for (let i = 0; i < ORDER.length; i++) {
    const item = ORDER[i]!;
    const isCredits = item === 'credits';
    const isScores  = item === 'scores';
    const label = isCredits ? t('menu.credits') : isScores ? t('menu.scores') : modeLabel(item);
    const selected = i === s.index;
    const y = startY + i * lineH;
    const size = selected ? lineH * 0.85 : lineH * 0.6;
    ctx.font = `${size}px ${selected ? FONT_DISPLAY : FONT_BODY}`;
    const color = selected
      ? (isCredits ? `hsl(${50 + Math.sin(timeMs / 400) * 10} 100% 65%)`
        : isScores  ? `hsl(${180 + Math.sin(timeMs / 400) * 10} 100% 65%)`
        : `hsl(${(timeMs / 12) % 360} 100% 65%)`)
      : (isCredits ? 'rgba(255, 232, 85, 0.45)'
        : isScores  ? 'rgba(85, 255, 232, 0.45)'
        : 'rgba(230, 224, 255, 0.55)');

    if (selected) {
      const chev = Math.sin(timeMs / 120) * 4;
      drawChevron(ctx, w / 2 - lineH * 4 + chev, y, lineH * 0.32, 'right', color);
      drawChevron(ctx, w / 2 + lineH * 4 - chev, y, lineH * 0.32, 'left',  color);
    }

    drawNeonText(ctx, label, w / 2, y, color);
  }

  // BLURB + HI-SCORE — only for game mode items
  const currentItem = ORDER[s.index]!;
  if (currentItem !== 'credits' && currentItem !== 'scores') {
    const blurbFull = modeBlurb(currentItem);
    // On narrow screens take only the first sentence so it doesn't overflow
    const blurb = w < 460 ? (blurbFull.split('.')[0]! + '.') : blurbFull;
    ctx.font = `${Math.max(14, Math.min(26, w / 32))}px ${FONT_BODY}`;
    ctx.globalAlpha = 0.85;
    drawNeonText(ctx, blurb, w / 2, startY + ORDER.length * lineH + 24, '#88ddff');
    ctx.globalAlpha = 1;

    const hi = getHighScores(currentItem)[0];
    if (hi) {
      ctx.font = `${Math.max(14, Math.min(22, w / 50))}px ${FONT_BODY}`;
      ctx.fillStyle = '#ffe855';
      ctx.fillText(`${t('menu.hi')} ${hi.score}`, w / 2, startY + ORDER.length * lineH + 60);
    }
  } else if (currentItem === 'scores') {
    ctx.font = `${Math.max(16, Math.min(26, w / 38))}px ${FONT_BODY}`;
    ctx.globalAlpha = 0.7;
    drawNeonText(ctx, t('menu.scoresBlurb'), w / 2, startY + ORDER.length * lineH + 24, '#55ffe8');
    ctx.globalAlpha = 1;
  } else {
    ctx.font = `${Math.max(16, Math.min(26, w / 38))}px ${FONT_BODY}`;
    ctx.globalAlpha = 0.7;
    drawNeonText(ctx, t('menu.creditsBlurb'), w / 2, startY + ORDER.length * lineH + 24, '#ffe855');
    ctx.globalAlpha = 1;
  }

  // CONTROLS — only on wide screens; mobile uses the touch overlay hint
  if (w >= 460) {
    ctx.font = `${Math.max(14, Math.min(22, w / 50))}px ${FONT_BODY}`;
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#fff';
    ctx.fillText(t('menu.controls'), w / 2, h - 26);
    ctx.globalAlpha = 1;
  }

  drawLangToggle(ctx, w, h, 'menu', timeMs);

  ctx.restore();
}

function drawChevron(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, size: number,
  dir: 'left' | 'right', color: string,
): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = size * 0.6;
  ctx.beginPath();
  if (dir === 'right') {
    ctx.moveTo(cx - size, cy - size);
    ctx.lineTo(cx + size, cy);
    ctx.lineTo(cx - size, cy + size);
  } else {
    ctx.moveTo(cx + size, cy - size);
    ctx.lineTo(cx - size, cy);
    ctx.lineTo(cx + size, cy + size);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
