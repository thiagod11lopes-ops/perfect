// HUD: score, combo bar, mode label, power-up timers, time remaining.

import type { GameState } from '../engine/state';
import { FONT_BODY } from './fonts';
import { t } from '../i18n';
import { modeLabel } from '../gameplay/modes';
import { isPerfectEmbed, perfectEmbedTargetCoins } from '../embed/perfect';

export function renderHUD(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  w: number, h: number,
  timeMs: number,
  fieldY: number = 0,
): void {

  ctx.save();
  // Top bar: SCORE + MODE
  ctx.font = `${Math.max(20, Math.min(40, w / 28))}px ${FONT_BODY}`;
  ctx.textBaseline = 'top';

  const labelMode = modeLabel(state.mode);
  const score = state.stats.score;
  const embed = isPerfectEmbed();
  const target = perfectEmbedTargetCoins();

  const isMobile = w < 480;

  // Score (left) — embed shows halteres / moedas coletadas
  ctx.textAlign = 'left';
  if (embed) {
    drawNeonText(
      ctx,
      `HALTERES  ${state.stats.applesEaten}/${target}`,
      18,
      14,
      '#ffe855',
    );
  } else {
    drawNeonText(ctx, `${t('hud.score')}  ${score.toString().padStart(5, '0')}`, 18, 14, '#00ffd5');
  }

  // Mode: desktop = top right; mobile = centered in the band below the grid.
  ctx.font = `${Math.max(20, Math.min(40, w / 28))}px ${FONT_BODY}`;
  if (embed) {
    ctx.textAlign = 'right';
    drawNeonText(ctx, 'MISSÃO', w - 18, 14, '#ff5fae');
  } else if (isMobile && fieldY > 0) {
    // Grid is centered vertically, so its bottom edge sits at h - fieldY.
    const gridBottom = h - fieldY;
    ctx.textAlign = 'center';
    drawNeonText(ctx, labelMode, w / 2, (gridBottom + h) / 2 - 14, '#ff5fae');
  } else {
    ctx.textAlign = 'right';
    drawNeonText(ctx, labelMode, w - 18, 14, '#ff5fae');
  }

  // Combo: centered vertically between the top of the screen and the grid.
  // On desktop fieldY is small, so it clamps to the top (original behavior).
  if (state.combo.count > 0) {
    ctx.font = `${Math.max(28, Math.min(56, w / 18))}px ${FONT_BODY}`;
    ctx.textAlign = 'center';
    const pulse = 1 + Math.sin(timeMs / 90) * 0.06;
    // Block spans ~60px (text + gap + bar). Center it in the [0, fieldY] band.
    const comboY = Math.max(18, fieldY / 2 - 30);
    ctx.save();
    ctx.translate(w / 2, comboY);
    ctx.scale(pulse, pulse);
    drawNeonText(ctx, `${t('hud.combo')} ×${state.combo.multiplier}  (${state.combo.count})`, 0, 0,
      `hsl(${(state.combo.count * 30) % 360} 100% 65%)`);
    // Decay bar
    const barW = Math.min(280, w * 0.4);
    const frac = state.combo.decayMax > 0 ? state.combo.decayTicks / state.combo.decayMax : 0;
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(-barW / 2, 36, barW, 4);
    ctx.fillStyle = `hsl(${(state.combo.count * 30) % 360} 100% 60%)`;
    ctx.fillRect(-barW / 2, 36, barW * frac, 4);
    ctx.restore();
  }

  // Power-up icons (bottom left)
  const iconSize = 36;
  const startX = 18;
  const startY = h - iconSize - 18;
  for (let i = 0; i < state.powerups.length; i++) {
    const p = state.powerups[i]!;
    drawPowerUpIcon(ctx, p.id, startX + i * (iconSize + 10), startY, iconSize, p.remainingMs / p.totalMs);
  }

  // Timer (bottom right) for TimeAttack
  if (state.timeRemainingMs >= 0) {
    const seconds = Math.max(0, state.timeRemainingMs / 1000);
    const danger = seconds < 10;
    ctx.font = `${Math.max(24, Math.min(56, w / 18))}px ${FONT_BODY}`;
    ctx.textAlign = 'right';
    const blink = danger && Math.floor(timeMs / 200) % 2 === 0 ? 1 : 0.85;
    drawNeonText(ctx, `${seconds.toFixed(1)}`, w - 18, h - 60, danger ? `hsla(0, 100%, 65%, ${blink})` : '#ffe855');
  }

  // Best combo (occupies the same slot as the active combo so the eye lands
  // in one place; mobile centers it in the band above the grid, desktop
  // keeps the original top-center position).
  if (state.combo.count === 0 && state.combo.best > 0) {
    ctx.font = `${Math.max(14, Math.min(22, w / 50))}px ${FONT_BODY}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    const bestY = isMobile ? Math.max(18, fieldY / 2 - 8) : 18;
    ctx.fillText(`${t('hud.bestCombo')} ${state.combo.best}`, w / 2, bestY);
  }

  ctx.restore();
}

export function drawNeonText(
  ctx: CanvasRenderingContext2D,
  text: string, x: number, y: number, color: string,
): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.35;
  for (let i = 0; i < 2; i++) {
    ctx.fillText(text, x + (i === 0 ? -1 : 1), y);
    ctx.fillText(text, x, y + (i === 0 ? -1 : 1));
  }
  ctx.globalAlpha = 1;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawPowerUpIcon(
  ctx: CanvasRenderingContext2D,
  id: 'rainbow' | 'fire' | 'ice' | 'magnet',
  x: number, y: number, size: number, frac: number,
): void {
  ctx.save();
  // Background ring
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.stroke();
  // Timer arc
  ctx.strokeStyle = idColor(id);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
  ctx.stroke();
  // Letter
  ctx.fillStyle = idColor(id);
  ctx.font = `${size * 0.6}px ${FONT_BODY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(idGlyph(id), x + size / 2, y + size / 2 + 1);
  ctx.restore();
}

function idColor(id: string): string {
  switch (id) {
    case 'rainbow': return '#ff5fae';
    case 'fire':    return '#ff6622';
    case 'ice':     return '#88ddff';
    case 'magnet':  return '#cc88ff';
    default: return '#fff';
  }
}

function idGlyph(id: string): string {
  switch (id) {
    case 'rainbow': return 'R';
    case 'fire':    return 'F';
    case 'ice':     return 'I';
    case 'magnet':  return 'M';
    default: return '?';
  }
}
