// Swipe input for mobile — §5. Threshold 24px, timeout 300ms.

import { pushDirection } from './keyboard';

const THRESH = 24;
const TIMEOUT = 300;

let startX = 0, startY = 0, startT = 0;
let active = false;

export function attachTouch(target: HTMLElement): void {
  target.addEventListener('touchstart', (e: TouchEvent) => {
    const t = e.changedTouches[0];
    if (!t) return;
    startX = t.clientX;
    startY = t.clientY;
    startT = performance.now();
    active = true;
    e.preventDefault();
  }, { passive: false });

  target.addEventListener('touchmove', (e: TouchEvent) => {
    if (!active) return;
    const t = e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    if (Math.abs(dx) >= THRESH || Math.abs(dy) >= THRESH) {
      flushSwipe(dx, dy);
      active = false;
    }
    e.preventDefault();
  }, { passive: false });

  target.addEventListener('touchend', (e: TouchEvent) => {
    if (!active) return;
    const t = e.changedTouches[0];
    if (!t) return;
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    const dt = performance.now() - startT;
    if (dt <= TIMEOUT && (Math.abs(dx) >= THRESH || Math.abs(dy) >= THRESH)) {
      flushSwipe(dx, dy);
    }
    active = false;
    e.preventDefault();
  }, { passive: false });

  target.addEventListener('touchcancel', () => { active = false; });
}

function flushSwipe(dx: number, dy: number): void {
  if (Math.abs(dx) > Math.abs(dy)) {
    pushDirection(dx > 0 ? 'RIGHT' : 'LEFT');
  } else {
    pushDirection(dy > 0 ? 'DOWN' : 'UP');
  }
}
