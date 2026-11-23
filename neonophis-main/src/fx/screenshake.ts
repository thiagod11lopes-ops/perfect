// Trauma-based screen shake (Squirrel Eiserloh, GDC 2013).

import { rand } from '../engine/rng';

const MAX_SHAKE_PX = 22;
const TRAUMA_DECAY = 1.2;

let trauma = 0;

export function addTrauma(amount: number): void {
  trauma = Math.min(1, trauma + amount);
}

export function applyShake(ctx: CanvasRenderingContext2D, dt: number): { dx: number; dy: number } {
  const shake = trauma * trauma;
  const dx = (rand() * 2 - 1) * shake * MAX_SHAKE_PX;
  const dy = (rand() * 2 - 1) * shake * MAX_SHAKE_PX;
  ctx.translate(dx, dy);
  trauma = Math.max(0, trauma - dt * TRAUMA_DECAY);
  return { dx, dy };
}

export function getTrauma(): number { return trauma; }

export function clearTrauma(): void { trauma = 0; }
