import { postWinReward } from './bridge';

const BASE = import.meta.env.BASE_URL;
/** Bump quando trocar gym-cobra-win.mp4 (cache-bust). */
const WIN_MEDIA_TAG = '947e';

/** Sincronizado com CoinRewardCelebration (snake-win). */
export const WIN_SYNC_MS = 8_000;
const VIDEO_DURATION_MS = WIN_SYNC_MS;

function assetUrl(file: string): string {
  const bust = new URLSearchParams(location.search).get('v') ?? String(Date.now());
  return `${BASE}assets/${file}?v=${encodeURIComponent(bust)}&wb=${WIN_MEDIA_TAG}`;
}

let playing = false;

export function playWinCelebration(onSettled: () => void, coins: number): void {
  if (playing) return;
  playing = true;

  postWinReward(coins, coins);

  const root = document.getElementById('root') ?? document.body;
  const layer = document.createElement('div');
  layer.className = 'win-celebration';
  layer.setAttribute('role', 'dialog');
  layer.setAttribute('aria-label', 'Missão concluída');

  const stage = document.createElement('div');
  stage.className = 'win-celebration-stage';

  const video = document.createElement('video');
  video.className = 'win-celebration-video';
  video.src = assetUrl('gym-cobra-win.mp4');
  video.poster = assetUrl('gym-cobra-win.png');
  video.playsInline = true;
  video.muted = true;
  video.autoplay = true;
  video.loop = true;
  video.controls = false;
  video.setAttribute('webkit-playsinline', 'true');
  video.setAttribute('preload', 'auto');

  stage.appendChild(video);
  layer.appendChild(stage);
  root.appendChild(layer);

  let settled = false;
  const settle = () => {
    if (settled) return;
    settled = true;
    playing = false;
    onSettled();
    layer.classList.add('win-celebration-out');
    window.setTimeout(() => layer.remove(), 420);
  };

  const hardCap = window.setTimeout(settle, VIDEO_DURATION_MS);

  const tryPlay = () => {
    void video.play().catch(() => {
      /* poster até o timer */
    });
  };
  video.addEventListener('loadeddata', tryPlay, { once: true });
  tryPlay();

  video.addEventListener(
    'error',
    () => {
      window.clearTimeout(hardCap);
      window.setTimeout(settle, VIDEO_DURATION_MS);
    },
    { once: true },
  );
}