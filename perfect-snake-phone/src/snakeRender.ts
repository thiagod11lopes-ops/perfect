import type { Dir } from './bridge';
import type { Expression, GameState } from './game';
import { SNAKE_HUE } from './theme';

interface TrailPoint {
  x: number;
  y: number;
  hue: number;
}

const trail: TrailPoint[] = [];
const MAX_TRAIL = 26;

function cellSize(g: GameState['grid']): number {
  return Math.min(g.cellW, g.cellH);
}

function drawBodyPath(ctx: CanvasRenderingContext2D, px: number[], py: number[]): void {
  if (px.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(px[0]!, py[0]!);
  for (let i = 1; i < px.length; i++) {
    const dx = Math.abs(px[i]! - px[i - 1]!);
    const dy = Math.abs(py[i]! - py[i - 1]!);
    if (dx > 200 || dy > 200) ctx.moveTo(px[i]!, py[i]!);
    else ctx.lineTo(px[i]!, py[i]!);
  }
  ctx.stroke();
}

function drawTrail(ctx: CanvasRenderingContext2D, cell: number): void {
  if (trail.length < 2) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (let i = 1; i < trail.length; i++) {
    const a = trail[i - 1]!;
    const b = trail[i]!;
    const fade = 1 - i / trail.length;
    ctx.strokeStyle = `hsla(${a.hue}, 100%, 60%, ${fade * 0.35})`;
    ctx.lineWidth = cell * 0.55 * fade;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();
}

function facingOffsets(dir: Dir): { x: number; y: number } {
  switch (dir) {
    case 'UP': return { x: 0, y: -1 };
    case 'DOWN': return { x: 0, y: 1 };
    case 'LEFT': return { x: -1, y: 0 };
    case 'RIGHT': return { x: 1, y: 0 };
  }
}

function drawOpenEye(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  facing: { x: number; y: number },
): void {
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  const pupilR = r * 0.55;
  const px = x + facing.x * (r * 0.3);
  const py = y + facing.y * (r * 0.3);
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(px, py, pupilR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.arc(px - pupilR * 0.35, py - pupilR * 0.35, pupilR * 0.25, 0, Math.PI * 2);
  ctx.fill();
}

function drawClosedEye(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  facing: { x: number; y: number },
): void {
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  const ang = Math.atan2(facing.y, facing.x);
  ctx.beginPath();
  ctx.arc(x, y, r * 0.9, ang - Math.PI * 0.85, ang + Math.PI * 0.85);
  ctx.stroke();
}

function drawXEye(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - r * 0.7, y - r * 0.7);
  ctx.lineTo(x + r * 0.7, y + r * 0.7);
  ctx.moveTo(x + r * 0.7, y - r * 0.7);
  ctx.lineTo(x - r * 0.7, y + r * 0.7);
  ctx.stroke();
}

function drawHead(
  ctx: CanvasRenderingContext2D,
  hx: number,
  hy: number,
  cell: number,
  dir: Dir,
  expr: Expression,
  hue: number,
  timeMs: number,
  seed: number,
): void {
  const r = cell * 0.42;
  ctx.save();
  ctx.fillStyle = `hsl(${hue} 95% 55%)`;
  ctx.beginPath();
  ctx.arc(hx, hy, r, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(hx - r * 0.3, hy - r * 0.3, 0, hx, hy, r);
  g.addColorStop(0, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(hx, hy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const eyeOffset = facingOffsets(dir);
  const eyeR = cell * 0.13;
  const eyeDX = cell * 0.18;
  const px1 = hx + eyeOffset.x * eyeDX + -eyeOffset.y * eyeDX;
  const py1 = hy + eyeOffset.y * eyeDX + eyeOffset.x * eyeDX;
  const px2 = hx + eyeOffset.x * eyeDX + eyeOffset.y * eyeDX;
  const py2 = hy + eyeOffset.y * eyeDX + -eyeOffset.x * eyeDX;

  const blinkPeriod = 3500 + ((seed | 0) % 1500);
  const blinking = expr === 'idle' && timeMs % blinkPeriod < 110;

  if (expr === 'eat' || blinking) {
    drawClosedEye(ctx, px1, py1, eyeR, eyeOffset);
    drawClosedEye(ctx, px2, py2, eyeR, eyeOffset);
  } else if (expr === 'dead') {
    drawXEye(ctx, px1, py1, eyeR);
    drawXEye(ctx, px2, py2, eyeR);
  } else {
    drawOpenEye(ctx, px1, py1, eyeR, eyeOffset);
    drawOpenEye(ctx, px2, py2, eyeR, eyeOffset);
  }
}

export function renderSnake(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  alpha: number,
  timeMs: number,
): void {
  const cell = cellSize(state.grid);
  const baseHue = SNAKE_HUE;
  const px: number[] = [];
  const py: number[] = [];

  for (let i = 0; i < state.snake.length; i++) {
    const cur = state.snake[i]!;
    const prev = state.prevSnake[i] ?? cur;
    let dx = cur.x - prev.x;
    let dy = cur.y - prev.y;
    if (Math.abs(dx) > 1) dx = 0;
    if (Math.abs(dy) > 1) dy = 0;
    const ix = (prev.x + dx * alpha + 0.5) * state.grid.cellW;
    const iy = (prev.y + dy * alpha + 0.5) * state.grid.cellH;
    px.push(ix);
    py.push(iy);
  }

  if (px.length === 0) return;

  trail.unshift({ x: px[0]!, y: py[0]!, hue: baseHue });
  if (trail.length > MAX_TRAIL) trail.length = MAX_TRAIL;
  drawTrail(ctx, cell);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = `hsla(${baseHue}, 100%, 60%, 0.35)`;
  ctx.lineWidth = cell * 0.95;
  drawBodyPath(ctx, px, py);
  ctx.restore();

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = `hsl(${baseHue} 90% 50%)`;
  ctx.lineWidth = cell * 0.7;
  drawBodyPath(ctx, px, py);
  ctx.restore();

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = `hsla(${baseHue}, 100%, 80%, 0.55)`;
  ctx.lineWidth = cell * 0.28;
  drawBodyPath(ctx, px, py);
  ctx.restore();

  ctx.save();
  ctx.fillStyle = `hsla(${baseHue}, 100%, 92%, 0.6)`;
  for (let i = 2; i < px.length; i += 2) {
    ctx.beginPath();
    ctx.arc(px[i]!, py[i]!, cell * 0.06, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  drawHead(ctx, px[0]!, py[0]!, cell, state.dir, state.expression, baseHue, timeMs, state.seed);
}

export function clearSnakeTrail(): void {
  trail.length = 0;
}