// Touch control layer — §16. Lives entirely inside #touch-overlay, which is
// `display:none` on fine pointers, so the desktop/keyboard path is untouched.
//
// Steering on touch is handled by swipe (input/touch.ts) — there is no
// on-screen D-pad on purpose (it overlapped the playfield). This layer only
// adds what swipe can't express: menu tap, pause/quit, confirm, game-over
// actions and name entry. Every button reuses the exact same `injectCommand`
// flags the keyboard already drives (§5); the menu tap uses the render
// geometry's `menuHitTest` so "tap the mode you want" lands on the right row.

import type { InjectableCommand } from './keyboard';
import { modeLabel, modeBlurb, type ModeId } from '../gameplay/modes';
import { MENU_ITEMS, menuHitTest } from '../ui/menu';
import { getHighScores } from '../storage/highscores';
import { t, availableLangs, getLang, langInfo, type Lang } from '../i18n';

type Screen = 'SPLASH' | 'MENU' | 'PLAY' | 'GAMEOVER' | 'CREDITS' | 'SCORES';

export interface TouchControlsOpts {
  overlay: HTMLElement;
  onCommand: (c: InjectableCommand) => void;
  onStartMode: (m: ModeId) => void;
  onShowCredits: () => void;
  onConfirmName: () => void;
  setName: (n: string) => void;
  onMenuActivate?: () => void;
  onMenuIndex?: (idx: number) => void;
  onSplashStart?: () => void;
  onSetLang?: (l: Lang) => void;
  onShowScores?: () => void;
  onScoresPrev?: () => void;
  onScoresNext?: () => void;
}

let opts: TouchControlsOpts | null = null;
let nameInput: HTMLInputElement | null = null;
let lastTc = '';

// Nodes whose text comes from i18n — refreshTouchLabels() re-applies t() to
// these when the language changes (they are built once, unlike canvas text
// which re-reads every frame).
const i18nNodes: { el: HTMLElement; key: string }[] = [];
const langBtns: { el: HTMLElement; lang: Lang }[] = [];

function tnode<K extends keyof HTMLElementTagNameMap>(
  tag: K, cls: string, key: string,
): HTMLElementTagNameMap[K] {
  const node = el(tag, cls, t(key));
  i18nNodes.push({ el: node, key });
  return node;
}

let pendingMode: ModeId | null = null;
let modeModalEl: HTMLElement | null = null;
let modeModalTitleEl: HTMLElement | null = null;
let modeModalBlurbEl: HTMLElement | null = null;
let modeModalHiEl: HTMLElement | null = null;

function fillModeModal(modeId: ModeId): void {
  if (modeModalTitleEl) modeModalTitleEl.textContent = modeLabel(modeId);
  if (modeModalBlurbEl) modeModalBlurbEl.textContent = modeBlurb(modeId);
  if (modeModalHiEl) {
    const hi = getHighScores(modeId)[0];
    modeModalHiEl.textContent = hi ? `${t('menu.hi')}  ${hi.score}` : '';
    modeModalHiEl.style.display = hi ? '' : 'none';
  }
}

function openModeModal(modeId: ModeId): void {
  pendingMode = modeId;
  fillModeModal(modeId);
  modeModalEl?.classList.add('active');
}

function closeModeModal(): void {
  pendingMode = null;
  modeModalEl?.classList.remove('active');
}

const NAME_RE = /[^A-Z0-9 ]/g;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, cls: string, text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

// pointerdown = zero-latency (no 300ms tap delay, no synthetic click).
function onTap(node: HTMLElement, fn: () => void): void {
  node.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    fn();
  });
  // Swallow the touch so #touch-overlay's swipe handler never sees it
  // (prevents a button drag from also queuing a swipe direction, and keeps
  //  its preventDefault from eating the name-input focus on iOS).
  node.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
}

export function initTouchControls(o: TouchControlsOpts): void {
  opts = o;
  const root = el('div', 'tc-root');

  // ── Menu: full-area tap catcher ────────────────────────────────────────
  const menuCatch = el('div', 'tc-menucatch');
  menuCatch.addEventListener('pointerdown', () => o.onMenuActivate?.());
  menuCatch.addEventListener('pointerup', (e) => {
    // Tap outside an open mode modal = close it
    if (pendingMode !== null) { closeModeModal(); return; }
    const r = o.overlay.getBoundingClientRect();
    const idx = menuHitTest(r.width, r.height, e.clientX - r.left, e.clientY - r.top);
    if (idx === null) return;
    const item = MENU_ITEMS[idx];
    if (item === 'credits') o.onShowCredits();
    else if (item === 'scores') o.onShowScores?.();
    else if (item !== undefined) { o.onMenuIndex?.(idx); openModeModal(item as ModeId); }
  });
  menuCatch.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
  const menuHint = tnode('div', 'tc-menuhint', 'touch.tapMode');

  // ── Play: top bar (steering is swipe — input/touch.ts) ─────────────────
  const topbar = el('div', 'tc-topbar');
  const pauseBtn = el('button', 'tc-pill', 'II');
  pauseBtn.setAttribute('aria-label', 'pause');
  onTap(pauseBtn, () => opts?.onCommand('togglePause'));
  const quitBtn = el('button', 'tc-pill', '✕');
  quitBtn.setAttribute('aria-label', 'quit');
  onTap(quitBtn, () => opts?.onCommand('back'));
  topbar.append(pauseBtn, quitBtn);

  // ── Confirm quit: YES / NO ─────────────────────────────────────────────
  const confirm = el('div', 'tc-modal');
  const confirmTitle = tnode('div', 'tc-modal-title', 'quit.title');
  const confirmRow = el('div', 'tc-modal-row');
  const yesBtn = tnode('button', 'tc-action tc-danger', 'common.yes');
  onTap(yesBtn, () => opts?.onCommand('confirm'));
  const noBtn = tnode('button', 'tc-action', 'common.no');
  onTap(noBtn, () => opts?.onCommand('back')); // 2nd back = cancel (main.ts)
  confirmRow.append(yesBtn, noBtn);
  confirm.append(confirmTitle, confirmRow);

  // ── Game over: PLAY AGAIN / MENU ───────────────────────────────────────
  const over = el('div', 'tc-overbar');
  const againBtn = tnode('button', 'tc-action tc-primary', 'touch.playAgain');
  onTap(againBtn, () => opts?.onCommand('restart'));
  const menuBtn = tnode('button', 'tc-action', 'common.menu');
  onTap(menuBtn, () => opts?.onCommand('back'));
  over.append(againBtn, menuBtn);

  // ── Name entry: real input (tap = native keyboard) + OK ────────────────
  const name = el('div', 'tc-name');
  const label = tnode('div', 'tc-name-label', 'touch.tapName');
  const input = el('input', 'tc-name-input');
  input.type = 'text';
  input.maxLength = 8;
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.setAttribute('autocorrect', 'off');
  input.setAttribute('autocapitalize', 'characters');
  input.setAttribute('enterkeyhint', 'done');
  input.placeholder = '———';
  const okBtn = tnode('button', 'tc-action tc-primary', 'common.ok');
  const commitName = (): void => {
    opts?.onConfirmName();
    input.blur();
  };
  input.addEventListener('input', () => {
    const clean = input.value.toUpperCase().replace(NAME_RE, '').slice(0, 8);
    if (clean !== input.value) input.value = clean;
    opts?.setName(clean);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commitName(); }
  });
  // Don't let the overlay swipe handler preventDefault the focus gesture.
  input.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
  onTap(okBtn, commitName);
  name.append(label, input, okBtn);
  nameInput = input;

  // ── Credits: single BACK button ───────────────────────────────────────
  const creditsBack = el('div', 'tc-creditsback');
  const creditsBackBtn = tnode('button', 'tc-action', 'common.back');
  onTap(creditsBackBtn, () => opts?.onCommand('back'));
  creditsBack.appendChild(creditsBackBtn);

  // ── Scores: PREV mode / BACK / NEXT mode ──────────────────────────────
  const scoresBar = el('div', 'tc-scoresbar');
  const scoresPrevBtn = el('button', 'tc-action', '◀');
  scoresPrevBtn.setAttribute('aria-label', 'previous mode');
  onTap(scoresPrevBtn, () => opts?.onScoresPrev?.());
  const scoresBackBtn = tnode('button', 'tc-action', 'common.back');
  onTap(scoresBackBtn, () => opts?.onCommand('back'));
  const scoresNextBtn = el('button', 'tc-action', '▶');
  scoresNextBtn.setAttribute('aria-label', 'next mode');
  onTap(scoresNextBtn, () => opts?.onScoresNext?.());
  scoresBar.append(scoresPrevBtn, scoresBackBtn, scoresNextBtn);

  // ── Mode select modal (mobile only — tap mode → info + JOGAR) ─────────
  const modeModal = el('div', 'tc-mode-modal');
  const modeModalTitle = el('div', 'tc-mode-modal-title', '');
  const modeModalBlurb = el('div', 'tc-mode-modal-blurb', '');
  const modeModalHi = el('div', 'tc-mode-modal-hi', '');
  const modeModalRow = el('div', 'tc-mode-modal-row');
  const playBtn = tnode('button', 'tc-action tc-primary', 'common.play');
  onTap(playBtn, () => {
    if (pendingMode) { const m = pendingMode; closeModeModal(); opts?.onStartMode(m); }
  });
  const modeBackBtn = tnode('button', 'tc-action', 'common.back');
  onTap(modeBackBtn, () => closeModeModal());
  modeModalRow.append(playBtn, modeBackBtn);
  modeModal.append(modeModalTitle, modeModalBlurb, modeModalHi, modeModalRow);
  // Stop taps inside the modal from propagating to the backdrop (menuCatch)
  modeModal.addEventListener('pointerdown', (e) => e.stopPropagation());
  modeModal.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
  modeModalEl = modeModal;
  modeModalTitleEl = modeModalTitle;
  modeModalBlurbEl = modeModalBlurb;
  modeModalHiEl = modeModalHi;

  // ── Splash: centered play button ──────────────────────────────────────
  const splashEl = el('div', 'tc-splash');
  const splashBtn = tnode('button', 'tc-action tc-primary', 'common.play');
  onTap(splashBtn, () => opts?.onSplashStart?.());
  splashEl.appendChild(splashBtn);

  // ── Language toggle (splash + menu) ────────────────────────────────────
  const langRow = el('div', 'tc-lang');
  for (const lang of availableLangs()) {
    const info = langInfo(lang);
    const b = el('button', 'tc-langbtn', info.short);
    if (lang === getLang()) b.classList.add('active');
    onTap(b, () => opts?.onSetLang?.(lang));
    langRow.appendChild(b);
    langBtns.push({ el: b, lang });
  }

  root.append(menuCatch, menuHint, topbar, confirm, over, name, creditsBack, scoresBar, modeModal, splashEl, langRow);
  o.overlay.appendChild(root);
}

// Re-apply i18n text to the built-once overlay nodes (canvas text re-reads
// t() every frame; the DOM does not). Wired to onLangChange in main.ts.
export function refreshTouchLabels(): void {
  for (const n of i18nNodes) n.el.textContent = t(n.key);
  const active = getLang();
  for (const b of langBtns) b.el.classList.toggle('active', b.lang === active);
  // The mode modal is filled on open — refresh it too if it's showing.
  if (pendingMode !== null) fillModeModal(pendingMode);
}

// Called once per frame from render(); only touches the DOM when the
// screen actually changes, so it costs nothing on the hot path (§18).
export function syncTouchControls(
  screen: Screen, nameEntry: boolean, confirmQuit: boolean,
): void {
  if (!opts) return;
  let tc: string;
  if (screen === 'SPLASH') tc = 'splash';
  else if (screen === 'MENU') tc = 'menu';
  else if (screen === 'CREDITS') tc = 'credits';
  else if (screen === 'SCORES') tc = 'scores';
  else if (screen === 'PLAY') tc = confirmQuit ? 'confirm' : 'play';
  else tc = nameEntry ? 'name' : 'gameover';

  if (tc === lastTc) return;
  lastTc = tc;
  opts.overlay.dataset.tc = tc;
  if (tc !== 'menu' && pendingMode !== null) closeModeModal();

  // Fresh field every time the name prompt opens.
  if (tc === 'name' && nameInput) {
    nameInput.value = '';
    opts.setName('');
  }
}
