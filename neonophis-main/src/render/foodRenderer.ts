// Comida cartoon, com bounce, glow e formas distintas.

import type { FoodItem, GameState } from '../engine/state';
import { isPerfectEmbed } from '../embed/perfect';

export function renderFoods(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cell: number,
  timeMs: number,
): void {
  for (const f of state.foods) {
    drawFood(ctx, f, cell, timeMs, state.tick);
  }
}

function drawFood(
  ctx: CanvasRenderingContext2D,
  f: FoodItem,
  cell: number,
  timeMs: number,
  tick: number,
): void {
  const t = timeMs / 1000;
  const cx = f.x * cell + cell / 2;
  const cy = f.y * cell + cell / 2 + Math.sin(t * 6 + (f.x + f.y) * 0.4) * cell * 0.06;
  const r = cell * 0.36;

  // TTL pulse for power-ups
  let alpha = 1;
  if (f.ttl > 0) {
    const remaining = f.ttl - (tick - f.bornTick);
    if (remaining < 90) alpha = 0.4 + 0.6 * Math.abs(Math.sin(remaining * 0.4));
  }

  ctx.save();
  ctx.globalAlpha = alpha;

  // Glow halo
  ctx.globalCompositeOperation = 'lighter';
  const hue = f.kind === 'rainbow' ? (timeMs / 6) % 360 : f.hue;
  const haloR = r * (1.7 + Math.sin(t * 4 + f.x) * 0.2);
  const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, haloR);
  halo.addColorStop(0, `hsla(${hue}, 100%, 60%, 0.8)`);
  halo.addColorStop(0.6, `hsla(${hue}, 100%, 60%, 0.18)`);
  halo.addColorStop(1, `hsla(${hue}, 100%, 60%, 0)`);
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, haloR, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalCompositeOperation = 'source-over';

  switch (f.kind) {
    case 'apple':
      if (isPerfectEmbed()) drawNeonDumbbell(ctx, cx, cy, r, f.hue, t);
      else drawApple(ctx, cx, cy, r, f.hue);
      break;
    case 'cherry':  drawCherry(ctx, cx, cy, r, f.hue); break;
    case 'star':    drawStar(ctx, cx, cy, r, t); break;
    case 'rainbow': drawRainbow(ctx, cx, cy, r, t); break;
    case 'fire':    drawFire(ctx, cx, cy, r, t); break;
    case 'ice':     drawIce(ctx, cx, cy, r, t); break;
    case 'magnet':  drawMagnet(ctx, cx, cy, r, t); break;
  }

  ctx.restore();
}

function drawNeonDumbbell(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  hue: number,
  timeSec: number,
): void {
  ctx.save();
  const barW = r * 1.85;
  const barH = Math.max(2, r * 0.22);
  const plateW = r * 0.55;
  const plateH = r * 0.95;
  const pulse = 1 + Math.sin(timeSec * 5) * 0.04;
  const glow = `hsla(${hue}, 100%, 62%, 0.55)`;
  const core = `hsl(${hue}, 95%, 58%)`;
  const edge = `hsl(${hue}, 100%, 78%)`;

  ctx.shadowColor = glow;
  ctx.shadowBlur = r * 0.9;

  const drawPlate = (px: number) => {
    const grad = ctx.createLinearGradient(px, cy - plateH / 2, px + plateW, cy + plateH / 2);
    grad.addColorStop(0, edge);
    grad.addColorStop(0.45, core);
    grad.addColorStop(1, `hsl(${hue}, 90%, 38%)`);
    ctx.fillStyle = grad;
    roundRect(ctx, px, cy - (plateH * pulse) / 2, plateW, plateH * pulse, plateW * 0.22);
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.lineWidth = Math.max(1, r * 0.08);
    ctx.stroke();
  };

  const barX = cx - barW / 2;
  ctx.fillStyle = `hsl(${hue}, 80%, 72%)`;
  roundRect(ctx, barX, cy - barH / 2, barW, barH, barH / 2);
  ctx.fill();

  drawPlate(barX - plateW * 0.72);
  drawPlate(barX + barW - plateW * 0.28);
  ctx.shadowBlur = 0;
  ctx.restore();
}

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

function drawApple(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, hue: number): void {
  ctx.save();
  const grad = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.25, 0, cx, cy, r);
  grad.addColorStop(0, '#fff');
  grad.addColorStop(0.35, `hsl(${hue}, 90%, 55%)`);
  grad.addColorStop(1, `hsl(${hue}, 95%, 32%)`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `hsl(${hue}, 100%, 75%)`;
  ctx.lineWidth = Math.max(1, r * 0.12);
  ctx.stroke();
  ctx.restore();
}

function drawCherry(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, hue: number): void {
  const off = r * 0.55;
  for (const dx of [-off, off]) {
    ctx.save();
    const grad = ctx.createRadialGradient(cx + dx - r * 0.15, cy - r * 0.2, 0, cx + dx, cy, r * 0.85);
    grad.addColorStop(0, '#ffe8f8');
    grad.addColorStop(0.5, `hsl(${hue}, 95%, 58%)`);
    grad.addColorStop(1, `hsl(${hue}, 90%, 35%)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx + dx, cy, r * 0.85, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, t: number): void {
  const rot = t * 1.2;
  const inner = r * 0.45;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = (Math.PI * i) / 5 - Math.PI / 2;
    const rad = i % 2 === 0 ? r : inner;
    if (i === 0) ctx.moveTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
    else ctx.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
  }
  ctx.closePath();
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  grad.addColorStop(0, '#fff7d6');
  grad.addColorStop(0.5, '#ffd633');
  grad.addColorStop(1, '#aa6600');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();
}

function drawRainbow(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, t: number): void {
  const hue0 = (t * 200) % 360;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(t * 1.5);
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = `hsl(${(hue0 + i * 60) % 360} 100% 60%)`;
    ctx.beginPath();
    ctx.arc(Math.cos(i * Math.PI / 3) * r * 0.2, Math.sin(i * Math.PI / 3) * r * 0.2, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFire(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, t: number): void {
  ctx.save();
  ctx.translate(cx, cy + r * 0.1);
  // Flame shape via triangles
  const flicker = Math.sin(t * 30) * 0.1;
  const w = r * (0.9 + flicker);
  const h = r * 1.2;
  const grad = ctx.createLinearGradient(0, h * 0.5, 0, -h * 0.5);
  grad.addColorStop(0, '#660000');
  grad.addColorStop(0.4, '#ff4400');
  grad.addColorStop(0.8, '#ffcc00');
  grad.addColorStop(1, '#ffffff');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-w * 0.5, h * 0.5);
  ctx.quadraticCurveTo(-w * 0.7, 0, -w * 0.2, -h * 0.2);
  ctx.quadraticCurveTo(-w * 0.4, -h * 0.4, 0, -h * 0.55);
  ctx.quadraticCurveTo(w * 0.5, -h * 0.3, w * 0.3, -h * 0.05);
  ctx.quadraticCurveTo(w * 0.7, h * 0.1, w * 0.5, h * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawIce(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, t: number): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(t * 0.5);
  // Hexagonal snowflake-ish
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.4, '#aaeeff');
  grad.addColorStop(1, '#0066aa');
  ctx.fillStyle = grad;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const ang = (Math.PI * i) / 3;
    const x = Math.cos(ang) * r;
    const y = Math.sin(ang) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  // Spokes
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) {
    const ang = (Math.PI * i) / 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(ang) * r * 0.8, Math.sin(ang) * r * 0.8);
    ctx.stroke();
  }
  ctx.restore();
}

function drawMagnet(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, t: number): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.sin(t * 2) * 0.15);
  // Horseshoe
  ctx.lineWidth = r * 0.45;
  ctx.lineCap = 'round';
  // Red half
  ctx.strokeStyle = '#ff3344';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.55, Math.PI, Math.PI * 1.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-r * 0.55, 0);
  ctx.lineTo(-r * 0.55, r * 0.5);
  ctx.stroke();
  // Silver half
  ctx.strokeStyle = '#cccccc';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.55, Math.PI * 1.5, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(r * 0.55, 0);
  ctx.lineTo(r * 0.55, r * 0.5);
  ctx.stroke();
  ctx.restore();
}
