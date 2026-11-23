// PERFECT Missão de Habilidade — minimal iframe bridge (no view-pan).

import { pushDirection } from '../input/keyboard';

const MSG = 'perfect-neonophis';

export type PerfectEmbedConfig = {
  targetCoins: number;
  durationMs: number;
};

let cfg: PerfectEmbedConfig | null = null;
let settled = false;
let parentLayoutW = 0;
let parentLayoutH = 0;

function parseConfig(): PerfectEmbedConfig | null {
  if (typeof window === 'undefined') return null;
  const p = new URLSearchParams(window.location.search);
  if (p.get('embed') !== '1' && p.get('perfect') !== '1') return null;
  const targetCoins = Math.max(1, Number.parseInt(p.get('targetCoins') ?? '10', 10) || 10);
  const durationMs =
    1000 * Math.max(15, Number.parseInt(p.get('durationSec') ?? '60', 10) || 60);
  return { targetCoins, durationMs };
}

export function readPerfectEmbedConfig(): PerfectEmbedConfig | null {
  return parseConfig();
}

export function isPerfectEmbed(): boolean {
  return cfg !== null || parseConfig() !== null;
}

export function perfectEmbedTargetCoins(): number {
  return cfg?.targetCoins ?? parseConfig()?.targetCoins ?? 10;
}

export function perfectEmbedDurationMs(): number {
  return cfg?.durationMs ?? 60_000;
}

export function parentEmbedLayoutW(): number {
  return parentLayoutW;
}

export function parentEmbedLayoutH(): number {
  return parentLayoutH;
}

function onParentMessage(event: MessageEvent): void {
  const data = event.data;
  if (typeof data !== 'object' || data === null || data.source !== MSG) return;

  if (data.type === 'perfect-neonophis:layout') {
    const w = Number(data.viewW);
    const h = Number(data.viewH);
    if (Number.isFinite(w) && w > 0) parentLayoutW = Math.floor(w);
    if (Number.isFinite(h) && h > 0) parentLayoutH = Math.floor(h);
    window.dispatchEvent(new CustomEvent('perfect-embed-layout'));
    return;
  }

  if (data.type === 'perfect-neonophis:steer') {
    const d = data.direction;
    if (d === 'UP' || d === 'DOWN' || d === 'LEFT' || d === 'RIGHT') {
      pushDirection(d);
    }
  }
}

export function initPerfectEmbed(config: PerfectEmbedConfig): void {
  cfg = config;
  settled = false;
  window.addEventListener('message', onParentMessage);
  window.parent?.postMessage({ source: MSG, type: 'perfect-neonophis:ready' }, '*');
  window.parent?.postMessage({ source: MSG, type: 'perfect-neonophis:request-layout' }, '*');
  postPerfectEmbedProgress(0);
}

export function postPerfectEmbedProgress(applesEaten: number): void {
  if (!cfg) return;
  window.parent?.postMessage(
    {
      source: MSG,
      type: 'perfect-neonophis:progress',
      applesEaten,
      targetCoins: cfg.targetCoins,
    },
    '*',
  );
}

export function checkPerfectEmbedAfterEat(applesEaten: number): boolean {
  if (!cfg) return false;
  return applesEaten >= cfg.targetCoins;
}

export function settlePerfectEmbed(success: boolean, applesEaten: number): void {
  if (!cfg || settled) return;
  settled = true;
  const coins = success ? cfg.targetCoins : Math.min(cfg.targetCoins, applesEaten);
  window.parent?.postMessage(
    {
      source: MSG,
      type: success ? 'perfect-neonophis:complete' : 'perfect-neonophis:failed',
      success,
      coins,
      targetCoins: cfg.targetCoins,
      applesEaten,
    },
    '*',
  );
}