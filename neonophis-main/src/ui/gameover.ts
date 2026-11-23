// Game over screen with stats, optional name entry, and high scores.

import type { GameState } from '../engine/state';
import { drawNeonText } from '../render/ui';
import { getHighScores } from '../storage/highscores';
import { FONT_BODY, FONT_DISPLAY } from '../render/fonts';
import { t, getLang } from '../i18n';
import { modeLabel } from '../gameplay/modes';

export interface NameEntryState {
  name: string;
}

const NAME_SLOTS = 8;
const ALLOWED_CHARS = /^[A-Z0-9 ]$/;

export function isAllowedChar(char: string): boolean {
  return ALLOWED_CHARS.test(char.toUpperCase());
}

export function renderGameOver(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  w: number, h: number,
  timeMs: number,
  isNewHigh: boolean,
  nameEntry: NameEntryState | null,
): void {
  ctx.save();
  ctx.fillStyle = 'rgba(8, 4, 22, 0.78)';
  ctx.fillRect(0, 0, w, h);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const sineFactor = Math.sin(timeMs / 200) * 3;
  ctx.font = `${Math.max(56, Math.min(140, w / 9))}px ${FONT_DISPLAY}`;
  drawNeonText(ctx, t('over.title'), w / 2, h * 0.22 + sineFactor, '#ff3366');

  if (isNewHigh) {
    ctx.font = `${Math.max(28, Math.min(60, w / 22))}px ${FONT_DISPLAY}`;
    const blink = Math.floor(timeMs / 200) % 2 === 0 ? 1 : 0.5;
    ctx.globalAlpha = blink;
    drawNeonText(ctx, t('over.newHigh'), w / 2, h * 0.32, '#ffe855');
    ctx.globalAlpha = 1;
  }

  // Stats — cap lineH by width too so labels like "BEST COMBO" don't clip left
  const lineH = Math.max(24, Math.min(46, Math.min(h / 18, w / 11)));
  const startY = h * 0.42;
  ctx.font = `${lineH * 0.85}px ${FONT_BODY}`;

  const seconds = Math.max(0, (state.stats.endTimeMs - state.stats.startTimeMs) / 1000);
  const lines: { label: string; value: string; color: string }[] = [
    { label: t('over.score'),      value: state.stats.score.toString(),         color: '#00ffd5' },
    { label: t('over.apples'),     value: state.stats.applesEaten.toString(),   color: '#ff8855' },
    { label: t('over.powerups'),   value: state.stats.powerupsEaten.toString(), color: '#ff5fae' },
    { label: t('over.bestCombo'),  value: state.stats.highestCombo.toString(),  color: '#ffe855' },
    { label: t('over.survived'),   value: `${seconds.toFixed(1)}s`,             color: '#88ddff' },
  ];
  for (let i = 0; i < lines.length; i++) {
    const { label, value, color } = lines[i]!;
    const y = startY + i * lineH;
    ctx.textAlign = 'right';
    drawNeonText(ctx, label, w / 2 - 12, y, 'rgba(255,255,255,0.6)');
    ctx.textAlign = 'left';
    drawNeonText(ctx, value, w / 2 + 12, y, color);
  }

  const belowStatsY = startY + lines.length * lineH + 16;

  if (nameEntry !== null) {
    // ── Name entry prompt ────────────────────────────────────────────────
    const promptFontSize = Math.max(16, Math.min(26, w / 44));
    ctx.font = `${promptFontSize}px ${FONT_BODY}`;
    ctx.textAlign = 'center';
    const namePrompt = w >= 460
      ? `${modeLabel(state.mode)}  ${t('over.hiScores')}  —  ${t('over.enterYourName')}`
      : t('over.enterYourName');
    drawNeonText(ctx, namePrompt, w / 2, belowStatsY + promptFontSize, '#fff');

    // Slots + keyboard hint — only on desktop; mobile uses the tc-name HTML input
    // which already shows label + native input + OK button at the bottom.
    if (w >= 460) {
      const slotSize = Math.max(28, Math.min(44, w / 22));
      const totalW = NAME_SLOTS * slotSize + (NAME_SLOTS - 1) * 4;
      const slotX = w / 2 - totalW / 2;
      const slotY = belowStatsY + promptFontSize * 2 + 8;

      ctx.font = `${Math.floor(slotSize * 0.65)}px ${FONT_BODY}`;
      for (let i = 0; i < NAME_SLOTS; i++) {
        const x = slotX + i * (slotSize + 4);
        const isCursor = i === nameEntry.name.length;
        const cursorOn = isCursor && Math.floor(timeMs / 500) % 2 === 0;

        ctx.fillStyle = cursorOn ? 'rgba(255,232,85,0.25)' : 'rgba(255,255,255,0.08)';
        ctx.fillRect(x, slotY, slotSize, slotSize);
        ctx.strokeStyle = cursorOn ? '#ffe855' : (isCursor ? 'rgba(255,232,85,0.6)' : 'rgba(255,255,255,0.25)');
        ctx.lineWidth = cursorOn ? 2 : 1;
        ctx.strokeRect(x, slotY, slotSize, slotSize);

        const char = nameEntry.name[i];
        if (char) {
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#fff';
          ctx.fillText(char, x + slotSize / 2, slotY + slotSize / 2 + 1);
        }
      }

      ctx.font = `${Math.max(14, Math.min(20, w / 50))}px ${FONT_BODY}`;
      ctx.textAlign = 'center';
      ctx.globalAlpha = 0.7 + Math.sin(timeMs / 300) * 0.3;
      ctx.fillStyle = '#fff';
      ctx.textBaseline = 'middle';
      ctx.fillText(t('over.nameHint'), w / 2, slotY + slotSize + 20);
      ctx.globalAlpha = 1;
    }
  } else {
    // ── High scores list ─────────────────────────────────────────────────
    const scoreFontSize = Math.max(13, Math.min(20, w / 52));
    ctx.font = `${scoreFontSize}px ${FONT_BODY}`;
    ctx.textAlign = 'center';
    drawNeonText(ctx, `${modeLabel(state.mode)}  ${t('over.hiScores')}`, w / 2, belowStatsY + scoreFontSize * 0.6, '#fff');

    const top = getHighScores(state.mode).slice(0, 5);
    const rowH = scoreFontSize * 1.6;
    for (let i = 0; i < top.length; i++) {
      const e = top[i]!;
      const y = belowStatsY + scoreFontSize * 1.8 + i * rowH;
      const name = (e.playerName || '---').padEnd(8, ' ');
      const score = e.score.toString().padStart(6, ' ');
      const date = new Date(e.date).toLocaleDateString(getLang());
      ctx.fillStyle = i === 0 ? '#ffe855' : 'rgba(255,255,255,0.7)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const row = w >= 460
        ? `${i + 1}.  ${name}  ${score}   ${date}`
        : `${i + 1}.  ${name}  ${score}`;
      ctx.fillText(row, w / 2, y);
    }

    // Hint — on mobile the touch overlay provides PLAY AGAIN / MENU buttons
    if (w >= 460) {
      ctx.font = `${Math.max(20, Math.min(34, w / 30))}px ${FONT_BODY}`;
      const blink = 0.7 + Math.sin(timeMs / 200) * 0.3;
      ctx.globalAlpha = blink;
      drawNeonText(ctx, t('over.playAgain'), w / 2, h - 60, '#fff');
      ctx.globalAlpha = 0.6;
      ctx.font = `${Math.max(16, Math.min(24, w / 40))}px ${FONT_BODY}`;
      ctx.fillStyle = '#fff';
      ctx.fillText(t('over.mainMenu'), w / 2, h - 30);
      ctx.globalAlpha = 1;
    }
  }

  ctx.restore();
}
