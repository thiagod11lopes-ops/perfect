# lessons-learned.md — Postmortems, gotchas, "if I'd known"

> Append-only. One entry per gotcha worth remembering. Format:
>
> ```
> ## YYYY-MM-DD — short title
> **Symptom:** what looked wrong.
> **Root cause:** what was actually wrong.
> **Fix:** the change.
> **Lesson:** the one sentence to remember.
> ```

---

## 2026-05-08 — Esc didn't return to menu, despite the on-screen hint

**Symptom:** Game-over screen showed "ESC TO MAIN MENU" and the user
expected Esc → menu both during play and on game-over. Esc did nothing
visible — just resumed if paused.

**Root cause:** In `src/input/keyboard.ts`, `Escape` was grouped with
`KeyP` and `Space` and all three set `commands.togglePause = true`.
`commands.back` was wired only to `Backspace`, which no UI ever
mentioned. So the documented behavior and the actual mapping diverged.

**Fix:** Split the keymap. `KeyP` + `Space` toggle pause; `Escape` +
`Backspace` set `back`. The existing `back` handler in `main.ts`
already calls `returnToMenu()` from PLAY and GAMEOVER. Updated the
pause-overlay hint string from "P / SPACE / ESC TO RESUME" to
"P / SPACE  RESUME      ESC  MAIN MENU".

**Lesson:** When a key triggers two different intents
(pause-toggle vs go-back), the UI text becomes the only place the user
discovers which is which — and a stale hint is worse than no hint at
all. Whenever a hint mentions a specific key, grep the code to verify
the mapping still matches.

## 2026-05-08 — Snake hopped between cells instead of gliding

**Symptom:** With fixed-timestep at 60 Hz and snake moving every
`moveIntervalTicks` (default 8 ticks ≈ 133 ms), the rendered snake
appeared static for 7 ticks then jumped a full cell on the 8th —
choppy, not arcade-smooth.

**Root cause:** I was passing the loop's per-tick `alpha` to
`renderSnake`. That alpha goes 0→1 across **one logical tick**, but the
snake's `prevBody`/`body` only update every `moveIntervalTicks`. So
during the 7 in-between ticks, alpha cycled 0→1→0→1 against an
unchanged prevBody == body — no motion. On the 8th, the entire delta
was crammed into one alpha sweep.

**Fix:** In `render/renderer.ts`, compute
`snakeAlpha = (state.ticksSinceMove + alpha) / interval` and pass that
to `renderSnake` instead of the raw loop alpha.

**Lesson:** Interpolation alpha must match the cadence of the *thing
being interpolated*, not the loop's tick boundary. If two cadences
differ, derive the right one explicitly.

---

## 2026-05-08 — `terser not found` on first production build

**Symptom:** `npm run build` failed with `[vite:terser] terser not
found. Since Vite v3, terser has become an optional dependency.`

**Root cause:** Vite 3+ removed `terser` from default deps. We had
`minify: 'terser'` in `vite.config.ts` (chosen for `drop_console: true`
support, which esbuild handles differently).

**Fix:** `npm install --save-dev terser`.

**Lesson:** When adding `minify: 'terser'` or `terserOptions` to a Vite
config, install `terser` as a devDep in the same change. Don't rely on
defaults that have shifted across major versions.

---

## 2026-05-08 — Headless Chrome screenshot was *too* dark for menu

**Symptom:** First headless screenshot of the menu looked like text on
pure black — missing the radial neon gradient from `#app` and the
animated `bg-canvas`.

**Root cause:** Two factors: (1) headless Chrome with
`--virtual-time-budget=4000` runs RAFs in fast-forward, but the
30 Hz-capped `updateBackground()` timing (`if (now - lastUpdate < 33)
return;`) gates updates by wall-clock, not virtual time. So the bg
canvas painted only a few times. (2) The CSS radial gradient on `#app`
*does* render but is dark by design and doesn't show under the
canvases without being lit by the bg-canvas.

**Fix (deferred):** Visually fine in a real browser. For automated
verification, take a screenshot *after* a few seconds of real frames
(via a CDP-driven test rather than virtual-time mode) — see the second
screenshot in HISTORY for proof.

**Lesson:** Headless screenshot with `--virtual-time-budget` is great
for static layouts and bad for animation-driven backgrounds. For real
playtest verification, drive the page over CDP with real time.

---

## 2026-05-08 — Circular type imports between `state.ts` and `gameplay/*.ts`

**Symptom:** Tempted to make `engine/state.ts` import `ModeId` and
`ActivePowerUp` from `gameplay/`, while `gameplay/` imports `GameState`
from `engine/state.ts`. Felt circular.

**Root cause:** Felt circular at the *type* level only — but TypeScript
handles this fine as long as the imports are pure types (no runtime
values). The two files compile to no inter-runtime dependency.

**Fix:** Use `import type { ... }` on both sides. No runtime cycle, no
TS error.

**Lesson:** Circular imports are only a runtime problem. If both sides
are type-only, you can keep the natural ownership and ignore the
shape of the dependency graph.
