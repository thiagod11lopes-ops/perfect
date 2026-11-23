# domain-knowledge.md — References and lore

> The "why" behind the architecture. Mostly hardware archeology and game-feel theory.

---

## Mapping the Commodore 64 (COMPUTE!, 1984)

The book is the soul of CLAUDE.md. Specific pages we lean on:

| Page    | Topic                                  | Translates to                                |
|---------|----------------------------------------|----------------------------------------------|
| p. 36–37 | Keyboard buffer (LSTX, NDX)            | `input/keyboard.ts` FIFO + debounce          |
| p. 124–125 | Sprite shape data (manual or tool)   | "programmatic-first, ImageMagick-when-needed" |
| p. 137  | Raster blanking warning                | "never mutate state during render"           |
| p. 147–149 | Raster compare IRQ                  | Fixed-timestep simulate / variable render    |
| p. 152  | Sprite priority register               | 7-layer render pipeline                      |
| p. 154  | Sprite collision register caveat       | Grid-discrete collision, not pixel           |
| p. 158–167 | SID registers $D400–$D41C            | `audio/synth.ts` 4 waveforms + ADSR          |
| p. 168–169 | Osc-3 noise as RNG                  | `engine/rng.ts` xorshift                     |

You don't need the book in hand — CLAUDE.md inlines the relevant quotes.

---

## Game-feel canon

- **Glenn Fiedler — "Fix Your Timestep!" (gafferongames.com, 2004).**
  The accumulator pattern in `engine/loop.ts` is a direct port. The
  blog post is required reading before touching the loop.
- **Squirrel Eiserloh — "Juice It or Lose It" (GDC 2013, Vlambeer co-authored).**
  Trauma-based screenshake formula is from Eiserloh's GDC 2013 talk on
  noise-driven game feel. He proposed `shake = trauma²` to make light
  events feel light and big events punch.
- **Jan Willem Nijman et al. — "The Art of Screenshake" (INDIGO 2013).**
  General philosophy of FX layering. Watch it once; rewatch when adding
  any new event with feedback.
- **Vlambeer — "Nuclear Throne" (2015).** Reference for snappy
  small-screen arcade feel. Snake's HUD, particle counts, and
  multiplier scaling are spiritually borrowed.

---

## Snake-specific lore

- **Nokia 3310 Snake** (1997): the canonical version. Why we *don't*
  copy it: discrete jump-per-cell movement feels archaic now. Modern
  Snake interpolates visually but keeps grid-discrete collision —
  exactly what we do.
- **Slither.io** (2016): the "many snakes" massively-multiplayer
  reinterpretation. Out of scope for our v1.
- **Snake Pass** (2017, Sumo Digital): physics-based reinterpretation.
  Out of scope; mentioned only because someone always asks.

---

## Music theory cheat-sheet for `audio/music.ts`

The procedural melody uses **C minor pentatonic**: `C D♯ F G A♯`. In
MIDI numbers from the root C3 (48): offsets `[0, 3, 5, 7, 10]`.

Why pentatonic: any subset sounds consonant. Random walks within the
scale can never produce dissonance — perfect for procedural generation
without musical AI.

BPM tiers (CLAUDE.md §9):
- 100 BPM (`score < 50`) — chill discovery
- 120 BPM (`50 ≤ score < 150`) — building
- 140 BPM (`150 ≤ score < 300`) — locked in
- 160 BPM (`score ≥ 300`) — kick + hat layered, full intensity

---

## Color & visual identity

- **Primary palette:** electric magenta `#ff5fae`, cyan-mint `#00ffd5`,
  hot pink `#ff3366`, gold `#ffe855`, ice blue `#88ddff`.
- **Background:** deep purple-black `#05030f` with radial neon
  gradients in `#1a0840` / `#0a0420`.
- **Snake hue (default skin):** HSL hue 145 (green). Power-ups override
  via `state.powerups`: fire = hue 18, ice = hue 195, rainbow =
  cycling.
- **Glow technique:** never `shadowBlur` in hot path (expensive). Use
  two passes — wide stroke with `globalCompositeOperation = 'lighter'`,
  then thinner core stroke on top.

---

## Easter egg references

| Trigger                | Reference                                           |
|------------------------|-----------------------------------------------------|
| Konami code            | Universal arcade in-joke (Gradius, 1986).          |
| `snek` keyword         | Reddit-era pet name for snakes.                    |
| Score 256              | C64 / 6502 byte rollover at `$0100`.               |
| Score 1337             | "Leet" — hacker culture from late 90s IRC scene.   |
| 13 power-ups → GOLD    | Lucky-13 superstition inversion + arcade unlocks.  |

---

## Things explicitly **not** in scope

- Multiplayer (single-player by design).
- Server-backed leaderboards (privacy > global ranks for v1; CLAUDE.md §15).
- WebGL / 3D (budget + theme).
- Procedural level generation beyond the 32×24 grid (scope creep).
- Achievement system beyond the 3 cosmetic unlocks (skin/hat/easter).
