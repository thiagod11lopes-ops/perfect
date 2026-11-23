// Particle pool — §12. Pre-allocated, no GC during gameplay.

const POOL_SIZE = 600;

export interface Particle {
  active: boolean;
  x: number; y: number;        // pixel coords
  vx: number; vy: number;
  ax: number; ay: number;
  life: number;                // seconds remaining
  maxLife: number;
  size: number;
  hue: number;
  sat: number;
  light: number;
  alpha: number;
  shape: 'circle' | 'spark' | 'square';
  drag: number;
}

const pool: Particle[] = [];
for (let i = 0; i < POOL_SIZE; i++) {
  pool.push({
    active: false, x: 0, y: 0, vx: 0, vy: 0, ax: 0, ay: 0,
    life: 0, maxLife: 1, size: 1, hue: 0, sat: 100, light: 60, alpha: 1,
    shape: 'circle', drag: 1,
  });
}

function findFree(): Particle | null {
  for (let i = 0; i < pool.length; i++) {
    const p = pool[i]!;
    if (!p.active) return p;
  }
  // Reuse oldest if pool full
  let oldest = pool[0]!;
  for (let i = 1; i < pool.length; i++) {
    if (pool[i]!.life < oldest.life) oldest = pool[i]!;
  }
  return oldest;
}

export interface SpawnOpts {
  x: number; y: number;
  count: number;
  speed: number;
  spread?: number;            // pixels; randomizes start position
  life: number;               // seconds
  hue: number;
  hueJitter?: number;
  size: number;
  sizeJitter?: number;
  drag?: number;
  gravity?: number;
  shape?: Particle['shape'];
  angle?: number;             // base angle in radians (default random full circle)
  arc?: number;               // angle arc range (default 2π)
  light?: number;
}

export function spawnParticles(opts: SpawnOpts): void {
  const angle0 = opts.angle ?? 0;
  const arc = opts.arc ?? Math.PI * 2;
  for (let i = 0; i < opts.count; i++) {
    const p = findFree();
    if (!p) return;
    const a = angle0 + (Math.random() - 0.5) * arc;
    const sp = opts.speed * (0.6 + Math.random() * 0.8);
    p.active = true;
    p.x = opts.x + (opts.spread ? (Math.random() - 0.5) * opts.spread : 0);
    p.y = opts.y + (opts.spread ? (Math.random() - 0.5) * opts.spread : 0);
    p.vx = Math.cos(a) * sp;
    p.vy = Math.sin(a) * sp;
    p.ax = 0;
    p.ay = opts.gravity ?? 0;
    p.life = opts.life * (0.8 + Math.random() * 0.4);
    p.maxLife = p.life;
    p.size = opts.size + (opts.sizeJitter ? (Math.random() - 0.5) * opts.sizeJitter : 0);
    p.hue = opts.hue + (opts.hueJitter ? (Math.random() - 0.5) * opts.hueJitter : 0);
    p.sat = 100;
    p.light = opts.light ?? 65;
    p.alpha = 1;
    p.shape = opts.shape ?? 'circle';
    p.drag = opts.drag ?? 0.94;
  }
}

export function updateParticles(dt: number): void {
  for (let i = 0; i < pool.length; i++) {
    const p = pool[i]!;
    if (!p.active) continue;
    p.life -= dt;
    if (p.life <= 0) { p.active = false; continue; }
    p.vx += p.ax * dt;
    p.vy += p.ay * dt;
    p.vx *= p.drag;
    p.vy *= p.drag;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.alpha = Math.min(1, p.life / p.maxLife * 1.4);
  }
}

export function renderParticles(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < pool.length; i++) {
    const p = pool[i]!;
    if (!p.active) continue;
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = `hsl(${p.hue} ${p.sat}% ${p.light}%)`;
    if (p.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.shape === 'square') {
      ctx.fillRect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
    } else {
      // spark — line in velocity direction
      const len = Math.min(12, Math.hypot(p.vx, p.vy) * 0.05);
      ctx.strokeStyle = ctx.fillStyle;
      ctx.lineWidth = p.size;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.02 - len, p.y - p.vy * 0.02);
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function clearParticles(): void {
  for (let i = 0; i < pool.length; i++) pool[i]!.active = false;
}
