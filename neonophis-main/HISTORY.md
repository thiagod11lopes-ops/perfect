# HISTORY.md — Append-only session log

> One entry per session. Never edit past entries. Newest at the top.
> Format:
>
> ```
> ## YYYY-MM-DD — short title
> **Model:** model name (Opus 4.7, Haiku 4.5, etc.)
> **Goal:** one-line.
> **Outcome:** one-line + bullet list.
> **Artifacts:** files added/changed.
> **Decisions:** link DECISION_LOG entries.
> ```

---

## 2026-05-18 — Session 17: PWA / offline (service worker + manifest + icons)

**Model:** Opus 4.7.
**Goal:** Make the game an installable PWA that plays 100% offline, without
breaking hi-score sync, dev HMR, the Audio Lab, or the sub-path deploy.
**Outcome:** Installable, `display: fullscreen`, fully offline after one
online visit. Hand-rolled zero-dep service worker (Option A: runtime
cache-first, chosen by the user after the A-vs-B tradeoff was explained).
Bundle unchanged; ~10 guarded lines in `main.ts`.

- `assets/src/icon.svg` — new master glyph (the inline favicon, scaled 8×).
- `scripts/build-assets.sh` — new; ImageMagick MVG pipeline (no SVG
  rasterizer in env, so the icon is rebuilt from native vector ops +
  native gradient, deterministic). Emits `public/icons/{icon-192,icon-512,
  icon-512-maskable,apple-touch-icon}.png` + `favicon.ico`. ~32 KB total
  (§7.5 budget 50 KB). `npm run assets` added.
- `public/manifest.webmanifest` — new; fullscreen + display_override,
  relative start_url/scope/id (sub-path safe), brand strings English.
- `public/sw.js` — new; `__api/*` network-only, navigation network-first
  w/ timeout, `/assets/*` cache-first (Vite hash = immutable), install
  scrapes index.html for the hashed bundle URLs to precache (closes the
  "bundle fetched before SW controls page" gap with no build plugin).
- `index.html` — manifest link, apple-touch-icon, iOS PWA metas, .ico
  legacy fallback (inline SVG favicon kept).
- `src/main.ts` — `registerServiceWorker()`, prod-only via
  `import.meta.env.DEV` guard (mirrors §22), on `window load`.
- `CLAUDE.md` — new §24 PWA / OFFLINE.

**Artifacts changed:**
- `assets/src/icon.svg` (new), `scripts/build-assets.sh` (new),
  `public/manifest.webmanifest` (new), `public/sw.js` (new),
  `public/icons/*` (new), `index.html`, `src/main.ts`, `package.json`,
  `CLAUDE.md`, `DECISION_LOG.md`, `HANDOFF.md`.

**Decisions:** `DECISION_LOG.md` → 2026-05-18 — PWA / offline.
**Ops note:** production Apache must serve `sw.js` with `Cache-Control:
no-cache` and `manifest.webmanifest` as `application/manifest+json` (see
HANDOFF) — required for update propagation; deliberately left as a manual
step (user owns the VPS).

## 2026-05-17 — Session 16: Relax mode — tail collision rework + visual warning

**Model:** Sonnet 4.6.
**Goal:** Make Relax mode more interesting: biting the tail tip ends the run,
but passing through the rest of the body stays harmless; add a pulsing red
tail glow so the player always knows what to avoid.
**Outcome:** Self-collision in Relax is now tail-tip-only and ends the game
normally (score saved, game over screen, play-again flow). The tail glows
red-orange and reacts to music intensity.

- `src/gameplay/collision.ts` — `checkHeadCollision` now has a Relax branch:
  only the last body cell (`body[body.length - 1]`) is lethal; the rest of
  the body is passable. All other modes unchanged.
- `src/main.ts` — self-collision handler unified: `shouldEndOnCollision ||
  mode === 'relax'` both call `endGame()`. The old "harmless nibble + body
  trim" code for Relax removed.
- `src/render/snakeRenderer.ts` — tail warning glow added (Relax only): two
  concentric arcs drawn over the last segment with `globalCompositeOperation
  = 'lighter'`. Pulse period, glow radius, hue (orange-red → pure red) and
  alpha all scale with `state.bgIntensity` (0..1) so the warning intensifies
  exactly as the music heats up.
- `src/i18n/locales/en.json` — `mode.relax.blurb`: "No stress. Just colors.
  Try not to bite your own tail."
- `src/i18n/locales/pt.json` — `mode.relax.blurb`: "Treine, relaxe e tente
  não morder o próprio rabo."

**Artifacts changed:**
- `src/gameplay/collision.ts`
- `src/main.ts`
- `src/render/snakeRenderer.ts`
- `src/i18n/locales/en.json`
- `src/i18n/locales/pt.json`

**Decisions:** None new — follows §10 (grid collision) and §12 (juice/feedback)
patterns. The tail-tip-only rule is documented inline in `collision.ts`.

---

## 2026-05-17 — Session 15: HIGH SCORES screen + Android touch fixes

**Model:** Sonnet 4.6.
**Goal:** Add a dedicated High Scores screen accessible from the main menu,
with per-mode tab navigation and full mobile support.
**Outcome:** New `SCORES` screen wired end-to-end; Android nav-bar overlap
fixed for bottom touch buttons on credits and scores.

- New `src/ui/scores.ts`: canvas-rendered screen with animated title,
  mode tab (chevrons + progress dots), top-5 table per mode (rank/name/
  score/date columns; date hidden on narrow), and a "no records yet"
  empty state. Chevron pad uses `min(w×0.25+60, 320)` to stay near the
  label on large canvases without overlapping the table columns.
- `src/ui/menu.ts`: `MenuItem` extended with `'scores'`; added between
  the 4 modes and `'credits'`; cyan blurb ("o salão dos campeões").
- `src/main.ts`: `'SCORES'` added to `Screen` union; `scoresTab` state;
  `pollInput` handles back/confirm exit; `keydown` handles `←/→`/`A/D`
  tab cycling; `render` block; `onShowScores`/`onScoresPrev`/
  `onScoresNext` callbacks wired to `initTouchControls`.
  Separate swipe listener on `touchOverlay` (same pattern as credits
  scrub): left swipe = next mode, right swipe = prev mode, 40 px threshold.
- `src/input/touchControls.ts`: `Screen` union updated; `onShowScores`,
  `onScoresPrev`, `onScoresNext` added to opts; `tc-scoresbar` built
  (◀ VOLTAR ▶ buttons); `syncTouchControls` maps `'SCORES' → 'scores'`;
  menu tap handler: `item === 'scores'` calls `onShowScores` (was falling
  through to `openModeModal`, opening the game-mode popup by mistake).
- `index.html`: `tc-scoresbar` added to the hidden-by-default list and
  the `data-tc="scores"` visibility rule; `.tc-scoresbar` CSS (gap +
  compact button override `min-width: 56px`).
- Android bottom-bar overlap: `tc-creditsback` and `tc-scoresbar` both
  raised from `bottom: 22px` → `bottom: 80px` so they clear the Android
  3-button / gesture nav bar even when `env(safe-area-inset-bottom)` is 0.
- i18n: `menu.scores`, `menu.scoresBlurb`, `scores.title`,
  `scores.noEntries`, `scores.controls` added to both `en.json` and
  `pt.json`.

**Verification:**
- `npx tsc --noEmit` clean; `npm run build` green, 43 modules,
  **83.6 KB JS + 28.1 KB CSS** (≈ 30.5 KB gzipped JS; target < 100 KB).

**Artifacts changed:**
- `src/ui/scores.ts` (new).
- `src/ui/menu.ts` — `MenuItem` + `MENU_ITEMS` + blurb branch.
- `src/main.ts` — `SCORES` screen, `scoresTab`, swipe listener.
- `src/input/touchControls.ts` — `tc-scoresbar`, `onShowScores`,
  prev/next callbacks, `syncTouchControls`.
- `index.html` — `tc-scoresbar` CSS + visibility; bottom offset fix.
- `src/i18n/locales/en.json` + `pt.json` — scores keys.

**Decisions:** None new — implementation follows §15 patterns (same
screen/touch/i18n architecture as credits).

---

## 2026-05-17 — Session 14: internationalization (PT/EN i18n)

**Model:** Opus 4.7.
**Goal:** Add internationalization with both English and Portuguese,
JSON-per-language and open to new languages — user request, suggestion
asked for first.
**Outcome:** Every player-facing string now resolves through a
zero-dependency i18n table. PT/EN switchable via flag pills on splash
and menu; no desktop behaviour weakened.

- New `src/i18n/`: `locales/en.json` + `pt.json` + `index.ts`. Locales
  auto-discovered via `import.meta.glob` (same pattern as
  `audio/musicConfig.ts`) — a new `xx.json` is selectable with zero
  code change. `t(key, params?)` is the only call site; no-params path
  is allocation-free (safe in the per-frame canvas render, §18).
- Language resolution: saved choice (`localStorage:neonophis:lang`) →
  `navigator.language` → `en`. Switching rewrites `<html lang>` / title
  / meta description and fires `onLangChange` for the DOM.
- `ui/langToggle.ts`: shared geometry fn for canvas render + click
  hit-test (mirrors `menuHitTest`); flags drawn procedurally (emoji
  flags degrade to letter pairs on Windows / are unreliable on canvas).
  Toggle is flag-only, no keyboard (user choice); desktop = canvas
  click, mobile = DOM pills in `#touch-overlay` (the §16 split; canvas
  toggle no-ops under `pointer: coarse`).
- Strings extracted from splash, menu, HUD (`render/ui.ts`), game over,
  credits (now key-based with literal fallback for proper nouns),
  confirm-quit, chaos events, and the touch overlay DOM
  (`refreshTouchLabels()` re-applies on language change).
- `ModeConfig` dropped `label`/`blurb` → `modeLabel()`/`modeBlurb()`
  resolve via `t()`; `ChaosEvent.label` → `labelKey`.
- Per user hand-edits: `tagline`, meta description and product name stay
  English in *all* locales (brand identity, not a missing translation).

**Verification:**
- `npm run typecheck` clean; `npm run build` green, 42 modules.
- Production bundle **~26.5 KB JS + 20.9 KB CSS gzipped** (~47 KB
  total; target <100 KB). Dev-only lab guard not tripped; lab
  unaffected (doesn't use mode/chaos labels). Grep confirms no
  hardcoded user-facing strings remain outside locale JSON (only
  comments). Browser pass for PT-length layout still pending (could
  not drive a browser).

**Artifacts changed:**
- `src/i18n/{index.ts,locales/en.json,locales/pt.json}` (new).
- `src/ui/langToggle.ts` (new) — shared canvas flag toggle.
- `src/gameplay/modes.ts` — `modeLabel`/`modeBlurb`/`chaosLabel`,
  `labelKey`.
- `src/ui/{splash,menu,gameover,credits}.ts`, `src/render/ui.ts` —
  strings via `t()`; splash/menu draw the toggle.
- `src/input/touchControls.ts` — DOM strings via `t()` +
  `refreshTouchLabels()` + DOM lang pills; `onSetLang` opt.
- `src/main.ts` — desktop canvas lang-click + `onLangChange` wiring.
- `index.html` — `.tc-lang` styles + per-screen visibility.
- `CLAUDE.md` §23 (new), `DECISION_LOG.md`, `HANDOFF.md`, `HISTORY.md`.

**Decisions:** `DECISION_LOG.md` 2026-05-17 — "Internacionalização
PT/EN orientada a dados (i18n)".

---

## 2026-05-16 — Session 13: mobile playable (touch layer) + bg DPR fix

**Model:** Opus 4.7.
**Goal:** Make NEON OPHIS actually playable on smartphones without
disturbing desktop — user reported "sem touch e não agradável", then a
strange background on mobile.
**Outcome:** Mobile is end-to-end playable; background fills the screen.
Zero desktop changes (everything gated by `pointer: coarse`).

- Diagnosis: only swipe fed the direction buffer; menu / pause / quit /
  restart / name-entry were keyboard-only → a phone could not even
  start a game or type a hi-score name.
- New `src/input/touchControls.ts`: screen-aware DOM layer inside
  `#touch-overlay` — menu-row tap to start, pause/quit pills, QUIT?
  YES/NO, PLAY AGAIN/MENU, and a native-keyboard `<input>` for name
  entry. Buttons reuse the keyboard's shared command flags via the new
  `injectCommand`; `ui/menu.ts` exposes `MENU_ORDER`/`menuHitTest`
  (pure refactor) so the tap hit-test shares the render geometry.
- Per user feedback the first-pass on-screen D-pad was removed —
  steering stays **swipe-only by decision**.
- Background DPR bug fixed: `background.ts` now draws in CSS space
  (dims captured at resize), matching `renderer.ts`; it had been
  shrinking to ~2/3 of the screen on DPR-3 phones.
- `main.ts`: one `initTouchControls` + one `syncTouchControls` per
  frame + a guard so the native keyboard doesn't double-feed the
  name-entry `keydown` handler.

**Verification:**
- `npm run typecheck` clean; `npm run build` green, 36 modules.
- Production bundle **~20.8 KB JS + 20.9 KB CSS gzipped** (~42 KB
  total; target <100 KB). Dev-only lab guard not tripped. Grep
  confirms no dangling D-pad / `onDir` references.
- User confirmed on device: "Funcionou!" (touch + background).

**Artifacts changed:**
- `src/input/touchControls.ts` (new) — DOM touch control layer.
- `src/input/keyboard.ts` — `injectCommand` + `InjectableCommand`.
- `src/ui/menu.ts` — `MENU_ORDER` + `menuLayout` + `menuHitTest`
  (renderMenu refactored onto the shared geometry; no visual change).
- `src/render/background.ts` — draw in CSS space; DPR-cap consistency.
- `src/main.ts` — wire touch layer; name-entry double-process guard.
- `index.html` — touch-control CSS, `#touch-overlay` z-index 4 → 7.
- `CLAUDE.md` §16 — updated to the real touch architecture.
- `DECISION_LOG.md` — two new entries (touch layer; bg DPR).
- `HANDOFF.md` — rewritten to current state.

**Decisions:** `DECISION_LOG.md` 2026-05-16 — "Mobile: swipe-only
steering + contextual DOM touch layer" and "Background canvas desenha
em espaço CSS (consistência do cap de DPR)".

---

## 2026-05-16 — Session 12: Confirm-quit dialog (ESC safety)

**Model:** Sonnet 4.6.
**Goal:** Evitar saída acidental ao menu ao apertar ESC durante uma run.
**Outcome:** Overlay de confirmação arcade implementado; zero regressões.

- Primeiro ESC pausa o jogo e exibe overlay neon "QUIT?" sobre o frame
  atual. Y/Enter confirma; N/ESC cancela e retoma exatamente no estado
  anterior (respeita se a run já estava pausada antes).
- `confirmQuitWasPaused` preserva o estado de pausa preexistente.
- R (restart) bloqueado enquanto o diálogo está aberto.
- Fonte do título ajustada de 30 px → 42 px (legibilidade).

**Artifacts changed:** `src/main.ts` — flags `confirmQuit` /
`confirmQuitWasPaused`, modificações em `pollInput()`, listener `keydown`,
`startGame()`, `returnToMenu()`, nova função `renderConfirmQuitOverlay()`.

**Decisions:** ver DECISION_LOG 2026-05-16 — Confirm-quit dialog.

---

## 2026-05-15 — Session 11: dev-only Audio Lab + data-driven music engine

**Model:** Opus 4.7.
**Goal:** Build an internal mini-DAW / audio debug console to author,
visualize, tune and export the game's procedural soundtrack — strictly
dev-only, zero production footprint.
**Outcome:** Shipped, typecheck clean, production build verified to
exclude the lab entirely.

- **Music engine refactored to data:** every hardcoded constant /
  probability / drum pattern / ADSR / gain moved out of `music.ts` into
  a typed `MusicConfig` tree in `src/audio/musicConfig.ts`
  (`DEFAULT_MUSIC_CONFIG`). Values lifted one-for-one → default boot is
  bit-identical to the pre-refactor sound. `music.ts` is now a pure
  interpreter; pure helpers `computeBpm` / `computeIntensity` /
  `computeComboTier` shared by engine and lab.
- **Audio Lab** (`src/lab/`, ~3.9 KLOC, vanilla DOM + canvas, no
  framework): dashboard with track list, step-grid / piano-roll /
  cluster / texture / globals editors, live preview bridged into the
  real `music.ts` engine (reuses the singleton `AudioContext`),
  oscilloscope + FFT visualizers via `AnalyserNode`, generated-JSON
  output panel.
- **Three-layer dev-only isolation:** (1) `vite build` input is only
  `index.html`, so `lab.html` is never compiled/copied; (2) the
  `neonophis-dev-only-lab` build plugin throws if any `src/lab/` /
  `lab.html` id enters the prod graph; (3) `src/lab/main.ts` throws on
  `!import.meta.env.DEV`.
- **Persistence:** dev-server-only endpoint `/__lab/save-music-config`
  (`labConfigSaver` plugin, `apply:'serve'`) writes
  `src/audio/musicConfig.override.json`; the game reads it at boot via
  optional eager `import.meta.glob`, falling back to the hardcoded
  default.
- **Magnet fix:** food pulled onto the head by the magnet is now eaten
  on the same tick (before the movement step), so score/combo are
  credited immediately.

**Verification:**
- `npm run typecheck` clean.
- `npm run build`: 35 modules → `dist/index.html` + one JS + one CSS.
  **18.44 KB JS + 20.91 KB CSS gzipped (~39 KB total)**; target
  <100 KB.
- `dist/` contains only `index.html` + game assets — no `lab.html`,
  no lab chunk. Zero `src/lab/`, `lab.html`, `AUDIO LAB`,
  `neonophis-lab` strings in the bundle. The only `musicConfig.override`
  reference is the game's own `import.meta.glob` (game code, by design).

**Artifacts changed:**
- `src/audio/musicConfig.ts` (new) — `MusicConfig` schema +
  `DEFAULT_MUSIC_CONFIG` + runtime singleton + pure derivation helpers
  + optional override glob.
- `src/audio/musicConfig.override.json` (new) — lab-authored config
  the game prefers at boot when present.
- `src/audio/music.ts` — rewritten as a pure `MusicConfig` interpreter
  (465 lines reworked).
- `src/audio/synth.ts` — small surface added for the lab/analyzer
  (+32 lines).
- `src/main.ts` — eat magnet-pulled food on the same tick.
- `src/lab/**` (new) — `main`, `state`, `actions`, `preview`,
  `tracks`, `styles.css`, `ui/*` (layout, editor, controls,
  properties, trackList, outputPanel, previewPanel, plus step-grid /
  piano-roll / melody / cluster / texture / globals editors),
  `viz/visualizers.ts`.
- `lab.html` (new) — dev-only entry, `noindex,nofollow`.
- `vite.config.ts` — `devOnlyLabProtection()` + `labConfigSaver()`
  plugins.
- `CLAUDE.md` — §9 note (music is now data-driven) + new §22
  (dev-only Audio Lab).
- `DECISION_LOG.md` — three new entries (data-driven engine; three-layer
  isolation; same-tick magnet eat).
- `HANDOFF.md` — rewritten to current state.

**Decisions:** `DECISION_LOG.md` entries "Music engine refactored to
data-driven `MusicConfig`", "Dev-only Audio Lab: three-layer production
isolation", "Game eats magnet-pulled food on the same tick"
(all 2026-05-15).

---

## 2026-05-08 — Session 10: magnet fanfare rebuilt (original + military percussion)

**Model:** Haiku 4.5.
**Goal:** The magnet's Tchaikovsky 1812 Overture theme felt musically
"estranho" (wrong/strange) even after corrections. User decided: abandon
classical quotation. Create something original and rousing — a military
march fanfare with full percussion battery (timpani, snare, cymbals).
**Outcome:** Built a 26-note original fanfare melody (three phrases:
ascending-peak-resolve) on stacked brass sawtooths. Added percussion layer:
- Timpani bass-drum punch (sine 80→40Hz) on every note
- Military snare (1400Hz high-pass) every 2 8ths (tight, crisp)
- Crash cymbals (5000Hz shimmer) on beats 1 & 3 (~60% probability)
Result: triumphant, arcade-juice-packed moment when magnet activates.
Bundle remains ~37.7 KB gzipped; TypeScript strict passes.

**Artifacts changed:**
- `src/audio/music.ts` — replaced `TSAR_HYMN` with `FANFARE_MELODY` (26
  notes, 3 phrases), added timpani/snare/cymbal percussion in magnet block
- `CLAUDE.md` §9 — updated Magnet effect (original fanfare + military
  percussion details)
- `DECISION_LOG.md` — added new entry "Music: magnet plays original
  fanfare march (military percussion)" (2026-05-08)
- `HANDOFF.md` — updated last session summary

**Decisions:** New `DECISION_LOG.md` entry "Music: magnet plays original
fanfare march (military percussion)" (2026-05-08).

---

## 2026-05-08 — Session 9: magnet melody corrected to 1812 Overture finale

**Model:** Haiku 4.5.
**Goal:** Correct the 🧲 Magnet power-up's musical theme. User clarified
they want the specific orchestral climax from the 1812 Overture **finale**
(Allegro Vivace, after the bells, military fanfare) — not the standalone
1833 hymn. This is the theme Dario Marianelli used in V for Vendetta's
explosion finale.
**Outcome:** Updated `TSAR_HYMN` from a hand-transcribed 16-note guess to
the authentic 29-note three-phrase theme (SOL SOL SOL DO MI... in three
verses, converted to semitone offsets with oitava adjustments for smooth
melodic flow). Magnet now plays the recognizable imperial fanfare that
audiences hear in 1812's climax. Bundle size remains ~37 KB gzipped;
TypeScript strict passes; production build verified.

**Artifacts changed:**
- `src/audio/music.ts` — updated `TSAR_HYMN` constant (16 → 29 notes),
  improved comments
- `CLAUDE.md` §9 — clarified Magnet effect (now references 1812 finale,
  Allegro Vivace, military fanfare)
- `DECISION_LOG.md` — updated entry "Music: magnet quotes 1812 Overture
  finale climax" with corrected context and melodic notes
- `HANDOFF.md` — updated last session summary to reflect the correction

**Decisions:** Updated `DECISION_LOG.md` entry "Music: magnet quotes 1812
Overture finale climax" (2026-05-08).

---

## 2026-05-08 — Session 8: magnet plays "God Save the Tsar" (1812 Overture)

**Model:** Opus 4.7.
**Goal:** Make 🧲 Magnet rhythmic by quoting the imperial hymn from
Tchaikovsky's 1812 Overture (the brass statement before the cannons).
**Outcome:** While magnet is active, the random pentatonic melody is
suspended and a 16-note hand-transcribed `TSAR_HYMN` plays at one note
per quarter note via three stacked sawtooth voices (unison ±8¢ pair +
open fifth, low-pass filtered) — pseudo brass section. The hymn is in
C major against the C minor base, an intentional cross-relation.
Restarts at the top on each new magnet pickup so the recognizable
opening is always heard.

**Artifacts changed:**
- `src/audio/music.ts` — added `TSAR_HYMN` constant, `magnetOn` /
  `magnetIdx` state, magnet branch in `setMusicState`, melody
  suppression while magnet is on, brass anthem voicing in the texture
  block.
- `src/main.ts` — pass `magnet` flag to `setMusicState`.
- `CLAUDE.md` §9 — updated power-up music table.

**Decisions:** `DECISION_LOG.md` entry "Music: magnet quotes 'God Save
the Tsar'" (2026-05-08).

## 2026-05-08 — Session 7: power-ups touch the trilha

**Model:** Opus 4.7.
**Goal:** Extend the music engine so 🔥 Fire and ❄️ Ice power-ups
modulate the soundtrack — fire heavier, ice calmer.
**Outcome:** `setMusicState` takes an optional third arg `{ fire?, ice? }`.
Fire bumps BPM +20 and tier +1, plus a sub-bass square drone on bar 0.
Ice subtracts BPM −25 and tier −1, plus a triangle bell + perfect fifth
shimmer on bar 0. Both active → BPM/tier cancel but textures stack.

**Artifacts changed:**
- `src/audio/music.ts` — added `MusicMod` interface, `fireOn`/`iceOn`
  state, BPM/tier/intensity deltas, drone + bell textures.
- `src/main.ts` — query `state.powerups` for fire/ice and pass to
  `setMusicState`.
- `CLAUDE.md` §9 — added the power-up effects table.

**Decisions:** `DECISION_LOG.md` entry "Music: power-ups also drive the
trilha (extends prior entry)" (2026-05-08).

## 2026-05-08 — Session 6: music tiers driven by combo (Primus / Igorrr)

**Model:** Opus 4.7.
**Goal:** Make the procedural music react to combo escalation. Past
combo 5 → "tension" arrangement; past combo 10 → microtonal blast-beat
in 7/8 (Primus-meets-Igorrr).
**Outcome:** Implemented a two-axis state — score drives BPM, combo
drives arrangement tier 0/1/2 — wired into the existing simulate tick.
TypeScript clean, build still ~37 KB gzipped.

**Tier behaviors:**
- Tier 0 (combo 0–4): unchanged pentatonic 4/4.
- Tier 1 (combo 5–9): +15 BPM, snare on 2/4, ±15¢ detune, ~18%
  chromatic accents.
- Tier 2 (combo 10+): +25 BPM, 7/8 time, blast-beat kick on every 8th,
  octave-jumping bass, constant hat, ±35¢ detune, dissonant chord
  clusters (root + tritone + minor 9th) at bar boundaries.

**Artifacts changed:**
- `src/audio/music.ts` — full rewrite of tickStep with tier branches;
  `setMusicIntensity` replaced by `setMusicState(score, combo)`; new
  `snare()` and `hihat()` helpers.
- `src/main.ts` — call site updated.
- `CLAUDE.md` §9 — added the combo-tier table.

**Decisions:** `DECISION_LOG.md` entry "Music: combo-driven tier
overlay (Primus / Igorrr flavor)" (2026-05-08).

## 2026-05-08 — Session 5: fix Esc-to-menu mapping

**Model:** Opus 4.7.
**Goal:** User reported Esc didn't return to the main menu, despite the
game-over hint promising it would.
**Outcome:** Keyboard mapping split: `P`/`Space` → pause toggle;
`Escape`/`Backspace` → back-to-menu. Pause-overlay hint updated to
match. Verified end-to-end via headless Chrome + CDP — Enter starts a
run, Esc returns to menu.

**Artifacts changed:**
- `src/input/keyboard.ts` — separated `Escape` from `togglePause`
- `src/render/renderer.ts` — pause overlay hint text
- `.claude/history/lessons-learned.md` — appended postmortem

**Decisions:** None new — small UX fix, no architectural choice. The
*lesson* (UI hints can drift from key-handlers) is worth the entry in
`lessons-learned.md`.

## 2026-05-08 — Session 4: typography pass (Rubik Iso + Bitcount Grid Double)

**Model:** Opus 4.7.
**Goal:** Load real fonts. The HTML had `font-family: "VT323", "Press
Start 2P", monospace` declared but no actual font was being loaded;
everything fell back to system mono. User picked **Rubik Iso** + **Bitcount
Grid Double** from Google Fonts.
**Outcome:** Both fonts inlined as base64 woff2 in a single generated
`src/styles/fonts.css`. Canvas now uses `FONT_DISPLAY` (Rubik Iso) for
the title/GAME OVER/selected mode labels and `FONT_BODY` (Bitcount Grid
Double) for HUD, blurbs, scores, controls. `ensureFontsLoaded()` awaited
before the render loop starts so the very first frame uses the real
fonts. `▶◀` chevrons (outside the latin subset) replaced with
programmatic triangles drawn via canvas paths.

**Verification:**
- `npm run typecheck` clean.
- Production build 14.96 KB JS + 20.91 KB CSS gzipped = ~37 KB total
  (target <100 KB).
- Headless screenshot confirms Rubik Iso 3D title + Bitcount pixel HUD
  + chunky chevrons rendering.

**Artifacts changed:**
- `assets/src/fonts/{rubik-iso-latin,bitcount-grid-double-latin}.woff2`
- `scripts/build-fonts.sh` (new)
- `src/styles/fonts.css` (generated; 28.3 KB raw, 20.9 KB gzipped)
- `src/render/fonts.ts` (new) — `FONT_DISPLAY`, `FONT_BODY`,
  `ensureFontsLoaded()`
- `src/render/{renderer,ui}.ts`, `src/ui/{menu,gameover}.ts` — replaced
  `FONT` constants with the shared exports
- `src/main.ts` — imports `styles/fonts.css`, awaits
  `ensureFontsLoaded()` before `startLoop`
- `index.html` — body font-family + `.font-preload` hidden span
- `vite.config.ts` — `cssMinify: 'esbuild'` (was `lightningcss`, dep
  not installed)

**Decisions:** `DECISION_LOG.md` entry "Typography: Rubik Iso + Bitcount
Grid Double, base64-inlined" (2026-05-08).

## 2026-05-08 — Session 3: rename to NEON OPHIS

**Model:** Opus 4.7.
**Goal:** Rename the project from "Neon Snake" to **NEON OPHIS** (display:
two words; identifier: `neonophis`). Greek ὄφις = "snake" — keeps the
species reference without the English word.
**Outcome:** All user-facing strings, npm name, codename, localStorage
keys, and meta-docs updated. TypeScript clean, build still 14.75 KB
gzipped.

**Artifacts changed:**
- `index.html` — `<title>` and meta description
- `src/ui/menu.ts` — title card text
- `src/main.ts` — header comment
- `src/storage/highscores.ts` — `neonsnake:*` → `neonophis:*` (no migration)
- `package.json` — npm name `neon-snake-arcade` → `neon-ophis`
- `.claude/config.json` — name + codename + description
- `.claude/prompts/new-mode.md` — high-score key reference
- `SYSTEM_PROMPT.md` — header references
- `CLAUDE.md` — title, codename, ImageMagick example, localStorage example

**Decisions:** `DECISION_LOG.md` entry "Rename: Neon Snake → NEON OPHIS"
(2026-05-08).

## 2026-05-08 — Initial bootstrap: full game from CLAUDE.md spec

**Model:** Opus 4.7 (via Claude Code).
**Goal:** Read `CLAUDE.md` and ship a working game.
**Outcome:** Roadmap steps 1–15 + 17 fully done; step 16 partial (skins
coded, asset pipeline pending); step 18 (polish) pending.

- 28 TypeScript modules organized per CLAUDE.md §4.
- Fixed-timestep 60 Hz simulation, interpolated render across the move
  interval (not per logical tick — see DECISION_LOG entry).
- 4 game modes, 4 power-ups, 7 food types, procedural pentatonic music
  with BPM scaling, Web Audio SID-flavored synth.
- Trauma-based screenshake, pre-allocated particle pool (600), floating
  text pool (32), zoom-pulse and fullscreen flash systems.
- HUD with combo decay bar, power-up timer rings, time-attack countdown.
- LocalStorage high-scores per mode (top 5), cosmetic flag persistence.
- Easter eggs: Konami → disco mode, "snek" → cowboy hat, score 256 → ROM
  OVERFLOW, score 1337 → matrix skin, 13 power-ups eaten → GOLD skin.

**Verification:**
- `npm run typecheck` clean.
- Production build **14.75 KB gzipped** (target <100 KB).
- Dev server boots without console errors (Vite v5).
- Headless Chrome via CDP confirmed both screens render correctly: title
  card with neon styling, gameplay with snake/food/HUD/border.

**Artifacts:** `package.json`, `tsconfig.json`, `vite.config.ts`,
`index.html`, `.gitignore`, full `src/` tree.

**Decisions:** All 9 entries in `DECISION_LOG.md` dated 2026-05-08.

## 2026-05-08 — Session 2: Claude-driven structure

**Model:** Opus 4.7.
**Goal:** Establish the meta-documentation structure: `SYSTEM_PROMPT.md`,
`DECISION_LOG.md`, `HANDOFF.md`, `HISTORY.md`, `.claudeignore`, and the
`.claude/{context,history,prompts}/` directories.
**Outcome:** Structure created, populated with starting content. No
gameplay code touched.

**Artifacts:** `SYSTEM_PROMPT.md`, `DECISION_LOG.md`, `HANDOFF.md`,
`HISTORY.md`, `.claudeignore`, `.claude/config.json`,
`.claude/context/{architecture,coding-standards,dependencies,domain-knowledge}.md`,
`.claude/history/lessons-learned.md`,
`.claude/prompts/{smoke-test,new-powerup,new-mode,perf-audit}.md`.

**Decisions:** None new — meta-infra only.
