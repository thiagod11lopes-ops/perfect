// Tiny pub/sub. The "interrupt bus" of §4.

type Handler = (payload?: unknown) => void;

const handlers = new Map<string, Set<Handler>>();

export function on(event: string, h: Handler): () => void {
  let set = handlers.get(event);
  if (!set) { set = new Set(); handlers.set(event, set); }
  set.add(h);
  return () => set!.delete(h);
}

export function off(event: string, h: Handler): void {
  handlers.get(event)?.delete(h);
}

export function emit(event: string, payload?: unknown): void {
  const set = handlers.get(event);
  if (!set) return;
  for (const h of set) h(payload);
}

export const EVT = {
  EAT: 'eat',
  EAT_POWERUP: 'eat:powerup',
  COMBO_UP: 'combo:up',
  COMBO_RESET: 'combo:reset',
  GAME_OVER: 'game:over',
  WALL_BONK: 'wall:bonk',
  SPEED_UP: 'speed:up',
  POWERUP_EXPIRE: 'powerup:expire',
  STATE_CHANGE: 'state:change',
  EASTER_KONAMI: 'easter:konami',
  EASTER_GOLD: 'easter:gold',
  EASTER_OVERFLOW: 'easter:overflow',
  EASTER_MATRIX: 'easter:matrix',
  EASTER_HAT: 'easter:hat',
} as const;
