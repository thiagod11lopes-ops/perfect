// Snake rendering — body with gradient + glow, head with eyes/expressions, rainbow trail.

import { type GameState, type Direction } from '../engine/state';
import { gridH, gridW } from '../engine/grid';

export type Expression =
  | 'idle'
  | 'eat'
  | 'combo'
  | 'fire'
  | 'ice'
  | 'panic'
  | 'dead';

interface TrailPoint { x: number; y: number; hue: number; }

const trail: TrailPoint[] = [];
const MAX_TRAIL = 26;

export function pushTrail(px: number, py: number, hue: number): void {
  trail.unshift({ x: px, y: py, hue });
  if (trail.length > MAX_TRAIL) trail.length = MAX_TRAIL;
}

export function clearTrail(): void { trail.length = 0; }

export function renderSnake(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cell: number,
  alpha: number,
  timeMs: number,
  expression: Expression,
): { headPx: number; headPy: number } {
  const s = state.snake;

  // Determine effective hue for body (theme by skin / powerups)
  const skin = state.cosmetics.skin;
  const fireOn = state.powerups.some(p => p.id === 'fire');
  const iceOn  = state.powerups.some(p => p.id === 'ice');
  const rainbowOn = state.powerups.some(p => p.id === 'rainbow');

  let baseHue = 145;     // green
  if (skin === 'gold')   baseHue = 48;
  if (skin === 'matrix') baseHue = 120;
  if (fireOn)            baseHue = 18;
  if (iceOn)             baseHue = 195;

  // Build interpolated body positions in pixels
  const px: number[] = [];
  const py: number[] = [];
  for (let i = 0; i < s.body.length; i++) {
    const cur = s.body[i]!;
    const prev = s.prevBody[i] ?? cur;
    let dx = cur.x - prev.x;
    let dy = cur.y - prev.y;
    // Wrap-aware interpolation: if jumped >1 cell, snap (passwall warp)
    if (Math.abs(dx) > 1) dx = 0;
    if (Math.abs(dy) > 1) dy = 0;
    const ix = (prev.x + dx * alpha + 0.5) * cell;
    const iy = (prev.y + dy * alpha + 0.5) * cell;
    px.push(ix);
    py.push(iy);
  }

  // Trail (last head position)
  const headHue = rainbowOn ? (timeMs / 6) % 360 : baseHue;
  pushTrail(px[0]!, py[0]!, headHue);

  drawTrail(ctx, cell);

  // Glow pass — outer
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = `hsla(${headHue}, 100%, 60%, 0.35)`;
  ctx.lineWidth = cell * 0.95;
  drawBodyPath(ctx, px, py);
  ctx.restore();

  // Core body
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = rainbowOn
    ? `hsl(${(timeMs / 4) % 360} 100% 60%)`
    : `hsl(${baseHue} 90% 50%)`;
  ctx.lineWidth = cell * 0.7;
  drawBodyPath(ctx, px, py);
  ctx.restore();

  // Inner highlight
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = `hsla(${baseHue}, 100%, 80%, 0.55)`;
  ctx.lineWidth = cell * 0.28;
  drawBodyPath(ctx, px, py);
  ctx.restore();

  // Scales / segment dots — draw a small bright dot every couple of segments
  ctx.save();
  ctx.fillStyle = `hsla(${baseHue}, 100%, 92%, 0.6)`;
  for (let i = 2; i < px.length; i += 2) {
    ctx.beginPath();
    ctx.arc(px[i]!, py[i]!, cell * 0.06, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Head: cap + eyes + expression
  const headPx = px[0]!, headPy = py[0]!;
  drawHead(ctx, headPx, headPy, cell, s.dir, expression, baseHue, timeMs, state);

  // Hat (cosmetic)
  if (state.cosmetics.hat !== 'none') {
    drawHat(ctx, headPx, headPy, cell, s.dir, state.cosmetics.hat);
  }

  // Relax mode: tail glows red as a "don't bite me" warning.
  // Pulse speed, glow radius, hue purity and brightness all scale with
  // bgIntensity (0..1), which mirrors the music energy level.
  if (state.mode === 'relax' && px.length > 1) {
    const tailX = px[px.length - 1]!;
    const tailY = py[py.length - 1]!;
    const ity = state.bgIntensity;            // 0 = calm, 1 = frantic
    const period = 320 - ity * 210;           // 320ms calm → ~110ms frantic
    const pulse = 0.5 + 0.5 * Math.sin(timeMs / period);
    const hue   = 10 - ity * 10;             // orange-red → pure red
    const outer = 0.4 + ity * 0.55;          // alpha envelope
    const inner = 0.75 + ity * 0.25;
    const lOuter = 55 + ity * 25;            // lightness: 55% → 80%
    const lInner = 65 + ity * 30;            // lightness: 65% → 95%
    const rOuter = cell * (0.52 + ity * 0.20); // glow grows with intensity

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `hsla(${hue}, 100%, ${lOuter}%, ${pulse * outer})`;
    ctx.beginPath();
    ctx.arc(tailX, tailY, rOuter, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = `hsla(${hue + 8}, 100%, ${lInner}%, ${pulse * inner})`;
    ctx.beginPath();
    ctx.arc(tailX, tailY, cell * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  return { headPx, headPy };
}

function drawBodyPath(ctx: CanvasRenderingContext2D, px: number[], py: number[]): void {
  if (px.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(px[0]!, py[0]!);
  for (let i = 1; i < px.length; i++) {
    // Avoid drawing wrap-around lines that span the screen
    const dx = Math.abs(px[i]! - px[i - 1]!);
    const dy = Math.abs(py[i]! - py[i - 1]!);
    if (dx > 200 || dy > 200) {
      ctx.moveTo(px[i]!, py[i]!);
    } else {
      ctx.lineTo(px[i]!, py[i]!);
    }
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
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    if (dx > 200 || dy > 200) continue;
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

function drawHead(
  ctx: CanvasRenderingContext2D,
  hx: number, hy: number,
  cell: number,
  dir: Direction,
  expr: Expression,
  hue: number,
  timeMs: number,
  state: GameState,
): void {
  const r = cell * 0.42;

  // Body cap circle
  ctx.save();
  ctx.fillStyle = `hsl(${hue} 95% 55%)`;
  ctx.beginPath();
  ctx.arc(hx, hy, r, 0, Math.PI * 2);
  ctx.fill();
  // Light gradient on top
  const g = ctx.createRadialGradient(hx - r * 0.3, hy - r * 0.3, 0, hx, hy, r);
  g.addColorStop(0, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(hx, hy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Eyes
  const eyeOffset = facingOffsets(dir);
  const eyeR = cell * 0.13;
  const eyeDX = cell * 0.18;

  const isAlmostDying = nearWall(state) && state.snake.alive && expr !== 'dead';
  const blinkPeriod = 3500 + ((state.seed | 0) % 1500);
  const blinking = expr === 'idle' && (timeMs % blinkPeriod) < 110;

  // Eye positions perpendicular to direction
  const px1 = hx + eyeOffset.x * eyeDX + (-eyeOffset.y * eyeDX);
  const py1 = hy + eyeOffset.y * eyeDX + ( eyeOffset.x * eyeDX);
  const px2 = hx + eyeOffset.x * eyeDX + ( eyeOffset.y * eyeDX);
  const py2 = hy + eyeOffset.y * eyeDX + (-eyeOffset.x * eyeDX);

  if (expr === 'eat' || blinking) {
    drawClosedEye(ctx, px1, py1, eyeR, eyeOffset);
    drawClosedEye(ctx, px2, py2, eyeR, eyeOffset);
  } else if (expr === 'combo') {
    drawStarEye(ctx, px1, py1, eyeR, timeMs, state.combo.count);
    drawStarEye(ctx, px2, py2, eyeR, timeMs, state.combo.count);
  } else if (expr === 'dead') {
    drawXEye(ctx, px1, py1, eyeR);
    drawXEye(ctx, px2, py2, eyeR);
    // tongue out
    ctx.fillStyle = '#ff4488';
    ctx.fillRect(hx + eyeOffset.x * (r + 4), hy + eyeOffset.y * (r + 4), 4, 4);
  } else {
    let pupilHue = 0;
    let pupilColor = '#000';
    if (expr === 'fire')   pupilColor = '#ff3300';
    if (expr === 'ice')    pupilColor = '#aaeeff';
    if (expr === 'panic')  pupilColor = '#000';
    drawOpenEye(ctx, px1, py1, eyeR, eyeOffset, pupilColor, isAlmostDying ? 'panic' : 'normal', expr === 'fire');
    drawOpenEye(ctx, px2, py2, eyeR, eyeOffset, pupilColor, isAlmostDying ? 'panic' : 'normal', expr === 'fire');
    void pupilHue;
  }
}

function facingOffsets(dir: Direction): { x: number; y: number } {
  switch (dir) {
    case 'UP':    return { x:  0, y: -1 };
    case 'DOWN':  return { x:  0, y:  1 };
    case 'LEFT':  return { x: -1, y:  0 };
    case 'RIGHT': return { x:  1, y:  0 };
  }
}

function drawOpenEye(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, r: number,
  facing: { x: number; y: number },
  pupilColor: string,
  state: 'normal' | 'panic',
  brow: boolean,
): void {
  // Sclera
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  // Pupil — looks toward direction
  const pupilR = state === 'panic' ? r * 0.75 : r * 0.55;
  const px = x + facing.x * (r * 0.3);
  const py = y + facing.y * (r * 0.3);
  ctx.fillStyle = pupilColor;
  ctx.beginPath();
  ctx.arc(px, py, pupilR, 0, Math.PI * 2);
  ctx.fill();
  // Highlight
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.arc(px - pupilR * 0.35, py - pupilR * 0.35, pupilR * 0.25, 0, Math.PI * 2);
  ctx.fill();
  // Brow (fire mode) — angry V
  if (brow) {
    ctx.strokeStyle = '#aa0000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - r, y - r * 0.7);
    ctx.lineTo(x + r * 0.4, y - r * 1.4);
    ctx.stroke();
  }
}

function drawClosedEye(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, facing: { x: number; y: number }): void {
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  // U shape opening toward facing direction
  const ang = Math.atan2(facing.y, facing.x);
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

function drawStarEye(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, timeMs: number, combo: number): void {
  const hue = (timeMs / 5 + combo * 30) % 360;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(timeMs / 200);
  ctx.fillStyle = `hsl(${hue} 100% 65%)`;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const ang = (Math.PI * i) / 4 - Math.PI / 2;
    const rad = i % 2 === 0 ? r * 1.2 : r * 0.45;
    if (i === 0) ctx.moveTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
    else ctx.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function nearWall(state: GameState): boolean {
  if (state.passWalls) return false;
  const h = state.snake.body[0];
  if (!h) return false;
  const gW = gridW();
  const gH = gridH();
  return h.x <= 1 || h.x >= gW - 2 || h.y <= 1 || h.y >= gH - 2;
}

function drawHat(
  ctx: CanvasRenderingContext2D,
  hx: number, hy: number,
  cell: number,
  dir: Direction,
  hat: 'cowboy' | 'crown' | 'shades',
): void {
  ctx.save();
  ctx.translate(hx, hy);
  // rotate so hat sits on top relative to facing direction
  const ang = dirToAngle(dir);
  ctx.rotate(ang + Math.PI / 2);
  if (hat === 'cowboy') {
    ctx.fillStyle = '#9a5a1c';
    ctx.beginPath();
    ctx.ellipse(0, -cell * 0.4, cell * 0.6, cell * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7a3f10';
    ctx.fillRect(-cell * 0.22, -cell * 0.6, cell * 0.44, cell * 0.22);
    ctx.beginPath();
    ctx.ellipse(0, -cell * 0.6, cell * 0.22, cell * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (hat === 'crown') {
    ctx.fillStyle = '#ffd633';
    ctx.beginPath();
    ctx.moveTo(-cell * 0.32, -cell * 0.32);
    ctx.lineTo(-cell * 0.18, -cell * 0.55);
    ctx.lineTo(-cell * 0.06, -cell * 0.38);
    ctx.lineTo( 0,            -cell * 0.6);
    ctx.lineTo( cell * 0.06, -cell * 0.38);
    ctx.lineTo( cell * 0.18, -cell * 0.55);
    ctx.lineTo( cell * 0.32, -cell * 0.32);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ff3366';
    ctx.beginPath();
    ctx.arc(-cell * 0.18, -cell * 0.42, cell * 0.05, 0, Math.PI * 2);
    ctx.arc( cell * 0.18, -cell * 0.42, cell * 0.05, 0, Math.PI * 2);
    ctx.arc( 0,            -cell * 0.48, cell * 0.05, 0, Math.PI * 2);
    ctx.fill();
  } else if (hat === 'shades') {
    ctx.fillStyle = '#000';
    ctx.fillRect(-cell * 0.3, -cell * 0.05, cell * 0.6, cell * 0.06);
    ctx.beginPath();
    ctx.arc(-cell * 0.16, -cell * 0.05, cell * 0.13, 0, Math.PI * 2);
    ctx.arc( cell * 0.16, -cell * 0.05, cell * 0.13, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function dirToAngle(dir: Direction): number {
  switch (dir) {
    case 'RIGHT': return 0;
    case 'DOWN':  return Math.PI / 2;
    case 'LEFT':  return Math.PI;
    case 'UP':    return -Math.PI / 2;
  }
}
