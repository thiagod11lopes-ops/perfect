// Main render pipeline. Owns the game canvas; orchestrates layers per §6.

import { type GameState } from '../engine/state';
import { gridH, gridW } from '../engine/grid';
import { renderFoods } from './foodRenderer';
import { renderSnake, type Expression, clearTrail } from './snakeRenderer';
import { renderParticles } from '../fx/particles';
import { applyShake, getTrauma } from '../fx/screenshake';
import { renderFlashes, getZoomScale } from '../fx/flash';
import { renderFloating } from '../fx/floatingText';
import { renderHUD } from './ui';
import { FONT_BODY, FONT_DISPLAY } from './fonts';

let mainCanvas: HTMLCanvasElement | null = null;
let mainCtx: CanvasRenderingContext2D | null = null;

export interface ViewMetrics {
  cssWidth: number;
  cssHeight: number;
  cell: number;
  cellW: number;
  cellH: number;
  fieldX: number;
  fieldY: number;
  fieldW: number;
  fieldH: number;
  dpr: number;
}

let metrics: ViewMetrics = {
  cssWidth: 0, cssHeight: 0, cell: 24, cellW: 24, cellH: 24,
  fieldX: 0, fieldY: 0, fieldW: 0, fieldH: 0, dpr: 1,
};

let viewPanX = 0;
let viewPanY = 0;

function clampViewPan(): void {
  const m = metrics;
  const minX = -m.fieldX;
  const maxX = m.cssWidth - m.fieldX - m.fieldW;
  const minY = -m.fieldY;
  const maxY = m.cssHeight - m.fieldY - m.fieldH;
  if (maxX < minX) {
    viewPanX = 0;
  } else {
    viewPanX = Math.max(minX, Math.min(maxX, viewPanX));
  }
  if (maxY < minY) {
    viewPanY = 0;
  } else {
    viewPanY = Math.max(minY, Math.min(maxY, viewPanY));
  }
}

export function resetViewPan(): void {
  viewPanX = 0;
  viewPanY = 0;
}

export function addViewPan(dx: number, dy: number): void {
  viewPanX += dx;
  viewPanY += dy;
  clampViewPan();
}

export function initRenderer(canvas: HTMLCanvasElement): void {
  mainCanvas = canvas;
  mainCtx = canvas.getContext('2d', { alpha: true })!;
}

export function resizeRenderer(cssW: number, cssH: number): void {
  if (!mainCanvas || !mainCtx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  mainCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const gW = gridW();
  const gH = gridH();
  const hudRows = 3;
  const canvasW = Math.max(1, cssW);
  const canvasH = Math.max(1, cssH);

  let cell = Math.floor(Math.min(canvasW / (gW + 1), canvasH / (gH + hudRows)));
  const maxFit = Math.floor(Math.min(canvasW / gW, canvasH / gH));
  if (!Number.isFinite(cell) || cell < 1) cell = maxFit;
  cell = Math.max(6, Math.min(cell, maxFit > 0 ? maxFit : cell));

  const fieldW = cell * gW;
  const fieldH = cell * gH;
  const outW = canvasW;
  const outH = canvasH;
  const fieldX = Math.floor((canvasW - fieldW) / 2);
  const fieldY = Math.floor((canvasH - fieldH) / 2);

  mainCanvas.style.width = `${outW}px`;
  mainCanvas.style.height = `${outH}px`;
  mainCanvas.width = Math.floor(outW * dpr);
  mainCanvas.height = Math.floor(outH * dpr);

  metrics = {
    cssWidth: outW,
    cssHeight: outH,
    cell,
    cellW: cell,
    cellH: cell,
    fieldX,
    fieldY,
    fieldW,
    fieldH,
    dpr,
  };
  clearTrail();
  clampViewPan();
}

export function getMetrics(): ViewMetrics { return metrics; }

export function renderFrame(
  state: GameState,
  alpha: number,
  timeMs: number,
  expr: Expression,
): void {
  if (!mainCtx) return;
  const ctx = mainCtx;
  const m = metrics;

  ctx.clearRect(0, 0, m.cssWidth, m.cssHeight);

  const scale = getZoomScale();
  ctx.save();
  ctx.translate(m.cssWidth / 2, m.cssHeight / 2);
  ctx.scale(scale, scale);
  ctx.translate(-m.cssWidth / 2, -m.cssHeight / 2);

  ctx.save();
  applyShake(ctx, 1 / 60);

  ctx.translate(m.fieldX + viewPanX, m.fieldY + viewPanY);

  drawGrid(ctx, m, timeMs);
  renderFoods(ctx, state, m.cell, timeMs);

  const interval = Math.max(1, Math.round(state.moveIntervalTicks / state.speedMultiplier));
  const snakeAlpha = state.snake.alive
    ? Math.min(1, (state.ticksSinceMove + alpha) / interval)
    : 1;
  renderSnake(ctx, state, m.cell, snakeAlpha, timeMs, expr);

  renderParticles(ctx);
  renderFloating(ctx, FONT_BODY);
  drawFieldBorder(ctx, m, timeMs, state);

  ctx.restore();
  ctx.restore();

  renderHUD(ctx, state, m.cssWidth, m.cssHeight, timeMs, m.fieldY);
  renderFlashes(ctx, m.cssWidth, m.cssHeight);
  if (state.paused) drawPauseOverlay(ctx, m.cssWidth, m.cssHeight, timeMs);

  const t = getTrauma();
  if (t > 0.05) {
    ctx.save();
    ctx.fillStyle = `rgba(255, 30, 60, ${t * 0.25})`;
    ctx.fillRect(0, 0, m.cssWidth, m.cssHeight);
    ctx.restore();
  }
}

function drawGrid(ctx: CanvasRenderingContext2D, m: ViewMetrics, timeMs: number): void {
  ctx.save();
  const gW = gridW();
  const gH = gridH();
  ctx.fillStyle = 'rgba(10, 4, 32, 0.55)';
  ctx.fillRect(0, 0, m.fieldW, m.fieldH);
  ctx.strokeStyle = `hsla(280, 90%, 70%, ${0.06 + Math.sin(timeMs / 600) * 0.02})`;
  ctx.lineWidth = 1;
  for (let i = 1; i < gW; i++) {
    ctx.beginPath();
    ctx.moveTo(i * m.cell, 0);
    ctx.lineTo(i * m.cell, m.fieldH);
    ctx.stroke();
  }
  for (let j = 1; j < gH; j++) {
    ctx.beginPath();
    ctx.moveTo(0, j * m.cell);
    ctx.lineTo(m.fieldW, j * m.cell);
    ctx.stroke();
  }
  ctx.restore();
}

function drawFieldBorder(ctx: CanvasRenderingContext2D, m: ViewMetrics, timeMs: number, state: GameState): void {
  ctx.save();
  const baseHue = state.cosmetics.discoMode ? (timeMs / 8) % 360 : 290;
  const pulse = 0.5 + Math.sin(timeMs / 300) * 0.5;

  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = `hsla(${baseHue}, 100%, 60%, ${0.45 + pulse * 0.25})`;
  ctx.lineWidth = 3;
  ctx.shadowColor = `hsl(${baseHue}, 100%, 60%)`;
  ctx.shadowBlur = 12;
  ctx.strokeRect(-1, -1, m.fieldW + 2, m.fieldH + 2);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = `hsla(${(baseHue + 60) % 360}, 100%, 70%, 0.35)`;
  ctx.lineWidth = 1;
  ctx.strokeRect(2, 2, m.fieldW - 4, m.fieldH - 4);
  ctx.restore();
}

function drawPauseOverlay(ctx: CanvasRenderingContext2D, w: number, h: number, timeMs: number): void {
  ctx.save();
  ctx.fillStyle = 'rgba(5, 3, 15, 0.7)';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#fff';
  ctx.font = `${Math.max(40, Math.min(96, w / 12))}px ${FONT_DISPLAY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const pulse = 0.7 + Math.sin(timeMs / 200) * 0.3;
  ctx.globalAlpha = pulse;
  ctx.fillText('PAUSED', w / 2, h / 2 - 30);
  ctx.font = `${Math.max(16, Math.min(28, w / 30))}px ${FONT_BODY}`;
  ctx.globalAlpha = 0.85;
  const pauseHint = w >= 460 ? 'P / SPACE  RESUME      ESC  MAIN MENU' : 'P  RESUME   ESC  MENU';
  ctx.fillText(pauseHint, w / 2, h / 2 + 30);
  ctx.restore();
}