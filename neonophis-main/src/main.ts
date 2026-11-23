// NEON OPHIS — main entry. Wires engine, input, gameplay, render, audio, FX, UI.

import './styles/fonts.css';

import { startLoop } from './engine/loop';
import { gridH, gridW, isPhoneEmbed } from './engine/grid';
import {
  createInitialState,
  type GameState,
} from './engine/state';
import { seed, randInt } from './engine/rng';
import { emit, EVT, on } from './engine/events';

import { attachKeyboard, consumeNextDirection, consumeCommands, clearInputBuffer, onEasterCode, injectCommand } from './input/keyboard';
import { attachTouch } from './input/touch';
import { initTouchControls, syncTouchControls, refreshTouchLabels } from './input/touchControls';

import { stepSnake, grow } from './gameplay/snake';
import { checkHeadCollision } from './gameplay/collision';
import { spawnFood, tickFoods, FOOD_SCORES, isPowerup } from './gameplay/food';
import { bumpCombo, tickCombo } from './gameplay/combo';
import { activatePowerUp, powerUpForFood, tickPowerUps } from './gameplay/powerups';
import { MODES, pickChaosEvent, chaosLabel, type ModeId } from './gameplay/modes';

import { initRenderer, resizeRenderer, renderFrame, getMetrics } from './render/renderer';
import { initBackground, resizeBackground, updateBackground } from './render/background';
import type { Expression } from './render/snakeRenderer';
import { ensureFontsLoaded } from './render/fonts';

import { spawnParticles, updateParticles, clearParticles } from './fx/particles';
import { addTrauma, clearTrauma } from './fx/screenshake';
import { flash, zoomPulse, tickFlashes, clearFlashes } from './fx/flash';
import { spawnText, updateFloating, clearFloating } from './fx/floatingText';

import { ensureAudio, setMuted, isMuted } from './audio/synth';
import { sfxBonk, sfxComboUp, sfxEat, sfxEasterUnlock, sfxGameOver, sfxPowerUp, sfxSpeedUp, sfxStart } from './audio/sfx';
import { startMusic, stopMusic, setMusicState, startMenuMusic } from './audio/music';

import { createMenu, menuConfirm, menuMoveDown, menuMoveUp, renderMenu, type MenuState } from './ui/menu';
import { renderGameOver, type NameEntryState, isAllowedChar } from './ui/gameover';
import { renderCredits } from './ui/credits';
import { renderScores, SCORE_MODES } from './ui/scores';
import { renderSplash } from './ui/splash';
import { langToggleHitTest, type ToggleAnchor } from './ui/langToggle';
import { t, setLang, onLangChange } from './i18n';

import { bumpPowerupTotal, checkScoreRank, getPowerupTotal, initHighScores, isFlag, saveScore, setFlag, type HighScoreEntry } from './storage/highscores';
import {
  checkPerfectEmbedAfterEat,
  initPerfectEmbed,
  isPerfectEmbed,
  parentEmbedLayoutH,
  parentEmbedLayoutW,
  readPerfectEmbedConfig,
  settlePerfectEmbed,
  perfectEmbedDurationMs,
  postPerfectEmbedProgress,
} from './embed/perfect';
type Screen = 'SPLASH' | 'MENU' | 'PLAY' | 'GAMEOVER' | 'CREDITS' | 'SCORES';

const stage = document.getElementById('stage') as HTMLDivElement;
const bgCanvas = document.getElementById('bg-canvas') as HTMLCanvasElement;
const gameCanvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const touchOverlay = document.getElementById('touch-overlay') as HTMLDivElement;
const fadeOverlay = document.getElementById('fade-overlay') as HTMLDivElement;

const perfectEmbedCfg = readPerfectEmbedConfig();
if (perfectEmbedCfg) {
  document.documentElement.classList.add('perfect-embed');
  if (isPhoneEmbed()) document.documentElement.classList.add('phone-embed');
  touchOverlay.style.display = 'none';
  const lang = new URLSearchParams(window.location.search).get('lang');
  if (lang === 'pt' || lang === 'en' || lang === 'fr') setLang(lang);
}

initBackground(bgCanvas);
initRenderer(gameCanvas);
attachKeyboard();
attachTouch(perfectEmbedCfg ? stage : touchOverlay);
initTouchControls({
  overlay: touchOverlay,
  onCommand: injectCommand,
  onStartMode: (mode) => startGame(mode),
  onShowCredits: () => { screen = 'CREDITS'; creditsScrollOffset = 0; creditsDragY = null; },
  onShowScores: () => { screen = 'SCORES'; scoresTab = 0; },
  onConfirmName: () => confirmNameEntry(),
  setName: (n) => { if (nameEntry) nameEntry.name = n; },
  onSplashStart: () => goToMenu(),
  onScoresPrev: () => { scoresTab = ((scoresTab - 1) + SCORE_MODES.length) % SCORE_MODES.length; },
  onScoresNext: () => { scoresTab = (scoresTab + 1) % SCORE_MODES.length; },
  onMenuActivate: () => { ensureAudio(); startMenuMusic(); },
  onMenuIndex: (idx) => { menu.index = idx; },
  onSetLang: (l) => setLang(l),
});

// Touch DOM labels are built once; canvas text re-reads t() every frame but
// the overlay buttons need an explicit refresh when the language changes.
onLangChange(() => refreshTouchLabels());

// Credits touch-scrub: drag finger up/down to rewind or fast-forward the roll.
// Runs on the same overlay as the swipe handler; coexists without conflict
// because stopPropagation on buttons prevents them from reaching this listener.
touchOverlay.addEventListener('touchstart', (e: TouchEvent) => {
  if (screen !== 'CREDITS') return;
  const t = e.changedTouches[0];
  if (t) creditsDragY = t.clientY;
}, { passive: true });

touchOverlay.addEventListener('touchmove', (e: TouchEvent) => {
  if (screen !== 'CREDITS' || creditsDragY === null) return;
  const t = e.changedTouches[0];
  if (!t) return;
  creditsScrollOffset -= (t.clientY - creditsDragY);
  creditsDragY = t.clientY;
}, { passive: true });

touchOverlay.addEventListener('touchend', () => { creditsDragY = null; });
touchOverlay.addEventListener('touchcancel', () => { creditsDragY = null; });

// Scores swipe: left = next mode, right = prev mode.
let scoresDragX: number | null = null;
const SCORES_SWIPE_THRESH = 40;

touchOverlay.addEventListener('touchstart', (e: TouchEvent) => {
  if (screen !== 'SCORES') return;
  const t = e.changedTouches[0];
  if (t) scoresDragX = t.clientX;
}, { passive: true });

touchOverlay.addEventListener('touchend', (e: TouchEvent) => {
  if (screen !== 'SCORES' || scoresDragX === null) return;
  const t = e.changedTouches[0];
  if (t) {
    const dx = t.clientX - scoresDragX;
    if (Math.abs(dx) >= SCORES_SWIPE_THRESH) {
      if (dx < 0) scoresTab = (scoresTab + 1) % SCORE_MODES.length;
      else scoresTab = ((scoresTab - 1) + SCORE_MODES.length) % SCORE_MODES.length;
    }
  }
  scoresDragX = null;
}, { passive: true });

touchOverlay.addEventListener('touchcancel', () => { scoresDragX = null; });

let screen: Screen = 'SPLASH';
let splashDone = false;
let scoresTab = 0;

// Credits touch-scrub state — additive offset on top of auto-scroll.
// Drag down = rewind, drag up = fast-forward. Resets on every credits entry.
let creditsScrollOffset = 0;
let creditsDragY: number | null = null;

function goToMenu(): void {
  if (splashDone) return;
  splashDone = true;
  ensureAudio();
  startMenuMusic();
  fadeOverlay.classList.add('fading');
  setTimeout(() => {
    screen = 'MENU';
    fadeOverlay.classList.remove('fading');
  }, 230);
}
let menu: MenuState = createMenu();
let state: GameState | null = null;
let lastChaosTick = 0;
let isNewHighThisRun = false;
let timeMs = 0;
let muted = false;
let confirmQuit = false;
let confirmQuitWasPaused = false;
let nameEntry: (NameEntryState & { pendingMode: ModeId; pendingEntry: HighScoreEntry }) | null = null;

// Seed RNG
seed((Date.now() & 0xffffffff) || 1);

// Load hi-scores from server (async; falls back to localStorage)
void initHighScores();

// Cosmetic flags persisted
function applyPersistentCosmetics(s: GameState): void {
  if (isFlag('hat:cowboy')) s.cosmetics.hat = 'cowboy';
  if (isFlag('skin:gold'))  s.cosmetics.skin = 'gold';
}

// =====================================================
// Easter codes
// =====================================================
onEasterCode((kind) => {
  if (kind === 'konami') {
    if (state) state.cosmetics.discoMode = true;
    flash('rgba(255, 95, 174, 0.8)', 280);
    sfxEasterUnlock();
    spawnText('DISCO MODE', getMetrics().cssWidth / 2 - getMetrics().fieldX, getMetrics().cssHeight / 2 - getMetrics().fieldY,
      { hue: 320, size: 56, life: 1.6 });
  } else if (kind === 'snek') {
    setFlag('hat:cowboy', true);
    if (state) state.cosmetics.hat = 'cowboy';
    sfxEasterUnlock();
    flash('rgba(255, 200, 0, 0.5)', 220);
  }
});

// =====================================================
// Resize handling
// =====================================================
function embedViewportW(): number {
  const vv = window.visualViewport;
  const inner = Math.max(
    1,
    Math.round(vv?.width ?? document.documentElement.clientWidth ?? window.innerWidth),
  );
  // Phone: never shrink to an undersized parent layout postMessage (see measure-neonophis-*).
  if (isPhoneEmbed()) return inner;
  const parentW = parentEmbedLayoutW();
  if (parentW > 0) return Math.min(parentW, inner);
  return inner;
}

function embedViewportH(): number {
  const vv = window.visualViewport;
  const inner = Math.max(
    1,
    Math.round(vv?.height ?? document.documentElement.clientHeight ?? window.innerHeight),
  );
  if (isPhoneEmbed()) return inner;
  const parentH = parentEmbedLayoutH();
  if (parentH > 0) return Math.min(parentH, inner);
  return inner;
}

function handleResize(): void {
  const w = perfectEmbedCfg
    ? embedViewportW()
    : Math.max(1, stage.clientWidth || window.innerWidth);
  const h = perfectEmbedCfg
    ? embedViewportH()
    : Math.max(1, stage.clientHeight || window.innerHeight);
  resizeRenderer(w, h);
  const m = getMetrics();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  resizeBackground(m.cssWidth, m.cssHeight, dpr);
  if (perfectEmbedCfg) {
    const viewW = Math.max(1, w);
    const viewH = Math.max(1, h);
    stage.style.width = `${viewW}px`;
    stage.style.height = `${viewH}px`;
    stage.style.minWidth = `${viewW}px`;
    stage.style.minHeight = `${viewH}px`;
    stage.style.maxWidth = `${viewW}px`;
    stage.style.maxHeight = `${viewH}px`;
    if (isPhoneEmbed()) {
      const targetW = Math.max(stage.clientWidth, document.documentElement.clientWidth, viewW);
      const cw = gameCanvas.offsetWidth;
      if (targetW > 0 && Math.abs(cw - targetW) > 1) {
        resizeRenderer(targetW, embedViewportH());
        gameCanvas.style.width = `${targetW}px`;
      }
    }
  }
}
window.addEventListener('resize', handleResize);
if (perfectEmbedCfg) {
  window.addEventListener('perfect-embed-layout', handleResize);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleResize);
  }
}
new ResizeObserver(handleResize).observe(stage);
handleResize();

// Language toggle (desktop): the pills are drawn on the game canvas during
// SPLASH/MENU. This listener is on the canvas itself, so it runs before the
// stage handler below — a pill hit calls setLang and stops propagation so the
// splash tap doesn't also advance to the menu. On mobile the #touch-overlay
// sits above the canvas and owns this via its own DOM lang buttons instead.
gameCanvas.addEventListener('pointerdown', (e) => {
  if (screen !== 'SPLASH' && screen !== 'MENU') return;
  const anchor: ToggleAnchor = screen === 'SPLASH' ? 'splash' : 'menu';
  const rect = gameCanvas.getBoundingClientRect();
  const hit = langToggleHitTest(
    rect.width, rect.height,
    e.clientX - rect.left, e.clientY - rect.top,
    anchor,
  );
  if (hit) {
    setLang(hit);
    e.stopPropagation();
  }
});

// Splash: click anywhere on the stage advances (desktop only — mobile uses the JOGAR button)
stage.addEventListener('pointerdown', (e) => {
  if (screen !== 'SPLASH') return;
  if (e.pointerType === 'touch') return;
  goToMenu();
});

// =====================================================
// Game lifecycle
// =====================================================
function embedSpawnCfg(mode: ModeId) {
  if (perfectEmbedCfg) {
    return { powerupBaseChance: 0, rareTypeChance: 0, ttlPowerup: 0 };
  }
  return {
    powerupBaseChance: MODES[mode].powerupBaseChance,
    rareTypeChance: MODES[mode].rareTypeChance,
    ttlPowerup: MODES[mode].ttlPowerup,
  };
}

function startGame(mode: ModeId): void {
  const s = createInitialState(mode, (Date.now() & 0xffffffff) || 1);
  applyPersistentCosmetics(s);
  s.moveIntervalTicks = MODES[mode].baseMoveIntervalTicks;
  s.maxFoods = perfectEmbedCfg ? 1 : MODES[mode].initialMaxFoods;
  const spawnCfg = embedSpawnCfg(mode);
  // Initial foods
  for (let i = 0; i < s.maxFoods; i++) {
    spawnFood(s, spawnCfg);
  }
  if (perfectEmbedCfg && s.foods.length < 1) {
    spawnFood(s, spawnCfg);
  }
  if (perfectEmbedCfg) {
    s.timeRemainingMs = perfectEmbedDurationMs();
  }
  state = s;
  screen = 'PLAY';
  handleResize();
  isNewHighThisRun = false;
  lastChaosTick = 0;
  confirmQuit = false;
  clearParticles();
  clearTrauma();
  clearFlashes();
  clearFloating();
  clearInputBuffer();
  ensureAudio();
  startMusic();
  sfxStart();
}

function endGame(): void {
  if (!state) return;
  if (isPerfectEmbed() && perfectEmbedCfg) {
    const success = state.stats.applesEaten >= perfectEmbedCfg.targetCoins;
    settlePerfectEmbed(success, state.stats.applesEaten);
    state.snake.alive = false;
    state.paused = true;
    stopMusic();
    return;
  }
  state.snake.alive = false;
  state.phase = 'GAMEOVER';
  state.stats.endTimeMs = performance.now();
  const mode = state.mode;
  const entry: HighScoreEntry = {
    score: state.stats.score,
    playerName: '',
    date: Date.now(),
    modeSeed: state.seed,
    durationS: (state.stats.endTimeMs - state.stats.startTimeMs) / 1000,
    applesEaten: state.stats.applesEaten,
  };
  const { qualifies, rank } = checkScoreRank(mode, entry.score);
  isNewHighThisRun = qualifies && rank === 0;
  if (qualifies) {
    nameEntry = { name: '', pendingMode: mode, pendingEntry: entry };
  }
  sfxGameOver();
  addTrauma(0.9);
  flash('rgba(255, 30, 60, 0.7)', 350);
  emit(EVT.GAME_OVER);
  setTimeout(() => { screen = 'GAMEOVER'; stopMusic(); }, 220);
}

function returnToMenu(): void {
  nameEntry = null;
  state = null;
  screen = 'MENU';
  confirmQuit = false;
  menu = createMenu();
  clearParticles();
  clearTrauma();
  clearFlashes();
  clearFloating();
  clearInputBuffer();
  stopMusic();
  startMenuMusic();
}

function confirmNameEntry(): void {
  if (!nameEntry) return;
  const finalName = nameEntry.name.trim() || '---';
  const entry: HighScoreEntry = { ...nameEntry.pendingEntry, playerName: finalName };
  void saveScore(nameEntry.pendingMode, entry);
  nameEntry = null;
  // Fica na tela de game over para o jogador ver o ranking atualizado.
  // R/Enter reinicia e ESC vai ao menu normalmente.
}

// =====================================================
// Per-tick simulation
// =====================================================
function simulate(dtSeconds: number): void {
  const dtMs = dtSeconds * 1000;

  if (screen !== 'PLAY' || !state) return;
  if (state.paused) return;

  state.tick++;

  // Time attack timer
  if (state.timeRemainingMs > 0) {
    state.timeRemainingMs -= dtMs;
    if (state.timeRemainingMs <= 0) {
      state.timeRemainingMs = 0;
      endGame();
      return;
    }
  }

  // Foods TTL
  tickFoods(state);

  // Combo decay
  tickCombo(state);

  // Power-ups tick
  tickPowerUps(state, dtMs);

  // Magnet may have pulled food onto the head — detect and eat it now,
  // before the next movement tick, so score and combo are credited.
  if (state.powerups.some(p => p.id === 'magnet')) {
    const head = state.snake.body[0]!;
    for (let i = state.foods.length - 1; i >= 0; i--) {
      const f = state.foods[i]!;
      if (f.x === head.x && f.y === head.y) {
        eatFood(i);
        break;
      }
    }
  }

  // Snake movement at moveIntervalTicks scaled by speedMultiplier
  state.ticksSinceMove++;
  const interval = Math.max(1, Math.round(state.moveIntervalTicks / state.speedMultiplier));
  if (state.ticksSinceMove >= interval) {
    state.ticksSinceMove = 0;
    advanceSnake();
  }

  // Chaos events
  if (MODES[state.mode].chaosEvents) {
    if (state.tick - lastChaosTick > 60 * 15) { // every ~15s
      lastChaosTick = state.tick;
      const ev = pickChaosEvent();
      ev.apply(state);
      flash(`hsla(${randInt(0, 360)}, 100%, 60%, 0.4)`, 280);
      const m = getMetrics();
      spawnText(chaosLabel(ev), m.fieldW / 2, m.fieldH / 2, { hue: randInt(0, 360), size: 48, life: 1.6, weight: 1.4 });
    }
  }

  // Maintain food count
  while (state.foods.length < state.maxFoods) {
    spawnFood(state, embedSpawnCfg(state.mode));
  }

  // BG/music intensity. Music reads multiple axes: score → BPM tier,
  // combo → arrangement tier (chill / tension / Primus-Igorrr), and active
  // power-ups nudge BPM/tier (fire heavier, ice calmer) plus add textures.
  const fire   = state.powerups.some(p => p.id === 'fire');
  const ice    = state.powerups.some(p => p.id === 'ice');
  const magnet = state.powerups.some(p => p.id === 'magnet');
  setMusicState(state.stats.score, state.combo.count, { fire, ice, magnet });
  state.bgIntensity = Math.min(1, state.stats.score / 400);
}

function advanceSnake(): void {
  if (!state) return;
  const newDir = consumeNextDirection(state.snake.dir);
  state.snake.pendingDir = newDir;

  stepSnake(state, newDir);

  // Collision
  const col = checkHeadCollision(state);
  if (col === 'wall') {
    if (MODES[state.mode].shouldEndOnCollision) {
      sfxBonk();
      addTrauma(0.4);
      emit(EVT.WALL_BONK);
      endGame();
      return;
    } else {
      // wrap (only relevant in modes where passWalls=false but we skipped; fallthrough)
    }
  } else if (col === 'self') {
    if (MODES[state.mode].shouldEndOnCollision || state.mode === 'relax') {
      sfxBonk();
      addTrauma(0.5);
      endGame();
      return;
    }
  }

  // Food consumption
  const head = state.snake.body[0]!;
  for (let i = state.foods.length - 1; i >= 0; i--) {
    const f = state.foods[i]!;
    if (f.x === head.x && f.y === head.y) {
      eatFood(i);
      break;
    }
  }
}

function eatFood(idx: number): void {
  if (!state) return;
  const f = state.foods[idx]!;
  state.foods.splice(idx, 1);

  bumpCombo(state);
  const baseScore = FOOD_SCORES[f.kind];
  const gained = Math.round(baseScore * state.combo.multiplier * state.scoreMultiplier);
  state.stats.score += gained;

  const view = getMetrics();
  const px = (f.x + 0.5) * view.cell;
  const py = (f.y + 0.5) * view.cell;
  const cell = view.cell;

  // Floating "+N"
  const hue = isPowerup(f.kind) ? f.hue || 280 : 50;
  spawnText(`+${gained}`, px, py - cell * 0.5, { hue, size: 28, life: 0.9 });

  // Particles
  if (isPowerup(f.kind)) {
    state.stats.powerupsEaten++;
    const total = bumpPowerupTotal();
    sfxPowerUp();
    spawnParticles({
      x: px, y: py, count: 36, speed: 240, life: 0.8,
      hue: f.hue || 280, hueJitter: 60, size: 4, sizeJitter: 3, drag: 0.92, shape: 'spark',
    });
    flash(`hsla(${f.hue || 280}, 100%, 65%, 0.5)`, 220);
    zoomPulse(0.05, 200);
    addTrauma(0.18);
    grow(state, 1);
    const id = powerUpForFood(f.kind);
    if (id) activatePowerUp(state, id);
    emit(EVT.EAT_POWERUP, id);
    if (total === 13 && !isFlag('skin:gold')) {
      setFlag('skin:gold', true);
      state.cosmetics.skin = 'gold';
      sfxEasterUnlock();
      spawnText('SKIN UNLOCKED  GOLD', getMetrics().fieldW / 2, getMetrics().fieldH / 2, { hue: 48, size: 42, life: 2 });
    } else if (total === 13) {
      state.cosmetics.skin = 'gold';
    }
  } else {
    state.stats.applesEaten++;
    if (isPerfectEmbed()) postPerfectEmbedProgress(state.stats.applesEaten);
    sfxEat(state.combo.count);
    spawnParticles({
      x: px, y: py, count: 12, speed: 180, life: 0.5,
      hue: f.hue, hueJitter: 30, size: 3, sizeJitter: 2, drag: 0.92, shape: 'circle',
    });
    flash('rgba(255,255,255,0.25)', 80);
    addTrauma(0.06);
    grow(state, f.kind === 'star' ? 3 : f.kind === 'cherry' ? 2 : 1);
    if (isPerfectEmbed() && checkPerfectEmbedAfterEat(state.stats.applesEaten)) {
      settlePerfectEmbed(true, state.stats.applesEaten);
      state.paused = true;
      stopMusic();
      const gM = getMetrics();
      spawnText('MISSÃO OK!', gM.fieldW / 2, gM.fieldH / 2, { hue: 130, size: 52, life: 2.4, weight: 1.5 });
      flash('rgba(80, 255, 160, 0.45)', 400);
    }
  }

  emit(EVT.EAT, f.kind);
  if (state.combo.count > 0 && state.combo.count % 3 === 0) {
    sfxComboUp(state.combo.count);
    flash(`hsla(${(state.combo.count * 30) % 360}, 100%, 70%, 0.35)`, 180);
    spawnText(`COMBO ×${state.combo.multiplier}`, getMetrics().fieldW / 2, getMetrics().fieldH * 0.18,
      { hue: (state.combo.count * 30) % 360, size: 44, life: 1.2, weight: 1.5 });
  }

  // Speed up classic-style every N apples
  const m = MODES[state.mode];
  const newInterval = m.moveIntervalForApples(state.stats.applesEaten);
  if (newInterval < state.moveIntervalTicks) {
    state.moveIntervalTicks = newInterval;
    sfxSpeedUp();
    flash('rgba(255, 255, 255, 0.18)', 120);
  }

  // Easter score milestones
  if (state.stats.score === 256) {
    flash('rgba(255, 255, 0, 0.6)', 320);
    spawnText('ROM OVERFLOW $0100', getMetrics().fieldW / 2, getMetrics().fieldH / 2, { hue: 60, size: 42, life: 2.2, weight: 1.4 });
    sfxEasterUnlock();
    emit(EVT.EASTER_OVERFLOW);
  }
  if (state.stats.score >= 1337 && state.cosmetics.skin !== 'matrix') {
    state.cosmetics.skin = 'matrix';
    flash('rgba(0, 255, 80, 0.5)', 400);
    spawnText('1337  MATRIX MODE', getMetrics().fieldW / 2, getMetrics().fieldH / 2, { hue: 120, size: 42, life: 2.2, weight: 1.4 });
    sfxEasterUnlock();
    emit(EVT.EASTER_MATRIX);
  }
}

// Speed-up trauma feedback
on(EVT.SPEED_UP, () => addTrauma(0.1));

// =====================================================
// Input pipeline (per frame)
// =====================================================
function pollInput(): void {
  const cmds = consumeCommands();

  if (cmds.togglePause) {
    if (screen === 'PLAY' && state) {
      state.paused = !state.paused;
    } else if (screen === 'MENU') {
      // ignore
    }
  }

  if (screen === 'MENU') {
    if (cmds.confirm) {
      const item = menuConfirm(menu);
      if (item === 'credits') { screen = 'CREDITS'; creditsScrollOffset = 0; creditsDragY = null; }
      else if (item === 'scores') { screen = 'SCORES'; scoresTab = 0; }
      else startGame(item);
    }
  } else if (screen === 'CREDITS') {
    if (cmds.back || cmds.confirm) {
      screen = 'MENU';
    }
  } else if (screen === 'SCORES') {
    if (cmds.back || cmds.confirm) {
      screen = 'MENU';
    }
  } else if (screen === 'GAMEOVER') {
    // Name entry phase blocks restart/back until confirmed
    if (nameEntry === null) {
      if (cmds.confirm || cmds.restart) {
        if (state) startGame(state.mode); else startGame('classic');
      }
      if (cmds.back) {
        returnToMenu();
      }
    }
  } else if (screen === 'PLAY') {
    if (!confirmQuit && cmds.restart) {
      if (state) startGame(state.mode);
    }
    if (cmds.back) {
      if (!confirmQuit) {
        confirmQuitWasPaused = state?.paused ?? false;
        confirmQuit = true;
        if (state) state.paused = true;
      } else {
        // Second ESC = cancel
        confirmQuit = false;
        if (state) state.paused = confirmQuitWasPaused;
      }
    }
    if (confirmQuit && cmds.confirm) {
      returnToMenu();
    }
  }
}

// Menu arrow navigation + name entry character capture.
window.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.repeat) return;

  if (screen === 'SPLASH') { goToMenu(); return; }

  // Confirm-quit dialog: Y/N intercept before any other handler
  if (screen === 'PLAY' && confirmQuit) {
    if (e.key === 'y' || e.key === 'Y') {
      e.preventDefault();
      returnToMenu();
      return;
    }
    if (e.key === 'n' || e.key === 'N') {
      e.preventDefault();
      confirmQuit = false;
      if (state) state.paused = confirmQuitWasPaused;
      consumeCommands();
      return;
    }
  }

  // Name entry: capture characters before any other handler
  if (screen === 'GAMEOVER' && nameEntry !== null) {
    // On touch, the native keyboard feeds the hidden <input>, which owns the
    // value via its own listeners — don't double-process those key events.
    if ((e.target as HTMLElement | null)?.classList.contains('tc-name-input')) return;
    if (e.key === 'Enter') {
      confirmNameEntry();
      consumeCommands(); // drena o 'confirm' para não acionar restart na próxima frame
      return;
    }
    if (e.key === 'Escape') {
      confirmNameEntry();
      consumeCommands(); // drena o 'back' para não acionar returnToMenu duas vezes
      returnToMenu();
      return;
    }
    if (e.key === 'Backspace') {
      nameEntry.name = nameEntry.name.slice(0, -1);
      // NÃO consome commands — keyboard.ts já setou back=true, mas nameEntry≠null
      // bloqueia no pollInput enquanto ainda estamos digitando.
      return;
    }
    if (e.key.length === 1 && nameEntry.name.length < 8 && isAllowedChar(e.key)) {
      nameEntry.name += e.key.toUpperCase();
      return;
    }
    return; // swallow all other keys during name entry
  }

  if (screen === 'CREDITS') {
    if (e.code === 'Escape' || e.code === 'Enter' || e.code === 'Space') {
      e.preventDefault();
      screen = 'MENU';
    }
    return;
  }

  if (screen === 'SCORES') {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      scoresTab = ((scoresTab - 1) + SCORE_MODES.length) % SCORE_MODES.length;
    } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      scoresTab = (scoresTab + 1) % SCORE_MODES.length;
    }
    return;
  }

  if (screen === 'MENU') {
    startMenuMusic(); // safe no-op if already running; requires user gesture (keydown satisfies it)
    if (e.code === 'ArrowUp' || e.code === 'KeyW') menuMoveUp(menu);
    else if (e.code === 'ArrowDown' || e.code === 'KeyS') menuMoveDown(menu);
  }
  if (e.code === 'KeyM') {
    muted = !muted;
    setMuted(muted);
  }
});

// =====================================================
// Render — chooses screen
// =====================================================
function render(alpha: number, frameDtMs: number): void {
  timeMs = performance.now();
  const m = getMetrics();

  // Keep the touch control layer in sync with the current screen (no-op on
  // desktop — the overlay is display:none on fine pointers). Cheap: it only
  // touches the DOM when the screen actually changes.
  syncTouchControls(screen, nameEntry !== null, confirmQuit);

  // Update FX
  updateParticles(frameDtMs / 1000);
  updateFloating(frameDtMs / 1000);
  tickFlashes(frameDtMs / 1000);

  // Background canvas (separate)
  const bgIntensity = state ? state.bgIntensity : 0.2;
  const disco = state?.cosmetics.discoMode || screen === 'MENU';
  updateBackground(timeMs, bgIntensity, !!disco && state !== null);

  if (screen === 'SPLASH') {
    const ctx = gameCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, m.cssWidth, m.cssHeight);
    renderSplash(ctx, m.cssWidth, m.cssHeight, timeMs);
    return;
  }

  if (screen === 'MENU') {
    const ctx = (gameCanvas.getContext('2d')!);
    ctx.clearRect(0, 0, m.cssWidth, m.cssHeight);
    renderMenu(ctx, menu, m.cssWidth, m.cssHeight, timeMs);
    return;
  }

  if (screen === 'CREDITS') {
    const ctx = (gameCanvas.getContext('2d')!);
    renderCredits(ctx, m.cssWidth, m.cssHeight, timeMs, creditsScrollOffset);
    return;
  }

  if (screen === 'SCORES') {
    const ctx = gameCanvas.getContext('2d')!;
    ctx.clearRect(0, 0, m.cssWidth, m.cssHeight);
    renderScores(ctx, m.cssWidth, m.cssHeight, timeMs, scoresTab);
    return;
  }

  if (screen === 'PLAY' && state) {
    const expr: Expression = computeExpression(state, timeMs);
    renderFrame(state, alpha, timeMs, expr);
    if (confirmQuit) {
      renderConfirmQuitOverlay(gameCanvas.getContext('2d')!, m.cssWidth, m.cssHeight, timeMs);
    }
    return;
  }

  if (screen === 'GAMEOVER' && state) {
    // freeze frame of gameplay underneath
    renderFrame(state, 0, timeMs, 'dead');
    const ctx = gameCanvas.getContext('2d')!;
    renderGameOver(ctx, state, m.cssWidth, m.cssHeight, timeMs, isNewHighThisRun, nameEntry ? { name: nameEntry.name } : null);
  }
}

function renderConfirmQuitOverlay(ctx: CanvasRenderingContext2D, w: number, h: number, now: number): void {
  ctx.save();

  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, 0, w, h);

  const pw = Math.min(460, w * 0.86);
  const ph = 210;
  const px = (w - pw) / 2;
  const py = (h - ph) / 2;
  const pulse = 0.6 + 0.4 * Math.sin(now / 280);

  // Panel background
  ctx.fillStyle = 'rgba(8, 2, 26, 0.96)';
  ctx.fillRect(px, py, pw, ph);

  // Neon border
  ctx.strokeStyle = `rgba(255, 50, 90, ${pulse})`;
  ctx.lineWidth = 2;
  ctx.shadowColor = `rgba(255, 50, 90, ${pulse * 0.9})`;
  ctx.shadowBlur = 18;
  ctx.strokeRect(px, py, pw, ph);
  ctx.shadowBlur = 0;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Title
  ctx.font = 'bold 42px "Rubik Iso", monospace';
  ctx.fillStyle = '#ff3c64';
  ctx.shadowColor = 'rgba(255, 60, 100, 0.8)';
  ctx.shadowBlur = 16;
  ctx.fillText(t('quit.title'), w / 2, py + 70);
  ctx.shadowBlur = 0;

  // Hint line 1
  ctx.font = '18px "Bitcount Grid Double", monospace';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.80)';
  ctx.fillText(t('quit.confirm'), w / 2, py + 138);

  // Hint line 2
  ctx.font = '16px "Bitcount Grid Double", monospace';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.50)';
  ctx.fillText(t('quit.resume'), w / 2, py + 170);

  ctx.restore();
}

function computeExpression(s: GameState, _now: number): Expression {
  if (!s.snake.alive) return 'dead';
  // Eat: just bumped combo within last 8 ticks
  if (s.combo.count > 0 && s.combo.decayTicks > s.combo.decayMax - 12) return 'eat';
  if (s.powerups.some(p => p.id === 'fire')) return 'fire';
  if (s.powerups.some(p => p.id === 'ice'))  return 'ice';
  if (s.combo.count >= 6) return 'combo';
  // Panic if near wall and walls kill
  if (!s.passWalls) {
    const h = s.snake.body[0];
    const gW = gridW();
    const gH = gridH();
    if (h && (h.x <= 0 || h.x >= gW - 1 || h.y <= 0 || h.y >= gH - 1)) return 'panic';
  }
  return 'idle';
}

// Voltar para o menu via Backspace ja tratado em pollInput; menu↔jogo flow ok.

// Boot: wait for fonts so the very first frame uses Rubik Iso / Bitcount,
// then start the animation loop.
ensureFontsLoaded().then(() => {
  startLoop({
    pollInput,
    simulate,
    render,
  });
  document.body.style.opacity = '1';
  if (perfectEmbedCfg) {
    initPerfectEmbed(perfectEmbedCfg);
    splashDone = true;
    startGame('timeattack');
    handleResize();
    requestAnimationFrame(() => handleResize());
  }
});

// Stat flag warm-up (so menu shows them on first run)
void getPowerupTotal();
void isMuted;

// Service worker — production only, registered off the critical path. A SW
// on the Vite dev server would poison HMR and the dev-only Audio Lab, so
// this follows the same import.meta.env.DEV guard discipline as §22: in the
// prod build DEV is statically false and the SW registers; in dev it
// early-returns before any effect.
function registerServiceWorker(): void {
  if (import.meta.env.DEV) return;
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    // Relative path → scope is the deploy dir, correct under a sub-path
    // mount (e.g. /neonophis/). Best-effort: offline is an enhancement.
    void navigator.serviceWorker.register('sw.js').catch(() => undefined);
  });
}
registerServiceWorker();
