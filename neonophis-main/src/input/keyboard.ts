// Bufferized keyboard input — §5.
// FIFO of size 2, validated against current direction at tick consumption time.

import { isOpposite, type Direction } from '../engine/state';

const MAX_BUFFER = 2;
const buffer: Direction[] = [];
const keysDown = new Set<string>();

export interface InputCommands {
  pause: boolean;
  togglePause: boolean;
  confirm: boolean;
  back: boolean;
  restart: boolean;
}

const commands: InputCommands = {
  pause: false,
  togglePause: false,
  confirm: false,
  back: false,
  restart: false,
};

const konamiTarget = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
  'KeyB', 'KeyA',
];
let konamiIdx = 0;

const snekTarget = ['KeyS', 'KeyN', 'KeyE', 'KeyK'];
let snekIdx = 0;

type EasterCb = (kind: 'konami' | 'snek') => void;
const easterListeners = new Set<EasterCb>();

export function onEasterCode(cb: EasterCb): () => void {
  easterListeners.add(cb);
  return () => easterListeners.delete(cb);
}

function fireEaster(kind: 'konami' | 'snek'): void {
  for (const cb of easterListeners) cb(kind);
}

function pushDir(dir: Direction): void {
  if (buffer.length >= MAX_BUFFER) return;
  if (buffer[buffer.length - 1] === dir) return;
  buffer.push(dir);
}

function keyToDirection(code: string): Direction | null {
  switch (code) {
    case 'ArrowUp':
    case 'KeyW':
      return 'UP';
    case 'ArrowDown':
    case 'KeyS':
      return 'DOWN';
    case 'ArrowLeft':
    case 'KeyA':
      return 'LEFT';
    case 'ArrowRight':
    case 'KeyD':
      return 'RIGHT';
    default:
      return null;
  }
}

function trackKonami(code: string): void {
  if (code === konamiTarget[konamiIdx]) {
    konamiIdx++;
    if (konamiIdx >= konamiTarget.length) {
      konamiIdx = 0;
      fireEaster('konami');
    }
  } else {
    konamiIdx = code === konamiTarget[0] ? 1 : 0;
  }
}

function trackSnek(code: string): void {
  if (code === snekTarget[snekIdx]) {
    snekIdx++;
    if (snekIdx >= snekTarget.length) {
      snekIdx = 0;
      fireEaster('snek');
    }
  } else {
    snekIdx = code === snekTarget[0] ? 1 : 0;
  }
}

let attached = false;

export function attachKeyboard(): void {
  if (attached) return;
  attached = true;

  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.repeat) return;
    if (e.code === 'Tab') return; // don't trap Tab for accessibility
    keysDown.add(e.code);

    trackKonami(e.code);
    trackSnek(e.code);

    const dir = keyToDirection(e.code);
    if (dir) {
      pushDir(dir);
      e.preventDefault();
      return;
    }

    switch (e.code) {
      case 'KeyP':
      case 'Space':
        commands.togglePause = true;
        e.preventDefault();
        break;
      case 'Escape':
      case 'Backspace':
        commands.back = true;
        e.preventDefault();
        break;
      case 'Enter':
      case 'NumpadEnter':
        commands.confirm = true;
        e.preventDefault();
        break;
      case 'KeyR':
        commands.restart = true;
        e.preventDefault();
        break;
    }
  }, { passive: false });

  window.addEventListener('keyup', (e: KeyboardEvent) => {
    keysDown.delete(e.code);
  });

  // Pause game if tab loses focus
  window.addEventListener('blur', () => {
    commands.pause = true;
  });
}

export function consumeNextDirection(currentDir: Direction): Direction {
  while (buffer.length > 0) {
    const next = buffer.shift()!;
    if (!isOpposite(next, currentDir)) return next;
  }
  return currentDir;
}

export function consumeCommands(): InputCommands {
  const out: InputCommands = { ...commands };
  commands.pause = false;
  commands.togglePause = false;
  commands.confirm = false;
  commands.back = false;
  commands.restart = false;
  return out;
}

export function clearInputBuffer(): void {
  buffer.length = 0;
}

export function pushDirection(dir: Direction): void {
  pushDir(dir);
}

// Touch buttons reuse the exact same command pipeline as the keyboard:
// they just set the shared `commands` flags that consumeCommands() drains.
// This keeps the desktop path byte-for-byte identical (§5).
export type InjectableCommand = 'togglePause' | 'confirm' | 'back' | 'restart';

export function injectCommand(name: InjectableCommand): void {
  commands[name] = true;
}
