import type { GameState } from './game';
import { FOOD_CELLS } from './game';
import { clearSnakeTrail, renderSnake } from './snakeRender';
import { drawPlayfieldBg } from './playfieldBg';
import { BORDER_GLOW, PERFECT_ORANGE, PERFECT_ORANGE_HOT } from './theme';

const GRID_LINE = 'rgba(140, 80, 200, 0.12)';
const DUMB_HUE = 48;

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  rad: number,
): void {
  const r = Math.min(rad, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawNeonDumbbell(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  cellW: number,
  cellH: number,
  timeSec: number,
): void {
  const r = Math.min(cellW, cellH) * 0.36;
  const barW = r * 1.85;
  const barH = Math.max(2, r * 0.22);
  const plateW = r * 0.55;
  const plateH = r * 0.95;
  const pulse = 1 + Math.sin(timeSec * 5) * 0.04;
  const edge = `hsl(${DUMB_HUE}, 100%, 78%)`;
  const core = `hsl(${DUMB_HUE}, 95%, 58%)`;

  ctx.save();
  ctx.shadowColor = `hsla(${DUMB_HUE}, 100%, 62%, 0.55)`;
  ctx.shadowBlur = r * 0.9;

  const drawPlate = (px: number) => {
    const grad = ctx.createLinearGradient(px, cy - plateH / 2, px + plateW, cy + plateH / 2);
    grad.addColorStop(0, edge);
    grad.addColorStop(0.45, core);
    grad.addColorStop(1, `hsl(${DUMB_HUE}, 90%, 38%)`);
    ctx.fillStyle = grad;
    roundRect(ctx, px, cy - (plateH * pulse) / 2, plateW, plateH * pulse, plateW * 0.22);
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.lineWidth = Math.max(1, r * 0.08);
    ctx.stroke();
  };

  const barX = cx - barW / 2;
  ctx.fillStyle = `hsl(${DUMB_HUE}, 80%, 72%)`;
  roundRect(ctx, barX, cy - barH / 2, barW, barH, barH / 2);
  ctx.fill();
  drawPlate(barX - plateW * 0.72);
  drawPlate(barX + barW - plateW * 0.28);
  ctx.shadowBlur = 0;
  ctx.restore();
}

export function paint(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  time: number,
  alpha: number,
): void {
  const g = state.grid;
  const { cssW, cssH, cols, rows, cellW, cellH } = g;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  ctx.fillStyle = '#0f0818';
  ctx.fillRect(0, 0, cssW, cssH);

  const p = g.play;
  const bx = p.minX * cellW;
  const by = p.minY * cellH;
  const bw = (p.maxX - p.minX + 1) * cellW;
  const bh = (p.maxY - p.minY + 1) * cellH;
  drawPlayfieldBg(ctx, bx, by, bw, bh);

  ctx.strokeStyle = GRID_LINE;
  ctx.lineWidth = 1;
  for (let x = 0; x <= cols; x++) {
    const px = x * cellW;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, cssH);
    ctx.stroke();
  }
  for (let y = 0; y <= rows; y++) {
    const py = y * cellH;
    ctx.beginPath();
    ctx.moveTo(0, py);
    ctx.lineTo(cssW, py);
    ctx.stroke();
  }

  ctx.save();
  ctx.strokeStyle = PERFECT_ORANGE_HOT;
  ctx.lineWidth = Math.max(2, Math.min(cellW, cellH) * 0.14);
  ctx.shadowColor = BORDER_GLOW;
  ctx.shadowBlur = 10;
  ctx.strokeRect(bx + ctx.lineWidth / 2, by + ctx.lineWidth / 2, bw - ctx.lineWidth, bh - ctx.lineWidth);
  ctx.shadowBlur = 0;
  ctx.restore();

  const fx0 = state.food.x * cellW;
  const fy0 = state.food.y * cellH;
  const fW = cellW * FOOD_CELLS;
  const fH = cellH * FOOD_CELLS;
  const bounce = Math.sin(time / 180) * Math.min(cellW, cellH) * 0.04;
  drawNeonDumbbell(
    ctx,
    fx0 + fW / 2,
    fy0 + fH / 2 + bounce,
    fW,
    fH,
    time / 1000,
  );

  renderSnake(ctx, state, alpha, time);

  ctx.font = `bold ${Math.max(12, Math.min(18, cssW / 28))}px system-ui,sans-serif`;
  ctx.fillStyle = PERFECT_ORANGE_HOT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`HALTERES ${state.collected}/${state.cfg.targetCoins}`, 10, 8);
  ctx.textAlign = 'right';
  const sec = Math.max(0, state.timeLeftMs / 1000);
  ctx.fillStyle = sec < 10 ? '#ff6b8a' : PERFECT_ORANGE;
  ctx.fillText(`${sec.toFixed(0)}s`, cssW - 10, 8);

  if (state.userPaused && state.alive && !state.paused && state.countdownMs <= 0) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.max(16, cssW / 18)}px system-ui,sans-serif`;
    ctx.fillStyle = 'rgba(255, 138, 26, 0.88)';
    ctx.shadowColor = 'rgba(240, 112, 0, 0.45)';
    ctx.shadowBlur = 12;
    ctx.fillText('PAUSADO', cssW / 2, cssH * 0.42);
    ctx.shadowBlur = 0;
  }

  if (state.paused && state.collected >= state.cfg.targetCoins) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.max(20, cssW / 14)}px system-ui,sans-serif`;
    ctx.fillStyle = 'rgba(80, 255, 160, 0.92)';
    ctx.shadowColor = 'rgba(80, 255, 160, 0.5)';
    ctx.shadowBlur = 16;
    ctx.fillText('MISSÃO OK!', cssW / 2, cssH / 2);
    ctx.shadowBlur = 0;
  }
}

export { clearSnakeTrail };