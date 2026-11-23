const MSG = 'perfect-neonophis';

export type Config = {
  targetCoins: number;
  durationMs: number;
  phone: boolean;
};

export function readConfig(): Config {
  const p = new URLSearchParams(location.search);
  const targetCoins = Math.max(1, Number.parseInt(p.get('targetCoins') ?? '10', 10) || 10);
  const durationMs =
    1000 * Math.max(15, Number.parseInt(p.get('durationSec') ?? '60', 10) || 60);
  const phone = p.get('phone') === '1';
  return { targetCoins, durationMs, phone };
}

let settled = false;

export function postReady(): void {
  window.parent?.postMessage({ source: MSG, type: 'perfect-neonophis:ready' }, '*');
}

export function postWinReward(coins: number, targetCoins: number): void {
  window.parent?.postMessage(
    {
      source: MSG,
      type: 'perfect-neonophis:win-reward',
      coins,
      targetCoins,
    },
    '*',
  );
}

export function postProgress(applesEaten: number, targetCoins: number): void {
  window.parent?.postMessage(
    { source: MSG, type: 'perfect-neonophis:progress', applesEaten, targetCoins },
    '*',
  );
}

export function postExit(applesEaten: number, targetCoins: number): void {
  window.parent?.postMessage(
    {
      source: MSG,
      type: 'perfect-neonophis:exit',
      applesEaten,
      targetCoins,
    },
    '*',
  );
}

export function postComplete(success: boolean, applesEaten: number, targetCoins: number): void {
  if (settled) return;
  settled = true;
  const coins = success ? targetCoins : Math.min(targetCoins, applesEaten);
  window.parent?.postMessage(
    {
      source: MSG,
      type: success ? 'perfect-neonophis:complete' : 'perfect-neonophis:failed',
      success,
      coins,
      targetCoins,
      applesEaten,
    },
    '*',
  );
}

export function resetSettlement(): void {
  settled = false;
}

export function listenEmbedCommands(handlers: {
  steer: (d: Dir) => void;
  forceWin?: () => void;
}): void {
  window.addEventListener('message', (event) => {
    const data = event.data;
    if (typeof data !== 'object' || data === null || data.source !== MSG) return;
    if (data.type === 'perfect-neonophis:steer') {
      const d = data.direction;
      if (d === 'UP' || d === 'DOWN' || d === 'LEFT' || d === 'RIGHT') handlers.steer(d);
      return;
    }
    if (data.type === 'perfect-neonophis:force-win') {
      handlers.forceWin?.();
    }
  });
}

export type Dir = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';