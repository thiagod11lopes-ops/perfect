import type { Dir } from './bridge';
import type { GridMetrics } from './game';

const OPP: Record<Dir, Dir> = {
  UP: 'DOWN',
  DOWN: 'UP',
  LEFT: 'RIGHT',
  RIGHT: 'LEFT',
};

const MAX_BUFFER = 2;
const buffer: Dir[] = [];

export function queueDir(d: Dir): void {
  if (buffer.length >= MAX_BUFFER) return;
  if (buffer[buffer.length - 1] === d) return;
  buffer.push(d);
}

/** Neon Ophis: consume at tick, skip opposites. */
export function consumeDir(current: Dir): Dir {
  while (buffer.length > 0) {
    const next = buffer.shift()!;
    if (OPP[current] !== next) return next;
  }
  return current;
}

export function attachKeyboard(): void {
  window.addEventListener(
    'keydown',
    (e) => {
      if (e.repeat) return;
      const map: Record<string, Dir> = {
        ArrowUp: 'UP',
        ArrowDown: 'DOWN',
        ArrowLeft: 'LEFT',
        ArrowRight: 'RIGHT',
        w: 'UP',
        s: 'DOWN',
        a: 'LEFT',
        d: 'RIGHT',
      };
      const d = map[e.key];
      if (d) {
        e.preventDefault();
        queueDir(d);
      }
    },
    { passive: false },
  );
}

export function attachSwipe(target: HTMLElement): void {
  let x0 = 0;
  let y0 = 0;
  let active = false;
  const TH = 24;
  target.addEventListener(
    'touchstart',
    (e) => {
      const t = e.changedTouches[0];
      if (!t) return;
      x0 = t.clientX;
      y0 = t.clientY;
      active = true;
    },
    { passive: true },
  );
  target.addEventListener(
    'touchend',
    (e) => {
      if (!active) return;
      const t = e.changedTouches[0];
      if (!t) return;
      const dx = t.clientX - x0;
      const dy = t.clientY - y0;
      if (Math.abs(dx) < TH && Math.abs(dy) < TH) return;
      if (Math.abs(dx) > Math.abs(dy)) queueDir(dx > 0 ? 'RIGHT' : 'LEFT');
      else queueDir(dy > 0 ? 'DOWN' : 'UP');
      active = false;
    },
    { passive: true },
  );
}

function turnRelative(current: Dir, side: 'LEFT' | 'RIGHT'): Dir {
  if (side === 'LEFT') {
    switch (current) {
      case 'UP':
        return 'LEFT';
      case 'LEFT':
        return 'DOWN';
      case 'DOWN':
        return 'RIGHT';
      case 'RIGHT':
        return 'UP';
    }
  }
  switch (current) {
    case 'UP':
      return 'RIGHT';
    case 'RIGHT':
      return 'DOWN';
    case 'DOWN':
      return 'LEFT';
    case 'LEFT':
      return 'UP';
  }
}

export function layoutTurnBar(bar: HTMLElement, grid: GridMetrics): void {
  const p = grid.play;
  const topPx = (p.maxY + 1) * grid.cellH;
  const rowCount = grid.rows - (p.maxY + 1);
  const heightPx = Math.max(0, rowCount * grid.cellH);
  bar.style.top = `${topPx}px`;
  bar.style.height = `${heightPx}px`;
}

const TURN_DEBOUNCE_MS = 180;

export function attachTurnBar(bar: HTMLElement, getFacing: () => Dir): void {
  let lastTurnAt = 0;
  const bind = (side: 'LEFT' | 'RIGHT') => {
    const btn = bar.querySelector<HTMLButtonElement>(`button[data-turn="${side}"]`);
    if (!btn) return;
    btn.addEventListener(
      'pointerdown',
      (e: PointerEvent) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        const now = performance.now();
        if (now - lastTurnAt < TURN_DEBOUNCE_MS) return;
        lastTurnAt = now;
        queueDir(turnRelative(getFacing(), side));
      },
      { passive: false },
    );
  };
  bind('LEFT');
  bind('RIGHT');
}

export function attachPlayPause(bar: HTMLElement, onToggle: () => void): HTMLButtonElement | null {
  const btn = bar.querySelector<HTMLButtonElement>('button[data-action="play-pause"]');
  if (!btn) return null;
  btn.addEventListener(
    'pointerdown',
    (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      onToggle();
    },
    { passive: false },
  );
  return btn;
}

export function attachDpad(): void {
  const pad = document.getElementById('dpad');
  if (!pad) return;
  pad.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-dir]');
    if (!btn) return;
    const d = btn.dataset.dir as Dir;
    if (d) queueDir(d);
  });
}