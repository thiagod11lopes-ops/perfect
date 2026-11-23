# Prompt — Add a new game mode

A game mode in this codebase is a `ModeConfig` entry + lifecycle hooks
in `main.ts`. Roughly 30 lines of code.

---

## Checklist

1. **Define the mode in one sentence.** Name + rule + win/lose
   condition. Examples: "Survival — power-ups disabled, walls collapse
   inward every 30s." If it can't fit in one sentence, it's two modes.
2. **Add `ModeId`** to the union in `src/gameplay/modes.ts`.
3. **Add a `ModeConfig` entry** in the `MODES` map. Required fields:
   - `label`, `blurb`
   - `initialMaxFoods` — concurrent foods on screen
   - `powerupBaseChance`, `rareTypeChance`, `ttlPowerup`
   - `baseMoveIntervalTicks` — initial speed
   - `moveIntervalForApples(applesEaten)` — speed-up curve
   - `shouldEndOnCollision` — can the player die?
   - `hasTimer` — does timer matter?
   - `applesPerSpeedup` — informational only
   - `chaosEvents` — opt into chaos events
4. **Add to menu order** in `src/ui/menu.ts` `ORDER` array.
5. **Mode-specific initial state** — if the mode needs a non-default
   start, add a branch in `createInitialState()` in
   `src/engine/state.ts`. Examples: `passWalls: true` (already done
   for relax/timeattack), starting `timeRemainingMs`, longer initial
   snake.
6. **Mode-specific simulate hook** — if the mode has unique mid-game
   behavior (a custom event timer, shrinking walls, etc.), add a small
   helper in `gameplay/modes.ts` and call it from `simulate()` in
   `main.ts`. Don't bloat `simulate()` with mode-specific code paths;
   delegate.
7. **Mode-specific UI** — if you need new HUD elements (e.g., a
   "rounds left" counter), add them in `src/render/ui.ts` behind a
   mode check.
8. **High-score key** — automatic; uses `neonophis:hi:<modeId>`.
9. **Test all 4 paths:** start, play, die / survive, return to menu.
10. **Update meta:** mention the new mode in CLAUDE.md §14 if it ships
    permanently. Append `HISTORY.md`. Append `DECISION_LOG.md` only if
    a non-obvious rule was chosen.

---

## Anti-checklist

- ❌ Don't introduce mode-checking ladders inside `gameplay/snake.ts`,
  `gameplay/food.ts`, or `gameplay/collision.ts`. Mode logic stays in
  `gameplay/modes.ts` + `main.ts`.
- ❌ Don't shorten `applesPerSpeedup` to brutalize the player. Tune
  `moveIntervalForApples()` instead.
- ❌ Don't rename existing `ModeId` values. They're written to
  localStorage as high-score keys; users would lose their scores.
