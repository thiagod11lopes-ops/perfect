# architecture.md — Module map and data flow

> Read together with CLAUDE.md §3 and §4. This file is the *contract*
> between modules; CLAUDE.md is the *philosophy*.

---

## Top-level layout

```
src/
├── main.ts                    glue: lifecycle, screen state, eat handler
├── engine/
│   ├── loop.ts                fixed-timestep + interpolation
│   ├── state.ts               GameState shape + factory
│   ├── rng.ts                 xorshift32 (deterministic)
│   └── events.ts              pub/sub bus
├── input/
│   ├── keyboard.ts            FIFO-2 buffer, anti-180°, easter codes
│   └── touch.ts               swipe → pushDirection
├── gameplay/
│   ├── snake.ts               step + grow + occupancy check
│   ├── food.ts                spawn + TTL + scoring table
│   ├── collision.ts           grid-based head check
│   ├── combo.ts               chain + multiplier + decay
│   ├── powerups.ts            registry, activation, tick, expire
│   └── modes.ts               4 modes + chaos events
├── render/
│   ├── renderer.ts            top-level draw orchestrator + metrics
│   ├── background.ts          offscreen 30 Hz neon background
│   ├── foodRenderer.ts        per-kind food drawing
│   ├── snakeRenderer.ts       body, eyes, expression, hat, trail
│   └── ui.ts                  HUD: score, combo, power-up rings, timer
├── fx/
│   ├── particles.ts           pre-allocated pool of 600
│   ├── screenshake.ts         trauma-based
│   ├── flash.ts               fullscreen flashes + zoom pulse
│   └── floatingText.ts        "+10" / "COMBO ×N" pool
├── audio/
│   ├── synth.ts               Web Audio synthesis primitives
│   ├── sfx.ts                 event → preset map
│   └── music.ts               pentatonic procedural loop
├── ui/
│   ├── menu.ts                main menu (mode selector)
│   └── gameover.ts            stats + leaderboard
└── storage/
    └── highscores.ts          localStorage persistence
```

---

## Lifecycle (per frame)

`main.ts` calls `startLoop({pollInput, simulate, render})`. Inside the loop:

1. **`pollInput()`** — once per frame.
   Reads `consumeCommands()` (pause/restart/back/confirm). Direction keys
   are pushed to a separate FIFO consumed inside `simulate()`.
2. **`simulate(dt)`** — at 60 Hz (accumulator-driven, can run 0..N times).
   - Decrements `timeRemainingMs` (TimeAttack).
   - Ticks foods TTL, combo decay, power-ups.
   - Increments `ticksSinceMove`; when ≥ `moveIntervalTicks` → calls
     `advanceSnake()` which calls `consumeNextDirection()` and
     `stepSnake()`, then runs `checkHeadCollision()` and food consumption.
   - Spawns chaos events (Chaos mode only).
   - Updates music intensity.
3. **`render(alpha, frameDtMs)`** — every animation frame.
   - Updates particles, floating text, flashes (variable rate).
   - Updates background canvas (capped at 30 Hz internally).
   - Picks the screen (MENU / PLAY / GAMEOVER) and draws.

---

## State ownership

The single `GameState` object (`engine/state.ts`) is the authoritative
truth. Mutation rules:

| Module             | May mutate?                 | What                          |
|--------------------|-----------------------------|-------------------------------|
| `engine/loop.ts`   | No                          | —                             |
| `gameplay/*`       | Yes (during `simulate`)     | snake, foods, combo, powerups |
| `render/*`         | **No**                      | reads `prevBody`/`body`        |
| `fx/*`             | No (state) / Yes (own pools) | particles, trauma, flashes    |
| `audio/*`          | No                          | reads, schedules sound        |
| `ui/*`             | Read-only                   | renders the state             |
| `main.ts`          | Yes                         | screen lifecycle, eat handler |

Violating "render never mutates state" is the modern equivalent of moving
a sprite while the raster is scanning it (CLAUDE.md §3).

---

## Communication patterns

- **Direct call:** within a gameplay phase — `eatFood()` calls
  `bumpCombo()`, `grow()`, `activatePowerUp()`. Tight coupling is fine for
  the same conceptual operation.
- **Event bus (`engine/events.ts`):** for cross-system signals. Gameplay
  emits `EAT`, `EAT_POWERUP`, `COMBO_UP`, `GAME_OVER`, `WALL_BONK`,
  `SPEED_UP`, easter eggs. Audio, FX, UI subscribe.
- **No global mutable singletons** other than `GameState` and the FX
  pools. RNG state, audio context, and event handlers are per-process by
  design.

---

## Render layers (CLAUDE.md §6)

Drawn in this order, back to front:

```
LAYER 0  bg-canvas (separate <canvas>, 30 Hz)
LAYER 1  grid lines              ┐
LAYER 2  foods                   │
LAYER 3  snake body+glow+trail   ├─ inside game-canvas (60 Hz)
LAYER 4  snake head+eyes+hat     │
LAYER 5  particles + floating    │
LAYER 6  HUD                     ┘
overlay  fullscreen flashes
overlay  trauma vignette
overlay  pause overlay
```

Screen-shake is applied to layers 1–6 (post-translation), not to bg or
HUD. Zoom-pulse wraps everything inside the game canvas.

---

## Performance contract

- Hot path (`simulate` + `render`) must do **zero allocations**.
- `Array#splice`, `Array#shift`, `Array#unshift` are used on the snake
  deque — acceptable because the body is short (<200) and the operations
  are O(n). If snake length explodes, switch to a ring buffer.
- `requestAnimationFrame` is the only timer. No `setInterval` for game
  logic. (Music uses `setTimeout`, which is acceptable for a coarse
  scheduler.)
- DPR capped at 2 to avoid 4K nightmare-mode on Retina.
