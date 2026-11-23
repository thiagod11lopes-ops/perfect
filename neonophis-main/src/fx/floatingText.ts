// "+10" / "COMBO ×3" floating text — pooled.

const POOL = 32;

interface FloatingText {
  active: boolean;
  text: string;
  x: number; y: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
  weight: number;
}

const pool: FloatingText[] = [];
for (let i = 0; i < POOL; i++) pool.push(makeEmpty());

function makeEmpty(): FloatingText {
  return { active: false, text: '', x: 0, y: 0, vy: 0, life: 0, maxLife: 1, size: 24, hue: 0, weight: 1 };
}

export function spawnText(text: string, x: number, y: number, opts: { hue?: number; size?: number; life?: number; weight?: number } = {}): void {
  const ft = pool.find(t => !t.active) ?? pool[0]!;
  ft.active = true;
  ft.text = text;
  ft.x = x;
  ft.y = y;
  ft.vy = -50;
  ft.maxLife = opts.life ?? 0.9;
  ft.life = ft.maxLife;
  ft.size = opts.size ?? 22;
  ft.hue = opts.hue ?? 60;
  ft.weight = opts.weight ?? 1;
}

export function updateFloating(dt: number): void {
  for (const t of pool) {
    if (!t.active) continue;
    t.life -= dt;
    if (t.life <= 0) { t.active = false; continue; }
    t.y += t.vy * dt;
    t.vy *= 0.94;
  }
}

export function renderFloating(ctx: CanvasRenderingContext2D, font: string): void {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const t of pool) {
    if (!t.active) continue;
    const prog = 1 - t.life / t.maxLife;
    const a = Math.min(1, t.life / t.maxLife * 1.5);
    const scale = 0.85 + Math.sin(prog * Math.PI) * 0.25 * t.weight;
    const size = t.size * scale;
    ctx.font = `${size}px ${font}`;
    ctx.globalAlpha = a;
    // Shadow / glow
    ctx.fillStyle = `hsl(${t.hue} 100% 50% / 0.6)`;
    ctx.fillText(t.text, t.x + 2, t.y + 2);
    ctx.fillStyle = `hsl(${t.hue} 100% 75%)`;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.restore();
}

export function clearFloating(): void { for (const t of pool) t.active = false; }
