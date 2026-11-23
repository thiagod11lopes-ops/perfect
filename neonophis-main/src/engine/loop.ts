// Fixed-timestep loop with interpolated render. §3.
// Reference: Glenn Fiedler, "Fix Your Timestep" — and the C64 raster IRQ analogy.

import { TICK_HZ } from './state';

const FIXED_DT_MS = 1000 / TICK_HZ;
const FIXED_DT_S  = 1 / TICK_HZ;
const MAX_FRAME_MS = 250; // spiral-of-death guard

export interface LoopHooks {
  pollInput(): void;
  simulate(dtSeconds: number): void;
  render(alpha: number, frameDtMs: number): void;
}

export function startLoop(hooks: LoopHooks): { stop: () => void } {
  let last = performance.now();
  let accumulator = 0;
  let raf = 0;
  let stopped = false;

  function frame(now: number): void {
    if (stopped) return;
    raf = requestAnimationFrame(frame);

    let dt = now - last;
    if (dt > MAX_FRAME_MS) dt = MAX_FRAME_MS; // hard cap
    last = now;

    // PHASE 1: Input poll (§3) — once per frame; consumed by simulate at tick boundaries.
    hooks.pollInput();

    // PHASE 2: Simulate at fixed 60Hz.
    accumulator += dt;
    let safety = 0;
    while (accumulator >= FIXED_DT_MS && safety < 8) {
      hooks.simulate(FIXED_DT_S);
      accumulator -= FIXED_DT_MS;
      safety++;
    }
    if (safety >= 8) accumulator = 0; // clamp if we fell badly behind

    // PHASE 3: Render with interpolation alpha.
    const alpha = accumulator / FIXED_DT_MS;
    hooks.render(alpha, dt);
  }

  raf = requestAnimationFrame(frame);

  return {
    stop() {
      stopped = true;
      cancelAnimationFrame(raf);
    },
  };
}
