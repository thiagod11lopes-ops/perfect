# Prompt — Add a new power-up

A power-up in this codebase is a `PowerUp` interface implementation +
food-kind binding + visual + audio cue. Roughly 40 lines of code.

---

## Checklist

1. **Decide name + duration + effect.** Single-line description. If it
   couldn't be summarized in one line, it's two power-ups.
2. **Add `FoodKind` value** in `src/engine/state.ts` (`type FoodKind`).
3. **Add scoring entry** in `src/gameplay/food.ts` (`FOOD_SCORES`).
4. **Add hue mapping** in `src/gameplay/food.ts` (`kindHue()` switch).
5. **Add to power-up pick list** in `food.ts` `pickKind()` if it should
   spawn naturally; otherwise leave out for testing.
6. **Implement the `PowerUp`** in `src/gameplay/powerups.ts`:
   - Pick a `PowerUpId`. Add to the `PowerUpId` union.
   - Add an entry to `REGISTRY` with `onActivate / onTick / onExpire`.
   - Mutate only `state.speedMultiplier`, `state.scoreMultiplier`,
     `state.invincible`, `state.passWalls`, `state.magnetRadius`, or
     introduce a new flag if needed.
7. **Map food → power-up id** in `powerUpForFood()`.
8. **Render the food** in `src/render/foodRenderer.ts` — add a
   `drawX(...)` and a case in the `switch` in `drawFood`. Aim for
   ~20 lines of canvas paths; reuse `lineCap = 'round'` and gradients.
9. **Snake reaction** (optional) in `src/render/snakeRenderer.ts`
   `Expression` union — add a case if eyes should change, then map it
   in `main.ts` `computeExpression()`.
10. **HUD icon glyph** in `src/render/ui.ts` `idGlyph()` and
    `idColor()`.
11. **Sound cue** — usually `sfxPowerUp()` is fine. If the effect is
    distinct enough (e.g., "explode every other food"), add a new
    preset to `src/audio/sfx.ts`.
12. **Particle burst** — already auto-fired from `eatFood()` for any
    power-up. Tune count/size/hue if needed.
13. **Test:** start the game, eat the new food, verify activation,
    duration, expiry, and that combinations with other power-ups don't
    crash.
14. **Update meta:** add a row to the table in CLAUDE.md §11 (or note
    the deviation), append a `HISTORY.md` entry, append `DECISION_LOG`
    entry **only if** you made a non-obvious choice.

---

## Anti-checklist (don't do this)

- ❌ Don't gate combinations. Per CLAUDE.md §11, combos *are* the fun.
- ❌ Don't introduce a duration that ends mid-collision. Use ms, not
  ticks.
- ❌ Don't cache state in a module-level `let`. Power-ups are part of
  `GameState` so replay determinism is preserved.
- ❌ Don't mutate `GameState` from `onTick` for things that aren't the
  power-up's job (e.g., changing the score). That's the eat handler's
  responsibility.
