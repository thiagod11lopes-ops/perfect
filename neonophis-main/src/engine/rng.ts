// Xorshift32 — seedable PRNG, faithful to the §8 spec.
// Mirrors the C64 SID osc-3 noise: deterministic in hardware, unpredictable to player.

let state = 0x9e3779b9;

export function seed(s: number): void {
  state = (s | 0) || 1;
}

export function rand(): number {
  let x = state;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  state = x | 0;
  return ((x >>> 0) / 0xffffffff);
}

export function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

export function randRange(min: number, max: number): number {
  return rand() * (max - min) + min;
}

export function chance(p: number): boolean {
  return rand() < p;
}

export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)]!;
}

export function dailySeed(date: Date = new Date()): number {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  return (y * 10000 + m * 100 + d) | 0;
}
