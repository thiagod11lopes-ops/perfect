# HANDOFF.md — Current state, replaceable each session

> Always rewrite this file at the end of a session. It must reflect the
> *current* state, not history. For the running log see `HISTORY.md`.

**Last updated:** 2026-05-18
**Last session:** **PWA / offline.** Installable, `display: fullscreen`,
plays **100% offline after one online visit**. Hand-rolled zero-dep service
worker (`public/sw.js`, runtime cache-first; `__api/*` network-only so the
ranking stays authoritative and offline falls back to localStorage).
Manifest + icons added (ImageMagick MVG pipeline, `npm run assets`, ~32 KB).
SW registration is **prod-only** (`import.meta.env.DEV` guard, mirrors §22).
JS/CSS bundle unchanged. **Ops step pending — see "Deployment / ops" below.**
**Prior session:** **Relax mode — tail-tip collision + visual warning.**
Biting the glowing tail tip ends the run (score saved, normal game-over
flow); passing through the rest of the body stays harmless. Tail pulses
red-orange and reacts to music intensity (`bgIntensity`).
**Prior-prior session:** Added **HIGH SCORES screen** (`'SCORES'` state) —
tabbed canvas view of all 4 modes' top 5 from the main menu; ←/→ desktop,
swipe or ◀/▶ on mobile. Fixed Android nav-bar overlap for bottom buttons.

---

## TL;DR

The game is **fully polished end-to-end** as **NEON OPHIS**, playable on
**desktop (keyboard) and mobile (touch)**, in **English and Portuguese**.
Navigation flow is: **SPLASH → MENU → PLAY / CREDITS / SCORES / GAMEOVER**,
with a flag language toggle on splash + menu. All 4 modes, 4 power-ups and
easter eggs are wired, per-mode persistent high-scores with a dedicated
browsable SCORES screen. The soundtrack is
**data-driven** — tuned via the dev-only **Audio Lab** at `/lab.html` and
shipped as `musicConfig.override.json`. UI strings are **data-driven** too
(`src/i18n/locales/*.json`, auto-discovered; new language = new JSON, zero
code). TypeScript strict passes; production bundle is **~47 KB gzipped**
(26.5 KB JS + 20.9 KB CSS with inlined fonts; target <100 KB). The Audio
Lab adds **zero bytes** to production (verified). The game is an
installable **PWA**: `display: fullscreen`, plays **100% offline** after
one online visit via a hand-rolled zero-dep service worker — the JS/CSS
bundle is unchanged (SW/manifest/icons are static files outside the
bundle graph).

---

## Quick start

```bash
npm install
npm run dev          # game:  http://localhost:5173
                     # lab:   http://localhost:5173/lab.html  (DEV ONLY)
npm run build        # type-check + bundle (lab excluded by design)
npm run typecheck    # tsc --noEmit only
```

**Desktop controls:** Any key on splash → menu. ↑↓ menu nav, Enter to play,
arrows/WASD to steer, P/Space pause, Esc quit (confirm dialog), R restart,
M mute, Backspace → menu. **Language:** click the flag pills on splash or
menu (no key binding by design).

**Mobile controls (`pointer: coarse` only):** **Tap** on splash JOGAR button
→ menu. Menu: tap a mode row → modal (name, blurb, hi-score) → JOGAR / VOLTAR;
tap RECORDES → scores screen directly (no modal). **Swipe** steers the snake
(24 px, 300 ms). PLAY: ⏸ / ✕ pills (top-right). QUIT?: SIM/NÃO modal. GAME
OVER: JOGAR DE NOVO / MENU. Hi-score: tap `<input>` for native keyboard → OK
to confirm. CREDITS: VOLTAR button. **SCORES:** ◀ VOLTAR ▶ buttons + left/
right swipe (40 px) to cycle modes. No on-screen D-pad by decision.
**Language:** DOM flag pills (top-center) on splash + menu.

**Audio Lab workflow:** open `/lab.html` in dev → pick a track → edit →
live-preview through the real engine → "save" posts to
`/__lab/save-music-config`, which writes `src/audio/musicConfig.override.json`.
The game prefers that file at boot; delete it to fall back to
`DEFAULT_MUSIC_CONFIG`.

---

## Roadmap status (CLAUDE.md §19)

| #  | Step                                | Status |
|----|-------------------------------------|--------|
| 1  | Loop fixo 60 Hz + render interpolado | DONE  |
| 2  | Input bufferizado                    | DONE  |
| 3  | Comida + crescimento + colisão       | DONE  |
| 4  | Renderer neon                        | DONE  |
| 5  | Sintetizador SID-like + 3 SFX        | DONE  |
| 6  | Partículas + screenshake             | DONE  |
| 7  | Combos + multiplier + texto          | DONE  |
| 8  | Background animado                   | DONE — DPR fix (2026-05-16) |
| 9  | Olhos expressivos                    | DONE  |
| 10 | Power-ups (4 tipos)                  | DONE  |
| 11 | Música procedural                    | DONE — data-driven via `MusicConfig` + Audio Lab; menu music added 2026-05-17 |
| 12 | Modos (Classic/Chaos/TA/Relax)       | DONE  |
| 13 | Menus + tela de game over            | DONE — splash screen, credits screen, mode modal on mobile added 2026-05-17 |
| 14 | High scores localStorage             | DONE — + file persistence (scores-server.js) |
| 15 | Mobile swipe + responsive            | DONE — fully touch-playable; narrow-screen fixes 2026-05-17 |
| 16 | Skins + chapéus + ImageMagick        | PARTIAL — skins/hats coded; ImageMagick pipeline now exists (`scripts/build-assets.sh` → PWA icons + favicon); hats spritesheet & OG image still pending |
| 17 | Easter eggs                          | DONE — Konami, snek, 256, 1337, GOLD@13 |
| 18 | Polish pass                          | PENDING |

> The Audio Lab is **dev tooling**, not a roadmap step — it serves the
> §18 polish pass (and ongoing music tuning) rather than being one.
> **i18n (PT/EN)** is likewise cross-cutting infra (CLAUDE.md §23, added
> 2026-05-17), not a §19 step — every UI string now goes through `t()`.
> **PWA / offline** is likewise cross-cutting infra (CLAUDE.md §24, added
> 2026-05-18), not a §19 step — `public/sw.js` + manifest + icons.

---

## Known gaps & open questions

- **Portrait playfield is small.** The logical grid is fixed 32×24 (4:3);
  on a tall phone the field renders centred with dead space above/below.
  Playable but not edge-to-edge. Open question — if it bothers on real
  devices, add a portrait-only layout behind the same `pointer: coarse`
  gate without touching desktop.
- **Touch playtest depth.** User confirmed it works on device for touch +
  background; a longer feel pass across screen sizes / iOS Safari
  (safe-area, keyboard summon on name entry) is still worthwhile.
- **Lab editors partially built.** Several tracks in `src/lab/tracks.ts`
  are `editor: 'placeholder'` — visible but disabled. The step-grid,
  piano-roll, cluster, texture and globals editors are functional.
- **`musicConfig.override.json` is committed.** It is *game data*,
  intentionally — the shipped sound is whatever the lab last saved.
  Delete it to revert to `DEFAULT_MUSIC_CONFIG`.
- **`scripts/build-assets.sh` exists** — generates the PWA icons +
  `favicon.ico` into `public/icons/` (`npm run assets`, ~32 KB, §7.5
  budget 50 KB). The inline SVG favicon in `index.html` stays the
  primary favicon (zero-byte); `.ico` is a legacy fallback. Still
  pending from §7/§19-16: **hats spritesheet** and **OG image**. Note:
  no SVG rasterizer in env → the script rebuilds the icon via
  ImageMagick MVG (native vector + gradient), not by rasterizing
  `assets/src/icon.svg` (which stays the human-readable source).
- **Deployment / ops step (manual, REQUIRED in production).** The PWA
  update mechanism needs the production Apache to serve **`sw.js` with
  `Cache-Control: no-cache`** (or a short max-age) and
  **`manifest.webmanifest` as `application/manifest+json`**. Without the
  no-cache on `sw.js`, the browser won't see a new SW and redeploys can
  stall on a stale cached build. This was deliberately left out of
  `public/.htaccess` (user owns the VPS; we don't silently change prod
  infra). `.htaccess` currently only has the scores `ProxyPass`. Suggested
  addition (apply on the VPS):
  ```apache
  <Files "sw.js">
    Header set Cache-Control "no-cache"
  </Files>
  AddType application/manifest+json .webmanifest
  ```
- **No `logger` abstraction** — `console.*` is stripped in production by
  terser `drop_console`. Fine.
- **No tests.** Feel-driven game. Pure helpers (`computeBpm` /
  `computeIntensity` / `computeComboTier`, `menuHitTest`,
  `langToggleHitTest`, `t`) are trivially unit-testable if a regression
  bites.
- **PT layout not browser-verified.** Portuguese strings run ~15–20 %
  longer than English while the canvas UI uses width-sensitive manual
  font sizing. Build + typecheck are green and `clampToWidth` already
  guards credits, but a visual pass in PT across screen sizes (menu
  controls line, game-over stat labels, mode blurbs) is still pending —
  could not drive a browser this session.
- **Brand strings are English in every locale by design.** `tagline`,
  `meta.description`, product name "NEON OPHIS" are intentionally not
  translated (user hand-edited `pt.json` to enforce this). A PT value
  equal to the English one there is correct — do not "fix" it.

---

## Next likely tasks (if user picks them up)

1. **PT layout pass:** run the game in Portuguese (`localStorage`
   `neonophis:lang="pt"` or pick the flag) and check the longer strings
   don't clip/overflow on desktop and narrow phones — menu controls line,
   game-over stats, mode blurbs, confirm-quit.
2. **Polish pass** (§19 step 18): walk every animation/sound/transition on
   both desktop and mobile; use the Audio Lab to tune voices.
3. **Portrait layout pass** (if real-device testing flags the dead space):
   `pointer: coarse` portrait field placement, desktop untouched.
4. **Real assets** (§19 step 16): `scripts/build-assets.sh` now does PWA
   icons + favicon; remaining are the **OG/share image** and the **hats
   spritesheet** (extend the same script, §7.3 recipes).
5. **Apply the prod ops step** (see Deployment / ops above): `.htaccess`
   `sw.js` no-cache + `.webmanifest` MIME on the VPS.
6. **Fill the placeholder lab editors** (`src/lab/tracks.ts`).
7. **Performance audit:** profile on a Chromebook-class machine and a mid
   phone; verify <8 ms/frame budget.

---

## File map (high-level)

```
src/
  main.ts                    glue: lifecycle, screen state machine
                             (SPLASH→MENU→PLAY/CREDITS/GAMEOVER),
                             eat handler, touch layer init + per-frame sync
  engine/{loop,state,rng,events}.ts
  i18n/
    index.ts                 t(key,params?) + getLang/setLang/
                             availableLangs/onLangChange; locales auto-
                             discovered via import.meta.glob
    locales/en.json pt.json  string tables (game data; new lang = new
                             file, zero code). Brand strings stay EN.
  input/
    keyboard.ts              buffered keys + shared command flags;
                             exports injectCommand for the touch layer
    touch.ts                 swipe → direction buffer (steering)
    touchControls.ts         DOM touch layer (splash/menu-modal/play/
                             quit/gameover/credits/name/lang pills);
                             coarse-pointer only, reuses keyboard cmds;
                             refreshTouchLabels() on language change
  gameplay/{snake,food,collision,combo,powerups,modes}.ts
  render/{renderer,background,foodRenderer,snakeRenderer,ui}.ts
                             background.ts draws in CSS space (DPR fix)
                             renderer.ts / ui.ts: narrow-screen branches
  fx/{particles,screenshake,flash,floatingText}.ts
  audio/
    synth.ts                 SID-like voice (shared by game + lab)
    sfx.ts                   event→preset map
    music.ts                 pure interpreter of MusicConfig;
                             exports startMenuMusic()/stopMenuMusic()
    musicConfig.ts           MusicConfig schema + DEFAULT_ + singleton
                             + computeBpm/Intensity/ComboTier + override glob
    musicConfig.override.json  lab-authored config (game data, committed)
  ui/
    splash.ts                SPLASH screen (animated title, author credit,
                             tagline; canvas title stops oscillating on mobile)
    menu.ts                  menu render + MENU_ORDER/menuHitTest
                             (shared geometry for touch tap); draws
                             the lang toggle
    langToggle.ts            shared canvas flag toggle: drawLangToggle +
                             langToggleHitTest (one geometry fn, like
                             menuHitTest); no-op under pointer: coarse
    credits.ts               CREDITS screen (scrolling canvas text;
                             narrow-screen line-clip + keyboard hint hidden)
    scores.ts                SCORES screen (mode tabs, top-5 table, chevrons
                             + dots; desktop ←/→, mobile swipe + buttons)
    gameover.ts              narrow-screen: name slots + keyboard hints omitted
  storage/highscores.ts
  lab/                       DEV-ONLY — never in production bundle
    main.ts state.ts actions.ts preview.ts tracks.ts styles.css
    ui/{layout,editor,controls,properties,trackList,outputPanel,
        previewPanel,stepGrid,pianoRoll,melodyEditor,clusterEditor,
        textureEditor,globalsEditor}.ts
    viz/visualizers.ts       oscilloscope + FFT via AnalyserNode
lab.html                     DEV-ONLY entry (root); not a vite build input
vite.config.ts               devOnlyLabProtection() + labConfigSaver()
index.html                   #touch-overlay (z-index 7) + control CSS
                             (all under @media (pointer: coarse));
                             .tc-splash JOGAR button + tc-float keyframe;
                             .tc-mode-modal overlay; .tc-lang flag pills
                             (splash + menu)
```

See `.claude/context/architecture.md` for the contract between modules.

### How the desktop path stays untouched (don't weaken it)

The entire touch layer is isolated: `#touch-overlay` is `display:none`
except under `@media (pointer: coarse)`, the only gate. `touchControls.ts`
adds **no game logic** — buttons set the same shared `commands` flags the
keyboard already drains (`injectCommand`) and the menu tap uses the
render's own geometry (`menuHitTest`). `main.ts` touches it via exactly
one `initTouchControls(...)` and one `syncTouchControls(...)` per frame
(DOM mutated only on screen change). Removing the touch layer cannot
change desktop behaviour. The i18n toggle follows the same split:
`langToggle.ts` no-ops under `pointer: coarse` (mobile uses the DOM
`.tc-lang` pills); the canvas click handler in `main.ts` only acts on a
pill hit and otherwise lets the splash tap bubble through unchanged.

### How the dev-only lab isolation works (don't weaken it)

1. **Build:** `vite build`'s only input is `index.html`. `lab.html` is
   never crawled/compiled/copied.
2. **Plugin:** `neonophis-dev-only-lab` (`apply:'build'`) throws if any
   `src/lab/` or `lab.html` id enters the prod graph.
3. **Runtime:** `src/lab/main.ts` throws on `!import.meta.env.DEV`.

The dev-server save endpoint (`labConfigSaver`, `apply:'serve'`) does
not exist in `vite build`. The only lab-related thing that crosses into
production is `musicConfig.override.json`, read by the game's own
`import.meta.glob` in `musicConfig.ts` — game data, by design.

### How the PWA stays out of dev (don't weaken it)

`registerServiceWorker()` in `main.ts` early-returns on
`import.meta.env.DEV` **before any effect** — that single guard is the
only thing keeping the service worker off the Vite dev server (a SW
there poisons HMR and the Audio Lab). Same discipline as the lab's
runtime guard. `public/sw.js` and `public/manifest.webmanifest` are
inert static files in dev (served but never registered/linked into the
SW lifecycle). The SW deliberately **never** caches `__api/*` — caching
the scores endpoint would serve stale rankings or break submission; the
`storage/highscores.ts` localStorage fallback is what makes offline play
safe. Don't add the API to any cache.

---

## Don't-touch list (also see `.claudeignore`)

- `dist/` — build output, regenerated.
- `node_modules/`, `package-lock.json` — managed by npm.
- `.claude/settings.local.json` — local tool permissions, user-owned.
- The three dev-only lab isolation layers above — weakening any one
  risks shipping the lab to production.
- The `@media (pointer: coarse)` gate on `#touch-overlay` — it is the
  single thing keeping the touch layer off desktop.
- The `import.meta.env.DEV` guard in `registerServiceWorker()`
  (`main.ts`) — the single thing keeping the SW off the dev server.
- The `__api/*` network-only branch in `public/sw.js` — never cache the
  scores endpoint.
