# DECISION_LOG.md — Architectural decisions, append-only

> One entry per non-obvious choice. Format:
>
> ```
> ## YYYY-MM-DD — short title
> **Context:** what problem we faced.
> **Decision:** what we chose.
> **Alternatives:** what we considered and rejected.
> **Consequences:** what this commits us to.
> ```
>
> Never edit past entries. If a decision is reversed, append a new entry that
> supersedes it and link the old one.

---

## 2026-05-08 — Vite + TypeScript strict, zero runtime deps

**Context:** We need a fast bundler, type safety, and no framework lock-in.
**Decision:** Vite as builder, TypeScript with `strict + noUnusedLocals +
noUnusedParameters`. Zero runtime dependencies.
**Alternatives:** esbuild standalone (no HMR), webpack (heavy), Parcel
(plugin churn). React/Vue/Svelte (overkill for a single canvas).
**Consequences:** Bundle is naturally small (~15 KB gzipped). HMR is free.
DOM diffing impossible — fine, we don't need it.

## 2026-05-08 — Fixed-timestep simulation at 60 Hz with interpolated render

**Context:** Snake must feel buttery on 144 Hz displays and survive frame
drops on 30 Hz mobile. Naive `dt * speed` causes physics drift.
**Decision:** Glenn Fiedler "Fix Your Timestep" pattern. `engine/loop.ts`
runs `simulate()` at exactly 60 ticks/s with an accumulator; `render()` is
called once per `requestAnimationFrame` with `alpha = accumulator /
fixedDt`. Movement is grid-discrete; the snake's *visual* position is
interpolated from `prevBody` to `body` over the whole `moveIntervalTicks`
window (not just one logical tick).
**Alternatives:** Variable timestep (simple, but breaks determinism).
Fixed render (locked 60 fps, fights browsers).
**Consequences:** Determinism preserved. Same seed → same run. Snake glides
between cells. Cost: render must never mutate state (§3 in CLAUDE.md).

## 2026-05-08 — Xorshift32 seedable RNG, never `Math.random()` for gameplay

**Context:** Replays, daily challenges, and bug repro require deterministic
randomness. `Math.random()` is implementation-defined and unseedable.
**Decision:** `engine/rng.ts` exposes `seed/rand/randInt/pick/dailySeed`.
All gameplay code uses it. Particle FX may use `Math.random()` since they
don't affect simulation.
**Alternatives:** Mulberry32, sfc32 (fine but heavier). PCG (overkill).
**Consequences:** Save the seed with each high-score entry → bug repro is
"send me your seed."

## 2026-05-08 — Web Audio API synthesis, no audio assets

**Context:** Spec target is < 100 KB total bundle. Snake's identity is the
SID-flavored arcade sound; samples would inflate the bundle and waste the
unique opportunity to map every event to a procedural voice.
**Decision:** `audio/synth.ts` is a tiny synth (4 waveforms, ADSR via gain
ramp, optional filter sweep, noise via buffer source). `audio/sfx.ts` is the
event→preset map. `audio/music.ts` is a procedural pentatonic loop with
BPM scaling on score.
**Alternatives:** Tone.js (huge), Howler (samples), preloaded WAV/MP3
(bundle bloat).
**Consequences:** Audio is variation-rich (eat pitch rises with combo) but
we own the entire signal chain — bugs are ours.

## 2026-05-08 — Grid-discrete collision, never pixel-perfect

**Context:** Snake players must know exactly where they will die. Pixel
collision is unfair on a fast snake.
**Decision:** World is a 32×24 grid. Snake body is a deque of cells.
Collision checks are integer comparisons. Visual interpolation is decoupled
from the authoritative grid state.
**Alternatives:** AABB pixel collision, spatial hash. Both are unjust here.
**Consequences:** Player intuition matches reality. CPU cost is trivial.

## 2026-05-08 — Object pools for particles and floating text

**Context:** A garbage-collection pause in the middle of a combo is a feel
killer. Even one is too many.
**Decision:** `fx/particles.ts` pre-allocates 600 particles at module init
and recycles them via an `active` flag. `fx/floatingText.ts` does the same
with a smaller pool. Pools never grow at runtime.
**Alternatives:** `new Particle()` per spawn (causes GC).
**Consequences:** No GC pressure during gameplay. If we run out, we reuse
the oldest particle (not ideal but bounded).

## 2026-05-08 — Event bus, not cross-module imports

**Context:** Audio, FX, music, and UI all need to react to gameplay events
(eat, combo up, game over). Direct calls from `gameplay/` into all systems
would create a hairball.
**Decision:** `engine/events.ts` is a tiny pub/sub. Gameplay emits
semantic events (`EAT`, `COMBO_UP`, etc.); subsystems subscribe.
**Alternatives:** Service locator, dependency injection container. Both
overweight.
**Consequences:** Subsystems can be added/removed in isolation. Trade-off:
no compile-time guarantee that handlers exist — keep handlers shallow.

## 2026-05-08 — Trauma-based screenshake (Squirrel Eiserloh, GDC 2013)

**Context:** Linear-decay shake feels mechanical. Players adapt and ignore
it. Big events should *physically punch*.
**Decision:** `fx/screenshake.ts` accumulates `trauma ∈ [0,1]` and
applies `shake = trauma²` per frame, decaying linearly. Power-ups add
0.18, wall bonk 0.4, game over 0.9.
**Alternatives:** Fixed amplitude per event (boring); decaying random
walk (drifts).
**Consequences:** Tiny eats feel light, big events feel heavy.

## 2026-05-08 — Snake interpolation across the move interval, not the tick

**Context:** Naively passing the loop's per-tick `alpha` to `renderSnake`
made the snake hop every `moveIntervalTicks` (~133 ms) — choppy.
**Decision:** Compute `snakeAlpha = (state.ticksSinceMove + alpha) /
moveInterval`. The snake glides smoothly across the entire interval.
**Alternatives:** Move the snake every tick, then change the speed
mechanic. Worse: simulation no longer matches the discrete grid intuition.
**Consequences:** Smooth motion. The renderer must read
`ticksSinceMove`, `moveIntervalTicks`, and `speedMultiplier` — coupling
acceptable since these are core movement params.

## 2026-05-08 — Music: magnet plays original fanfare march (military percussion)

**Context:** After fire and ice already modulated the trilha, the user
asked for the magnet to be *rhythmic*. First attempt was a Tchaikovsky
1812 Overture transcription, but even with corrections, it felt "estranho"
(wrong/strange). User decided: abandon classical quotation. Instead, create
an original, empowering military march — fanfare with full percussion
battery (kick, snare, cymbals).
**Decision:** While the magnet power-up is active, suppress the random
pentatonic melody and play an original 26-note fanfare march (`FANFARE_MELODY`)
at one note per quarter note. The melody is anthemic and simple: three
phrases building upward (phrase 1: SOL SOL SOL SI DO..., phrase 2: peak
and resolve LA SI DO RE..., phrase 3: return to tonic SOL SOL SOL).

Accompaniment is full military percussion:
- **Brass section:** three stacked sawtooth voices (unison ±8¢ + open fifth,
  low-pass 2000Hz) with sharper attacks (0.01s vs 0.02s) — brighter tone.
- **Timpani:** bass drum punch (sine 80→40Hz, 0.15s decay) on every fanfare
  note — authoritative low-end thump.
- **Military snare:** high-pitched noise (1400Hz high-pass) every 2 8ths —
  crisp, tight rhythm (0.06s decay).
- **Crash cymbals:** high-frequency shimmer (5000Hz high-pass) on beats 1
  and 3, ~60% chance — adds sparkle without overwhelming.

The melody resets on each new magnet activation. The base rhythm section
continues normally — when combo ≥ 10 (tier 2) and the magnet is active,
the fanfare floats over blast-beat 7/8 with dissonant clusters, creating
a triumphant-chaotic fusion.
**Alternatives:** Quotation of classical music — rejected (user found it
unsatisfying, wanted something original and rousing). Minimal percussion
— rejected (the "juice" demands full orchestration). Ambient fanfare tone
— rejected (needs punch, needs drive).
**Consequences:** +180 bytes gzipped. `MusicMod.magnet?: boolean` remains.
The fanfare feels *earned* — a triumphant moment when the player grabs
the magnet, with the full percussion backing making it feel like a real
arcade event. Bundle remains ~37.7 KB gzipped, well under 100 KB cap.

## 2026-05-08 — Music: power-ups also drive the trilha (extends prior entry)

**Context:** After the combo-tier overlay landed, the user asked for the
trilha to react to power-ups too — fire should *add to the heat*, ice
should *cool everything down*.
**Decision:** `setMusicState` now takes a third arg `{ fire?, ice? }`.

- **Fire:** +20 BPM, tier +1 (clamped at 2), intensity +0.25, plus a
  sub-bass square drone (`midiToFreq(ROOT-24)`) on bar 0 — adds menace.
- **Ice:** −25 BPM (floored at 60), tier −1 (clamped at 0), intensity
  −0.30, plus a triangle bell (root+36 + a perfect fifth) on bar 0 —
  glassy shimmer.

When both are active (Chaos mode), the BPM/tier deltas cancel but the
texture layers play together — chaotic by design.
**Alternatives:** Crossfade to a pre-baked "fire" / "ice" loop —
rejected (procedural-only ethos). Discrete BPM swap on activation —
rejected (current model recomputes BPM each scheduleNext, which gives
a smooth tempo shift naturally). A separate `setMusicPowerups()`
function — rejected for one-call cohesion.
**Consequences:** +190 bytes gzipped. Future power-ups can drop into
the same `MusicMod` interface; I'd add `magnet` (rhythmic pull?) or
`rainbow` (random pitch wobble?) the same way if asked.

## 2026-05-08 — Music: combo-driven tier overlay (Primus / Igorrr flavor)

**Context:** Original `audio/music.ts` scaled BPM with score only. The
user wanted the music to react to *combo*: as the chain grows, the
arrangement should turn heavier — denser drums, microtonality, odd time
signatures — channeling Primus and Igorrr ("angine de poitrine"
microtonal blast-beat aesthetic).
**Decision:** Two orthogonal axes feed `setMusicState(score, combo)`.
Score still drives the *base* BPM (100 / 120 / 140 / 160). Combo
selects an arrangement *tier* on top:

- **Tier 0** (combo 0–4): unchanged pentatonic 4/4 baseline.
- **Tier 1** (combo 5–9): +15 BPM, backbeat snare on 2 and 4,
  microtonal detune ±15 cents, ~18% chance of off-scale (chromatic)
  accent notes.
- **Tier 2** (combo 10+): +25 BPM, 7/8 time (14 8ths/bar), blast-beat
  kick on every 8th, frenetic bass with octave jumps, constant hi-hat,
  microtonal detune ±35 cents, ~30% chance per bar of a dissonant
  cluster stab (root + tritone + minor 9th).

Tier transitions are crisp (no hysteresis). When combo decays past a
threshold, the music drops back immediately — direct feedback to the
player. CLAUDE.md §9 updated with the tier table.
**Alternatives:** Score-only (status quo) — rejected: combos *are* the
core fun mechanic; the music should respond. Hysteresis to smooth
downgrades — rejected: crispness reads as feedback. A precomposed
"heavy" loop swap — rejected: doesn't fit the all-procedural ethos
(§9), and crossfade of two timers is messy.
**Consequences:** +360 bytes gzipped on the JS bundle. Two new exports
in `music.ts` (`setMusicState` replaces `setMusicIntensity`). Future
combo-tier additions (tier 3 at combo 20+? distortion?) follow the
same shape.

## 2026-05-08 — Typography: Rubik Iso + Bitcount Grid Double, base64-inlined

**Context:** CLAUDE.md §6 calls for "Press Start 2P or VT323 via @font-face
base64 inline para zero FOUT." Until now `font-family` was declared but
no font was actually loaded → fell back to system mono. The user picked
**Rubik Iso** (3D isometric arcade display) and **Bitcount Grid Double**
(pixel-grid bitmap) from Google Fonts — both SIL Open Font License,
free for any use.
**Decision:** Download latin-only `.woff2` (Rubik 16.4 KB, Bitcount
3.7 KB), base64-encode, emit a single generated `src/styles/fonts.css`
with two `@font-face` rules (`font-display: block`), import the CSS
from `main.ts`. Hierarchy: Rubik Iso for headings (title, GAME OVER,
selected mode label, PAUSED); Bitcount Grid Double for body (HUD,
blurbs, score, hi-scores, controls). A single shared module
`src/render/fonts.ts` exports `FONT_DISPLAY` / `FONT_BODY` and an
`ensureFontsLoaded()` that the boot path awaits before starting the
render loop — Canvas2D doesn't trigger font loading on its own, so
without this the very first frames would use system fallback. A hidden
`.font-preload` span in `index.html` belt-and-suspenders force-loads
both families. Decorative chars `▶◀` (out of latin subset) replaced
with programmatic triangle paths; `→` in game-over hint replaced by
"TO" word. Regeneration via `scripts/build-fonts.sh`.
**Alternatives:** Link from `fonts.googleapis.com` — rejected for
privacy, FOUT, and offline support. Self-hosted `.woff2` with `?inline`
in Vite — equivalent end result but two source files instead of one
generated CSS; rejected for spec literalness. Keeping `Press Start 2P
+ VT323` per the original CLAUDE.md text — the user picked specific
fonts, deferred to user choice.
**Consequences:** CSS bundle grew to 28.09 KB (20.91 KB gzipped) but
ships zero network requests for fonts. Total bundle remains ~37 KB
gzipped — well under the 100 KB cap. CLAUDE.md §6 typography note
should be updated to reflect the actual choice (Rubik Iso + Bitcount
instead of Press Start 2P + VT323), but the principle (base64 inline,
zero FOUT) is preserved.

## 2026-05-08 — Rename: Neon Snake → NEON OPHIS

**Context:** "Snake" is over-saturated as a game title in English. We
wanted a name that keeps the species reference without leaning on the
English word.
**Decision:** Adopt **NEON OPHIS** (display: two words; identifier:
`neonophis`). *Ophis* (ὄφις) is the ancient Greek for "snake" — keeps
the DNA, gains a mythic-arcade tone, reads cleanly in any language.
Codename updated to `NEON_OPHIS_64`. localStorage keys renamed from
`neonsnake:*` to `neonophis:*` without migration (project is in v0;
clean break is acceptable).
**Alternatives:** "NeonOphis" (one word) — rejected for legibility in
the arcade font on the title card. Keeping the legacy `neonsnake:`
prefix in localStorage — rejected for inconsistency.
**Consequences:** Existing local high scores (if any tester accumulated
some) become orphan entries in localStorage. Bundle size unchanged.
Future references in code, docs, and assets must use the new name; the
in-fiction "snake" noun (in CLAUDE.md narrative, snake renderer
comments, etc.) stays — only the *product* name changed.

## 2026-05-08 — ImageMagick only for static-edge assets

**Context:** Per CLAUDE.md §7 the rule is "programmatic-first." But favicons,
OG images, hat sprites, and CRT noise tiles are not gameplay and don't
benefit from runtime generation.
**Decision:** Static assets live in `assets/`, generated by
`scripts/build-assets.sh` from sources in `assets/src/`. Both directories
are committed. Hard cap: 50 KB total static assets.
**Alternatives:** Generate everything in Canvas (possible but wasteful for
favicons). Hand-edit binaries (not reproducible).
**Consequences:** Until the assets pipeline is needed (roadmap step 16),
we ship a temporary inline-SVG favicon and skip the script. ImageMagick
becomes a tooling dependency only when assets are added.

## 2026-05-15 — Music engine refactored to data-driven `MusicConfig`

**Context:** `audio/music.ts` had every constant, probability, drum
position, ADSR and gain hardcoded inline. Tuning the soundtrack meant
editing TypeScript and reasoning about the engine's control flow. We
wanted a dev tool to author/tune the music live — but a live editor
needs the parameters to be *data*, not code paths.
**Decision:** Extract every tunable into `src/audio/musicConfig.ts` as a
strongly-typed `MusicConfig` tree (`DEFAULT_MUSIC_CONFIG`). The value of
each field was lifted one-for-one from the previous implementation, so
booting with the default is **bit-identical** to the pre-refactor sound
(same notes, gains, probabilities). The engine reads
`getMusicConfig()` each tick — swapping the config swaps the sound with
no loop reset. Pure derivation helpers (`computeBpm`,
`computeIntensity`, `computeComboTier`) are exported so the engine and
the lab share *exactly* one source of truth (DRY) and the lab can show
predictions without running audio. `synth.ts` gained the small surface
the lab/analyzer needs (+32 lines).
**Alternatives:** A JSON file loaded at runtime only (rejected — loses
TypeScript typing and bit-identity guarantees); keeping constants in
`music.ts` and having the lab patch them via a parallel path (rejected —
two sources of truth, drift inevitable); a full second synth engine for
the lab (rejected — duplicates the SID voice, lab would not be testing
the *real* sound the game ships).
**Consequences:** `music.ts` is now a pure interpreter of `MusicConfig`
(465 lines reworked, net ±3). The game ships the saved config when one
exists (next entry). Future music features become config fields, not
engine branches. Bundle JS gzipped is ~18.4 KB (was ~15 KB) — the
config tree is data, terser keeps it; still far under the 100 KB cap.

## 2026-05-15 — Dev-only Audio Lab: three-layer production isolation

**Context:** The user wants an internal mini-DAW / audio debug console
to author and tune the game's procedural music. It must be a developer
tool only — it must not exist in, be referenced by, or add a single
byte to the production bundle, even if someone manually hits its route.
**Decision:** A separate Vite entry, `lab.html` → `src/lab/main.ts`
(~3.9 KLOC, vanilla DOM + canvas, no framework — same conventions as the
game). Protection in three independent layers, any one of which is
sufficient:

1. **Build:** `vite build`'s only input is `index.html`. `lab.html`
   sits at repo root; Vite dev serves it automatically, but production
   never lists it as an input → it is never crawled, compiled or copied
   to `dist/`.
2. **Plugin:** `neonophis-dev-only-lab` (`apply: 'build'`, `enforce:
   'pre'`) throws from `resolveId`/`load` if any id contains
   `/src/lab/` or `/lab.html`. A misconfiguration that drags the lab
   into the prod graph fails the build loudly instead of silently
   shipping it.
3. **Runtime:** `src/lab/main.ts` throws on `!import.meta.env.DEV`
   before any side effect — last-resort guard for a mis-served bundle.

The lab edits the live `MusicConfig` and bridges it into the real
`music.ts` engine (`preview.ts`), reusing the singleton `AudioContext`
from `synth.ts` (no second context). Persistence is a **dev-server
endpoint** `/__lab/save-music-config` (`labConfigSaver` plugin,
`apply: 'serve'` — does not exist in `vite build`) that writes
`src/audio/musicConfig.override.json`.
**Alternatives:** Lab behind an `if (env.dev)` inside the game bundle
(rejected — code still ships, just dead); a separate npm package /
repo (rejected — drifts from the engine it tunes, no live bridge);
gating only at runtime (rejected — bundle bloat + discoverable route).
The "edit code constants directly" status quo was rejected by the
previous entry's premise.
**Consequences:** Verified: production build is 35 modules → 18.44 KB
JS + 20.91 KB CSS gzipped; `dist/` contains only `index.html` + game
assets; zero `src/lab/`, `lab.html`, `AUDIO LAB` or `neonophis-lab`
strings in the bundle. The single `musicConfig.override` reference in
the bundle is the game's own `import.meta.glob` in
`src/audio/musicConfig.ts` — game code under `src/audio/`, **not** lab
code, intentionally shipped so the game plays the lab-authored config.
The override JSON is the one lab artifact that crosses into production,
by design, as plain game data.

## 2026-05-15 — Game eats magnet-pulled food on the same tick

**Context:** With the magnet power-up, food can be pulled directly onto
the head between movement ticks. The eat check only ran during the
movement step, so a pulled apple could sit under the head for a tick (or
be missed), costing the player score/combo the magnet implicitly
promised.
**Decision:** In `simulate()`, immediately after `tickPowerUps`, if a
magnet is active, scan `state.foods` for one coincident with the head
and `eatFood()` it right away — before the movement tick.
**Alternatives:** Detect only on the next movement tick (status quo —
felt unresponsive, the whole point of magnet is immediacy); move the
eat check entirely out of the movement step (rejected — larger refactor,
the movement-step check is correct for normal play).
**Consequences:** Magnet feels immediate. The eat path now has two call
sites (movement + magnet); both funnel through the same `eatFood()` so
score/combo/FX stay consistent. Bounded O(foods) scan per tick only
while a magnet is active — negligible.

## 2026-05-16 — Hi-scores: arquivo JSON + entrada de nome estilo arcade

**Context:** Hi-scores estavam em `localStorage` sem nome do jogador.
Queríamos persistência em arquivo e uma entrada de nome arcade (8 chars)
na tela de game over. O jogo é deployado como site estático em VPS Apache
(`adrianofranco.com.br/neonophis/`) — sem PHP, sem Node.js embutido no
Apache.

**Decision:** Arquitetura dual-endpoint baseada em `import.meta.env.DEV`:
- Dev: plugin Vite (`highscoreServer`) intercepta `/__api/scores` GET/POST
  e lê/grava `highscores.json` na raiz do projeto.
- Produção: `__api/scores` (URL relativa) → `public/.htaccess` RewriteRule
  `[P]` faz proxy para `scores-server.js` rodando via PM2 na porta 3001.
  O arquivo `highscores.json` fica ao lado do servidor, fora do `dist/`,
  e nunca é apagado por rebuild.
- Fallback: se o endpoint não responder, cai para `localStorage`.

Entrada de nome: Canvas puro (sem DOM input), 8 slots estilo arcade com
cursor piscante, capturado via `keydown` no `main.ts`. Confirmar com Enter
mostra o ranking antes de permitir restart (bug original: `confirm` bufferizado
em `keyboard.ts` causava restart imediato — corrigido com `consumeCommands()`
após `confirmNameEntry()`).

**Alternatives:** PHP no servidor (rejeitado — sem PHP disponível); localStorage
puro (rejeitado — não persiste entre browsers/dispositivos e some com limpeza
de cache); serviço externo como Supabase (rejeitado — overhead desnecessário
para projeto pessoal em VPS própria).

**Consequences:** Requer `scores-server.js` rodando na VPS com PM2 e
`mod_rewrite`/`mod_proxy` ativos no Apache. Em hosting estático puro, cai
silenciosamente para localStorage. `HighScoreEntry` agora inclui `playerName`.
`recordScore()` foi removido; substituído por `checkScoreRank()` + `saveScore()`.

## 2026-05-16 — Confirm-quit dialog ao pressionar ESC durante o jogo

**Context:** Apertar ESC acidentalmente durante uma run retornava imediatamente
ao menu, destruindo o progresso sem aviso. UX padrão de arcades modernos exige
confirmação explícita para ações destrutivas irreversíveis.

**Decision:** Primeiro ESC abre um overlay "QUIT?" (pausa automática do jogo)
com as opções Y/Enter para confirmar e N/ESC para cancelar e retomar. A lógica
vive inteiramente em `main.ts` com dois flags de módulo: `confirmQuit` e
`confirmQuitWasPaused`. O segundo flag preserva o estado de pausa anterior —
se o jogador já estava pausado quando abriu o diálogo, canceling não despausa.

**Alternatives:** Modal DOM (rejeitado — projeto não usa DOM para UI de jogo;
quebraria a coerência visual). Tela separada como terceiro estado de `Screen`
(rejeitado — overhead de estado desnecessário para um overlay efêmero).
"Double-tap ESC" sem overlay (rejeitado — sem feedback visual, o jogador não
saberia que um segundo ESC confirmaria a saída).

**Consequences:** `pollInput()` no branch PLAY agora tem dois caminhos para
`cmds.back`: primeiro ativa o diálogo, segundo cancela. O listener `keydown`
intercepta Y/N antes de qualquer outro handler quando `confirmQuit` é `true`.
`startGame()` e `returnToMenu()` fazem reset de `confirmQuit`. `R` (restart)
é bloqueado enquanto o diálogo está aberto.

## 2026-05-16 — Mobile: swipe-only steering + contextual DOM touch layer

**Context:** No celular o jogo era injogável fora do gameplay: só o swipe
alimentava o buffer de direção; menu (Setas/Enter), pause (P), sair (Esc),
restart (R) e a entrada de nome do hi-score (captura de `keydown`) eram
todos exclusivos de teclado físico. Num smartphone era literalmente
impossível iniciar uma partida ou digitar o nome num recorde. CLAUDE.md §16
prometia "controles touch + swipe" mas só o swipe existia. Uma primeira
iteração adicionou um D-pad na tela; o usuário considerou as setas
desnecessárias (o swipe já dirige bem) e atrapalhando, e decidiu removê-las.

**Decision:** Camada de controle DOM ciente da tela, vivendo inteiramente
dentro de `#touch-overlay`, que é `display:none` exceto sob
`@media (pointer: coarse)` — então o caminho desktop/teclado fica
byte-a-byte idêntico. A direção continua **só por swipe, por decisão**
(sem D-pad na tela). A camada só adiciona o que o swipe não expressa:
- MENU: tocar na linha do modo → inicia (geometria compartilhada via
  `MENU_ORDER`/`menuHitTest`, extraídos de `ui/menu.ts` num refactor puro).
- PLAY: pílulas de pause + sair (topo-direita).
- QUIT?: modal SIM/NÃO.
- GAME OVER: JOGAR DE NOVO / MENU.
- Entrada de nome: um `<input>` real (tocar = teclado nativo; o toque é o
  gesto de usuário exigido pelo iOS) espelhado em `nameEntry.name`.
Os botões injetam exatamente as mesmas flags `commands` que o teclado já
drena (`injectCommand` em `keyboard.ts`) — zero lógica de jogo nova. A
mudança em `main.ts` é um `initTouchControls(...)` + um
`syncTouchControls(screen,nameEntry,confirmQuit)` por frame (DOM tocado só
quando a tela muda) + uma guarda para o handler de nome existente não
processar em dobro as teclas vindas do teclado nativo.

**Alternatives:** D-pad na tela — construído primeiro, rejeitado pelo
usuário (redundante com o swipe, obstruía o campo). Botões desenhados no
canvas com hit-test manual por tela — rejeitado (reimplementa a
geometria/layout que o renderer já possui; botões DOM são mais simples,
acessíveis e isolados). Teclado A–Z no canvas para o nome — rejeitado
(grande; o teclado nativo é mais agradável e cabe num único `<input>`).
`<input>` oculto com auto-foco — rejeitado (iOS bloqueia foco programático
sem gesto do usuário; um campo tocável explícito é confiável).

**Consequences:** Mobile jogável de ponta a ponta sem teclado. Desktop
intocado (gate único `pointer: coarse` + `display:none`). Novo módulo
`src/input/touchControls.ts`; `ui/menu.ts` expõe `MENU_ORDER`/`menuHitTest`
(refactor puro, compartilhado com o render); `keyboard.ts` expõe
`injectCommand`. Bundle JS ~20.8 KB gzipped (bem abaixo de 100 KB). A
paridade de direção com o desktop é intencionalmente *parcial* — não há
controle direcional na tela, por decisão do usuário; se um usuário futuro
quiser, basta re-adicionar um D-pad atrás da mesma camada. O campo de
jogo em retrato continua pequeno/centralizado (grid fixo 32×24, 4:3) —
aceitável por ora, anotado como questão aberta em HANDOFF.

## 2026-05-16 — Background canvas desenha em espaço CSS (consistência do cap de DPR)

**Context:** `render/background.ts` dimensionava seu canvas em
`resizeBackground` com o dpr **limitado a 2** (passado de `main.ts`,
igual ao `renderer.ts`), mas `updateBackground` recalculava a região de
desenho como `bgCanvas.width / window.devicePixelRatio` usando a razão
**crua, sem limite**. Em celulares (devicePixelRatio comumente 3) a área
pintada encolhia para ~2/3 da tela — "background estranho no mobile". No
desktop (DPR 1 ou 2) coincidia, então nunca aparecia lá.

**Decision:** Capturar `cssW/cssH` (espaço CSS) em `resizeBackground` e
desenhar com eles, exatamente como `renderer.ts` (o contexto já embute o
dpr limitado no transform, então todo desenho é em px CSS). Parar de
derivar dimensões de `window.devicePixelRatio` no caminho de update.

**Alternatives:** Usar o devicePixelRatio cru em tudo e descapar o canvas
de fundo (rejeitado — inconsistente com `renderer.ts`, e um backing store
3×+ na camada de fundo, que é barata por design, desperdiça fill rate,
violando §6/§18). Reler `bgCanvas.style.width` como número a cada frame
(rejeitado — parse de string num caminho de 30 Hz; guardar dois números
no resize é grátis).

**Consequences:** Fundo preenche o viewport em qualquer DPR.
Comportamento em DPRs típicos de desktop (1, 2) inalterado. O modelo de
uma linha agora bate com `renderer.ts` (desenha em espaço CSS, dpr via
setTransform). Sem impacto no bundle.

## 2026-05-17 — Tela de créditos (Screen 'CREDITS')

**Context:** O jogo tem autoria declarada ("Adriano Franco") e referências
claras (Commodore 64, COMPUTE! Publications). Uma tela de créditos é
necessária para atribuição e dá mais completude ao produto.

**Decision:** Novo estado `'CREDITS'` em `Screen` e novo módulo
`src/ui/credits.ts` com créditos scrollando no canvas. Acessível pelo
item "CRÉDITOS" no menu. Navegação de volta ao menu via ESC/Enter/Backspace
(desktop) ou botão DOM "VOLTAR" (camada touch, mesma lógica do resto dos
botões de navegação). Em telas estreitas (< 460 px) a largura de cada linha
é limitada ao espaço disponível e o hint "ESC · ENTER · VOLTAR" é ocultado
(o botão DOM já cobre).

**Alternatives:** Sub-seção scrollável dentro da tela de menu (rejeitado —
sem espaço natural para scroll; quebra o ritmo visual do menu). Modal overlay
(rejeitado — menos polido para créditos que uma tela dedicada).

**Consequences:** `Screen` agora tem 6 valores: `SPLASH | MENU | PLAY |
PAUSE | GAMEOVER | CREDITS`. `ui/menu.ts` inclui um item CRÉDITOS em
`MENU_ORDER`. `main.ts` roteia `'CREDITS'` no loop de render e no
handler de input. `touchControls.ts` expõe o botão VOLTAR para essa tela.

## 2026-05-17 — Música ambiente no menu

**Context:** O jogo ficava silencioso nas telas de splash e menu; a música
só começava quando uma partida iniciava. A experiência inicial era flat e
não preparava o humor do jogador antes de escolher um modo.

**Decision:** `audio/music.ts` ganhou uma função `startMenuMusic()` que toca
uma variante calma e em loop da trilha procedural enquanto o jogador está
no menu ou na splash. `main.ts` chama `startMenuMusic()` na transição para
`'MENU'` / `'SPLASH'` e `stopMenuMusic()` ao iniciar uma partida. O toggle
de mute (M) é respeitado.

**Alternatives:** Loopear um arquivo de áudio estático (rejeitado —
filosofia do projeto: sem assets de áudio, tudo síntese procedural). Usar
a trilha de gameplay em intensidade baixa (rejeitado — desperdiça o efeito
de crescendo ao entrar no jogo).

**Consequences:** A transição splash → menu → jogo agora tem progressão
sonora contínua. `music.ts` exporta `startMenuMusic()` / `stopMenuMusic()`.
Nenhum impacto no bundle ou na lógica de jogo.

## 2026-05-17 — Splash screen como primeiro estado + modal de modo no mobile

**Context:** O jogo abria direto no menu, o que era abrupto no desktop (sem
introdução) e problemático no mobile (o primeiro tap poderia acidentalmente
selecionar um modo sem o jogador ter lido nada). No mobile especificamente
faltava um momento de aterrissagem consciente.

**Decision:** Novo estado `'SPLASH'` como tela inicial, renderizado por
`src/ui/splash.ts`: título animado, tagline, crédito de autor "Adriano
Franco apresenta", e hint "PRESS ANY KEY" (desktop) ou botão DOM flutuante
"JOGAR" (mobile). Qualquer tecla/tap avança para o menu com fade de 220 ms
(`goToMenu()` em `main.ts`). O botão JOGAR vive em `#touch-overlay` (mesmo
gate `pointer: coarse` dos outros controles), animado via keyframe CSS
`tc-float` (±12 px, 2,4 s) e dimensionado em 180×76 px. No mobile o título
canvas para de oscilar para não colidir com o botão DOM. A tagline desce
para `h×0.72` e o hint desktop sobe para `h×0.83` para não sobrepor o botão.

No mobile, tap numa linha de modo do menu agora abre um **modal informativo**
(nome do modo, blurb, hi-score atual) com botões JOGAR e VOLTAR — substituindo
o "tap direto → inicia" da sessão anterior, que dava ao usuário zero contexto
sobre o modo e causava starts acidentais.

**Alternatives:** Splash HTML/CSS separado (rejeitado — inconsistente com o
estilo canvas do resto do jogo). Manter menu como tela inicial (rejeitado —
abrupto; no mobile o primeiro tap caía numa linha de modo). Tooltip/popover
on long-press para info de modo (rejeitado — comportamento nativo do iOS
conflita; unreliable).

**Consequences:** Fluxo de navegação: `SPLASH → MENU → PLAY/CREDITS`.
`main.ts` define screen inicial como `'SPLASH'`. `touchControls.ts` gerencia
estado de modal aberto/fechado e o botão de splash. A assinatura de
`syncTouchControls` foi ampliada para incluir screen `'SPLASH'`.

## 2026-05-17 — Adaptações de tela estreita (< 460 px CSS)

**Context:** Em celulares com largura lógica entre 360–414 px (comuns),
elementos de UI desenhados no canvas transbordavam ou exibiam hints
exclusivos de teclado inúteis para quem usa os botões DOM (ex: "P para
pausar", "ESC · ENTER · VOLTAR").

**Decision:** Branches condicionais por largura em todos os módulos de UI
relevantes: `renderer.ts` encurta o hint de pause; `ui.ts` desloca o label
de modo no HUD para não sobrepor as pílulas touch; `credits.ts` limita
largura de linha e oculta hint de teclado; `gameover.ts` omite slots de nome
canvas e hints de teclado, condensa hi-score (sem coluna de data); `menu.ts`
reduz tamanho mínimo do título e trunca blurbs à primeira frase.

**Alternatives:** Escala uniforme da fonte do canvas (rejeitado — torna tudo
menor, não só os elementos problemáticos). Media queries CSS (rejeitado —
a UI do jogo é desenhada no canvas, não no DOM; CSS só rege o overlay touch,
que já estava correto).

**Consequences:** Phones estreitos (< 460 px) têm UI canvas limpa e sem
colisões. Desktop e mobile mais largo são idênticos. A variável `canvasW`
(já computada por frame) é o único gate, sem estado adicional.

## 2026-05-17 — Internacionalização PT/EN orientada a dados (i18n)

**Context:** As strings visíveis estavam cravadas no código e eram uma
mistura de PT e EN (ex.: `GAME OVER`, `SCORE`, blurbs de modo em inglês;
`VOLTAR`/`JOGAR`, `quem fez isso aqui`, créditos em português). O usuário
pediu suporte a PT **e** EN, com JSON por idioma e abertura para novas
línguas.

**Decision:** Módulo i18n zero-dependência em `src/i18n/`. Locales são
JSON puros (`locales/<code>.json`) descobertos por `import.meta.glob`
(mesmo padrão de `audio/musicConfig.ts`); `index.ts` é o interpretador e
`t(key, params?)` o único ponto de consumo. Idioma inicial = escolha
salva (`localStorage:neonophis:lang`) → `navigator.language` → `en`.
Trocar idioma reescreve `<html lang>` / título / meta description e
notifica subscribers (`onLangChange`) para o DOM; o canvas relê via `t()`
a cada frame. Toggle por **bandeiras** na splash e no menu, **sem atalho
de teclado** (escolha do usuário): desktop desenha bandeiras no canvas
(`ui/langToggle.ts`, geometria única compartilhada render+hit-test) com
clique no canvas; mobile usa pílulas DOM no `#touch-overlay` (split
desktop-canvas / mobile-DOM do §16; o toggle de canvas dá no-op sob
`pointer: coarse`). `tagline`, meta description e nome do produto ficam
**em inglês em todos os locales** — identidade de marca, decisão explícita
do usuário (editou os JSON à mão para reverter essas três).

**Alternatives:** Biblioteca i18n (rejeitado — viola "zero deps" do §2;
peso desnecessário). Strings TS tipadas em vez de JSON (rejeitado — o
usuário pediu JSON explicitamente; JSON dá hot-reload e edição por
não-devs, e espelha `musicConfig`). Emoji de bandeira 🇧🇷/🇺🇸
(rejeitado — degrada para "BR"/"US" no Windows Chrome/Firefox e é instável
em `<canvas>`; quebraria o §20). Toggle por tecla (rejeitado pelo
usuário). Auto-detecção silenciosa sem UI (rejeitado — o usuário quer a
bandeira visível para escolha consciente na splash).

**Consequences:** `ModeConfig` não carrega mais `label`/`blurb` (agora
`modeLabel()`/`modeBlurb()` resolvem via `t()`); `ChaosEvent.label` virou
`labelKey`. Novo idioma = um arquivo JSON, zero código. `t()` sem params
é alocação-zero (referência direta do JSON parseado) — seguro no hot path
(§18). Bundle: 26,5 KB JS gzip (orçamento 100 KB). O Audio Lab é
indiferente (não usa rótulos de modo/caos). Único artefato i18n que cruza
para produção: os próprios JSON sob `src/i18n/locales/` (dados de jogo,
como `musicConfig.override.json`). Strings de marca não traduzidas no
`pt.json` são intencionais — não tratar como bug.

## 2026-05-18 — PWA / offline (service worker + manifest + ícones)

**Context:** O jogo é praticamente um app offline disfarçado — bundle
~47 KB gzip, zero assets externos, áudio/gráficos procedurais, fontes
inline em base64, hi-scores que já caem para `localStorage` quando o
endpoint não responde (§15). O usuário pediu para torná-lo instalável e
jogável offline, e perguntou explicitamente se um build novo se
propagaria automaticamente.

**Decision:** PWA com **service worker hand-rolled, zero dependência**
(fiel ao §2; sem `vite-plugin-pwa`/Workbox), estratégia **cache-first em
runtime**, `display: fullscreen`. Três artefatos estáticos em `public/`
(copiados verbatim pelo Vite): `manifest.webmanifest`, `sw.js`,
`icons/*`. SW: `__api/*` network-only (ranking autoritativo; offline →
localStorage), navegação network-first com timeout (redeploy pego no
próximo acesso online, sem bump), `/assets/*` cache-first (content-hash
do Vite = imutável), resto cache-first. O gap "bundle hasheado é pedido
antes de o SW controlar a página" é fechado no `install`: o SW busca o
`index.html`, raspa as URLs hasheadas e as pré-cacheia → offline real
após **uma** visita online, sem plugin de build. Registro em `main.ts`
guardado por `if (import.meta.env.DEV) return;` — mesma disciplina
dev-only do §22 (SW no dev-server envenena HMR e o Audio Lab). Ícones
gerados por `scripts/build-assets.sh` (§7) em `public/icons/`.

**Alternatives:** **Precache no build via plugin Vite (estilo
Workbox/Option B)** — rejeitado: para um app de **um HTML + um bundle**,
o ganho de B (primeira sessão offline antes de qualquer navegação)
quase não existe (só há uma navegação), e o plugin acopla ao build
contra o ethos "sem framework, zero deps" do §2. O usuário concordou
após o tradeoff ser explicado. **`vite-plugin-pwa`** — rejeitado pelo
mesmo motivo (dependência + Workbox). **Cachear `__api/scores`** —
rejeitado: serviria ranking velho ou quebraria submissão; o fallback
localStorage já cobre offline com graça. **Forçar `orientation`** —
rejeitado: o cramp em retrato é questão aberta separada (HANDOFF), não
misturar. **Editar `public/.htaccess`** com headers de cache do SW —
rejeitado (escolha do usuário): não mexer silenciosamente na infra do
VPS; vira passo de ops documentado. **Rasterizar `assets/src/icon.svg`
com ImageMagick** — rejeitado por necessidade: o ambiente não tem
`rsvg-convert`/inkscape/cairosvg e o renderer SVG interno do IM derruba
o path Bézier inteiro; `build-assets.sh` reproduz o ícone via MVG nativo
+ gradiente nativo (determinístico, IM puro, §7.2).

**Consequences:** Jogo instalável, fullscreen, offline-after-one-visit.
Bundle JS/CSS **inalterado** — SW/manifest/ícones são estáticos fora do
grafo do bundle; `main.ts` ganhou ~10 linhas (registro guardado por DEV).
Ícones: ~32 KB total (orçamento §7.5: 50 KB) — desvio consciente do §7.5
(PNG em `public/icons/`, não `assets/`): manifest exige URL estável e o
§7.1 já lista isso como asset legítimo; SVG-mestre + script no Git →
regenerável. `npm run assets` regenera tudo. **Passo de ops obrigatório
em produção** (Apache, ver `HANDOFF.md`): servir `sw.js` com
`Cache-Control: no-cache` (ou max-age curto) e `manifest.webmanifest`
como `application/manifest+json` — sem isso a propagação de update
emperra. CLAUDE.md ganhou §24 como verdade do projeto. A propagação
automática **não depende** da escolha A vs B: vem de SW versionado +
`skipWaiting`/`clients.claim` + navegação network-first + `sw.js`
sem cache HTTP longo.
