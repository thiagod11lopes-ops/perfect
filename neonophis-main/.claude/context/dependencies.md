# dependencies.md — What's installed and why

> Default stance: **own everything.** A new dependency requires a
> `DECISION_LOG.md` entry justifying it.

---

## Runtime dependencies

**None.** The shipped bundle is 100% authored code + browser APIs
(Canvas2D, Web Audio, localStorage, ResizeObserver).

This is intentional and per CLAUDE.md §2 ("zero dependências runtime
obrigatórias").

---

## Dev dependencies

| Name         | Purpose                                  | Locked because |
|--------------|------------------------------------------|----------------|
| `vite`       | Bundler + dev server with HMR.           | De facto standard for Canvas/TS games. ESM-native, fast cold start. |
| `typescript` | Type checker.                            | Spec mandates strict TS. |
| `terser`     | JS minifier used by Vite for production. | Vite v3+ made this optional. We ask for `minify: 'terser'` in `vite.config.ts` for `drop_console: true`. |

---

## Browser APIs we depend on

- **Canvas2D** — primary render target. Fallback: none. (WebGL is
  excluded for budget reasons.)
- **Web Audio API** (`AudioContext`, `OscillatorNode`, `GainNode`,
  `BiquadFilterNode`, `AudioBuffer`) — all sound. Includes the
  `webkitAudioContext` fallback for older Safari.
- **localStorage** — high scores, cosmetic flags. Wrapped in try/catch
  so private/quota-blocked browsers degrade gracefully.
- **ResizeObserver** — viewport tracking. Has near-universal support
  (~98%); no fallback shipped.
- **Touch events** — mobile input. We never listen to `pointer*` because
  Safari iOS treats them inconsistently for swipe.

---

## Browser support matrix

| Browser           | Min version | Notes |
|-------------------|-------------|-------|
| Chrome / Edge     | 105+        | Full support, primary target. |
| Firefox           | 110+        | Full support. |
| Safari (desktop)  | 16+         | Web Audio start is gated on a user gesture (we trigger it on Enter). |
| Safari (iOS)      | 16+         | Same gating; touch tested via swipe overlay. |
| Mobile Chrome     | 105+        | Same as desktop. |

We do **not** target IE, legacy Edge, or pre-Big-Sur Safari.

---

## Fonts

Two web fonts ship with the bundle, both base64-inlined into
`src/styles/fonts.css` (regenerable via `scripts/build-fonts.sh`):

| Family               | Role          | Size (woff2 latin) | License |
|----------------------|---------------|--------------------|---------|
| Rubik Iso            | display       | 16.4 KB            | SIL OFL |
| Bitcount Grid Double | body / HUD    | 3.7 KB             | SIL OFL |

Sources live in `assets/src/fonts/*.woff2` (downloaded from Google
Fonts); the generated CSS in `src/styles/fonts.css` is what actually
ships. To swap a font, replace the woff2 file and re-run
`scripts/build-fonts.sh`.

## Build artifacts

- `dist/` — Vite output. Committed only in releases (not yet).
- `assets/` — static images regenerated from `assets/src/`. Committed.
- `assets/src/` — SVG/font sources. Committed.

---

## Scripts (npm)

| Script            | What it runs                  |
|-------------------|-------------------------------|
| `npm run dev`     | `vite` (HMR on port 5173)     |
| `npm run build`   | `tsc --noEmit && vite build` |
| `npm run preview` | `vite preview` on `dist/`     |
| `npm run typecheck` | `tsc --noEmit`              |

---

## Tooling assumptions

- **Node.js ≥ 18** for the dev/build scripts. We use `v24.14.0` locally
  but anything ≥ 18 should work.
- **ImageMagick** — needed *only* when running `scripts/build-assets.sh`
  (CLAUDE.md §7). Not needed for `dev` or `build`.
