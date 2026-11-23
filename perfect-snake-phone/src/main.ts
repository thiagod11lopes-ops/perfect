import { listenEmbedCommands, postReady, postProgress, readConfig, resetSettlement } from './bridge';
import {
  attachDpad,
  attachKeyboard,
  attachPlayPause,
  attachSwipe,
  attachTurnBar,
  layoutTurnBar,
  queueDir,
} from './input';
import {
  computeGrid,
  createGame,
  forceMissionWin,
  retargetGrid,
  toggleUserPause,
  updateGame,
  FIXED_DT_S,
  type GameState,
} from './game';
import { hideGameOver, showGameOver } from './gameOver';
import {
  dismissCountdown,
  mountCountdown,
  resetCountdownUi,
  syncCountdownLayer,
} from './missionCountdown';
import { preloadPlayfieldBg } from './playfieldBg';
import { clearSnakeTrail, paint } from './render';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const stage = document.getElementById('stage') as HTMLDivElement;
const turnBar = document.getElementById('turn-bar') as HTMLDivElement;
const root = document.getElementById('root') as HTMLDivElement;
const ctx = canvas.getContext('2d', { alpha: false })!;

preloadPlayfieldBg();

const cfg = readConfig();
const inIframe = window.parent !== window;
if (cfg.phone && !inIframe) document.documentElement.classList.add('phone');

attachKeyboard();
attachSwipe(stage);
attachDpad();
let state: GameState;

function syncPlayPauseUi(btn: HTMLButtonElement | null): void {
  if (!btn) return;
  const ended = !state.alive || state.paused || state.countdownMs > 0;
  btn.disabled = ended;
  if (ended) {
    btn.textContent = '▶';
    btn.setAttribute('aria-label', 'Fim de jogo');
    return;
  }
  if (state.userPaused) {
    btn.textContent = '▶';
    btn.setAttribute('aria-label', 'Continuar');
  } else {
    btn.textContent = '⏸';
    btn.setAttribute('aria-label', 'Pausar');
  }
}

const playPauseBtn = attachPlayPause(turnBar, () => {
  toggleUserPause(state);
  syncPlayPauseUi(playPauseBtn);
});

attachTurnBar(turnBar, () => state.dir);
listenEmbedCommands({
  steer: queueDir,
  forceWin: () => {
    resetSettlement();
    forceMissionWin(state);
    syncPlayPauseUi(playPauseBtn);
  },
});

const FIXED_DT_MS = FIXED_DT_S * 1000;
const MAX_FRAME_MS = 250;

function resize(): void {
  const w = Math.max(1, stage.clientWidth);
  const h = Math.max(1, stage.clientHeight);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  const grid = computeGrid(w, h);
  if (state) clearSnakeTrail();
  state = state ? retargetGrid(state, grid) : createGame(cfg, grid);
  layoutTurnBar(turnBar, grid);
}

let lastT = performance.now();
let accumulator = 0;

new ResizeObserver(() => {
  lastT = performance.now();
  accumulator = 0;
  resize();
}).observe(stage);
window.addEventListener('resize', () => {
  lastT = performance.now();
  accumulator = 0;
  resize();
});
resize();

let countdownUiActive = false;
let gameOverUiOpen = false;

function restartRun(): void {
  resetSettlement();
  hideGameOver();
  gameOverUiOpen = false;
  clearSnakeTrail();
  resetCountdownUi();
  root.classList.remove('is-countdown');
  const grid = computeGrid(stage.clientWidth, stage.clientHeight);
  state = createGame(cfg, grid);
  layoutTurnBar(turnBar, grid);
  lastT = performance.now();
  accumulator = 0;
  countdownUiActive = state.countdownMs > 0;
  if (countdownUiActive) {
    mountCountdown(root);
    root.classList.add('is-countdown');
  }
  postProgress(0, cfg.targetCoins);
}

function maybeOpenGameOver(): void {
  if (!state.gameOverLatch || gameOverUiOpen) return;
  gameOverUiOpen = true;
  showGameOver(root, {
    onRetry: restartRun,
    collected: state.collected,
    targetCoins: state.cfg.targetCoins,
  });
}

postReady();
postProgress(0, cfg.targetCoins);

function loop(now: number): void {
  let dt = now - lastT;
  if (dt > MAX_FRAME_MS) dt = MAX_FRAME_MS;
  lastT = now;
  accumulator += dt;
  let safety = 0;
  while (accumulator >= FIXED_DT_MS && safety < 8) {
    updateGame(state, FIXED_DT_S);
    accumulator -= FIXED_DT_MS;
    safety++;
  }
  const alpha = accumulator / FIXED_DT_MS;
  paint(ctx, state, now, alpha);

  if (state.countdownMs > 0) {
    if (!countdownUiActive) {
      countdownUiActive = true;
      mountCountdown(root);
      root.classList.add('is-countdown');
    }
    syncCountdownLayer(state.countdownMs, now);
  } else if (countdownUiActive) {
    countdownUiActive = false;
    root.classList.remove('is-countdown');
    dismissCountdown();
  }

  maybeOpenGameOver();
  syncPlayPauseUi(playPauseBtn);
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);