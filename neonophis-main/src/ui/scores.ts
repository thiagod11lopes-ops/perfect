// High scores screen — tabbed view of all 4 modes' top 5.

import { drawNeonText } from '../render/ui';
import { FONT_BODY, FONT_DISPLAY } from '../render/fonts';
import { getHighScores } from '../storage/highscores';
import { modeLabel, type ModeId } from '../gameplay/modes';
import { t, getLang } from '../i18n';

export const SCORE_MODES: ModeId[] = ['classic', 'chaos', 'timeattack', 'relax'];

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

export function renderScores(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  timeMs: number,
  modeIndex: number,
): void {
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.textBaseline = 'middle';

  const idx = ((modeIndex % SCORE_MODES.length) + SCORE_MODES.length) % SCORE_MODES.length;
  const mode = SCORE_MODES[idx]!;
  const entries = getHighScores(mode);

  // Title
  const titleSize = Math.max(28, Math.min(80, w / 10));
  ctx.textAlign = 'center';
  ctx.font = `${titleSize}px ${FONT_DISPLAY}`;
  drawNeonText(ctx, t('scores.title'), w / 2, h * 0.12 + Math.sin(timeMs / 260) * 4, '#00ffd5');

  // Mode tab — animated rainbow label + chevrons
  const tabY = h * 0.25;
  const tabSize = Math.max(20, Math.min(52, w / 14));
  const modeColor = `hsl(${(timeMs / 14) % 360} 100% 65%)`;
  ctx.font = `${tabSize}px ${FONT_DISPLAY}`;
  ctx.textAlign = 'center';
  drawNeonText(ctx, modeLabel(mode), w / 2, tabY, modeColor);

  const chevSize = tabSize * 0.38;
  // Grow slowly with width but cap at 320 so chevrons stay near the mode label
  // on large screens. Min ~240 so they clear the score table columns (rankX = w/2-220).
  const chevPad  = Math.min(w * 0.25 + 60, 320);
  ctx.globalAlpha = 0.7 + 0.3 * Math.sin(timeMs / 200);
  drawChevron(ctx, w / 2 - chevPad, tabY, chevSize, 'left', modeColor);
  drawChevron(ctx, w / 2 + chevPad, tabY, chevSize, 'right', modeColor);
  ctx.globalAlpha = 1;

  // Progress dots
  const dotY = tabY + tabSize * 0.68;
  const dotGap = 16;
  const dotOrigin = w / 2 - (SCORE_MODES.length - 1) * dotGap / 2;
  for (let i = 0; i < SCORE_MODES.length; i++) {
    const active = i === idx;
    ctx.beginPath();
    ctx.arc(dotOrigin + i * dotGap, dotY, active ? 5 : 3, 0, Math.PI * 2);
    ctx.fillStyle = active ? modeColor : 'rgba(255,255,255,0.3)';
    ctx.shadowColor = active ? modeColor : 'transparent';
    ctx.shadowBlur = active ? 8 : 0;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Scores table
  const listY = h * 0.38;
  const rowH = Math.max(28, Math.min(50, h / 13));
  const fs = Math.max(13, Math.min(22, w / 42));
  ctx.font = `${fs}px ${FONT_BODY}`;

  if (entries.length === 0) {
    ctx.textAlign = 'center';
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = '#fff';
    ctx.fillText(t('scores.noEntries'), w / 2, listY + rowH);
    ctx.globalAlpha = 1;
  } else {
    const rankColors = ['#ffe855', '#c8d8ff', '#ff8844', 'rgba(255,255,255,0.65)', 'rgba(255,255,255,0.5)'];
    const wide = w >= 460;
    const rankX  = w / 2 - (wide ? 220 : 130);
    const nameX  = w / 2 - (wide ? 195 : 105);
    const scoreX = w / 2 + (wide ? 90 : 70);

    for (let i = 0; i < entries.length; i++) {
      const e = entries[i]!;
      const y = listY + i * rowH;
      const color = rankColors[i] ?? 'rgba(255,255,255,0.5)';

      ctx.font = `${fs}px ${FONT_BODY}`;

      ctx.textAlign = 'right';
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = color;
      ctx.fillText(`${i + 1}.`, rankX, y);
      ctx.globalAlpha = 1;

      ctx.textAlign = 'left';
      ctx.fillStyle = i === 0 ? '#ffe855' : 'rgba(255,255,255,0.85)';
      ctx.fillText((e.playerName || '---').padEnd(8, ' '), nameX, y);

      ctx.textAlign = 'right';
      drawNeonText(ctx, e.score.toString().padStart(6, ' '), scoreX, y, color);

      if (wide) {
        ctx.textAlign = 'right';
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = '#aaccff';
        ctx.font = `${fs * 0.82}px ${FONT_BODY}`;
        ctx.fillText(new Date(e.date).toLocaleDateString(getLang()), w / 2 + 215, y);
        ctx.globalAlpha = 1;
      }
    }
  }

  // Hint (desktop only; mobile has tc-scoresbar buttons)
  if (w >= 460) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.font = `${Math.max(13, Math.min(20, w / 50))}px ${FONT_BODY}`;
    ctx.globalAlpha = 0.45 + 0.2 * Math.sin(timeMs / 420);
    ctx.fillStyle = '#fff';
    ctx.fillText(t('scores.controls'), w / 2, h - 14);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}
