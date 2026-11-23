# coding-standards.md — TypeScript conventions for this project

> Style follows the spirit of CLAUDE.md (terse, fun, fast). These are the
> *enforceable* rules. If something here clashes with CLAUDE.md, CLAUDE.md
> wins.

---

## Language

- **TypeScript only.** No raw `.js` source files.
- **`strict` + `noUnusedLocals` + `noUnusedParameters`** are on. Don't
  silence them — fix the import or use `_` prefix on intentional
  placeholder params.
- **Target `ES2022`.** Arrow functions, classes, `?.`, `??`, top-level
  await welcome. No transpilation polyfills (Vite passes through).

## Types

- **Never `any`.** Use `unknown` and narrow.
- **`import type` for pure type imports.** Keeps tree-shaking clean and
  avoids circular runtime imports.
- **`readonly` for arrays that shouldn't be mutated** by callers (e.g.
  registry data).
- **Discriminated unions** over enums. Smaller bundle, friendlier types.

## Naming

- **camelCase** for variables, functions, methods.
- **PascalCase** for types, interfaces, classes.
- **SCREAMING_SNAKE_CASE** for module-level constants (`GRID_W`, `TICK_HZ`).
- **`kIdentifier` prefix** is *not* used here. Plain names are fine.

## Files

- **One module = one concern.** `food.ts` doesn't render food. `snake.ts`
  doesn't draw the snake.
- **No barrel `index.ts`** files. They hurt tree-shaking and slow Vite
  cold start. Import the file directly.
- **Keep files <300 lines.** If you exceed, split by sub-concern.

## Comments

- Default to **none**. If a `// comment` would just restate what the code
  says, delete it.
- **Do** comment:
  - The *why* of a non-obvious choice.
  - References to CLAUDE.md sections (`// §6 layer 3`).
  - C64 / GDC paper references (`// trauma-based, GDC 2013`).
- **Don't** comment:
  - "this is the X function" — the name is the comment.
  - Removed code with `// removed` — just remove it.
  - TODO with no owner/date — it'll rot.

## Errors & validation

- **Trust internal callers.** No defensive `if (!arg) return` guards on
  internal functions.
- **Validate at system boundaries** — user input, localStorage parse,
  Web Audio creation. Wrap with try/catch and degrade gracefully.
- **Never throw for control flow.** Return a discriminated union or
  `null`.

## Performance

- **Object pools for anything spawned at runtime.** Particles, floating
  text, future projectile/enemy types.
- **Avoid `Math.random()` in gameplay** — use `engine/rng.ts`. FX may use
  `Math.random()` since they don't affect simulation.
- **Avoid `JSON.parse(JSON.stringify(...))` deep clones.** Use explicit
  copies (`{ ...obj }`, `arr.map(c => ({ ...c }))`).
- **Avoid `Array#sort` in hot path.** Pre-sort, or use insertion-sort on
  near-sorted arrays.

## Forbidden

- `console.log` in committed code. (Vite production strips it, but
  the *code* shouldn't depend on that.)
- `any`, `as any`, `// @ts-ignore`. Use `unknown` + narrowing.
- Mutating `GameState` from a render module.
- Adding a runtime dependency without a `DECISION_LOG.md` entry.
- `setInterval` for game logic. `requestAnimationFrame` is the only timer.

## Testing

- **No tests yet.** This is a feel-driven game. If a regression bites,
  add a focused unit test for that one bug. Don't try to cover the
  renderer.
- **Smoke-test UI changes** with a headless screenshot — see
  `.claude/prompts/smoke-test.md`.

## Git

- **No commits without explicit user request.**
- **Commit message:** imperative present, short. Body optional.
  Example: `add ice power-up cooldown bar`.
- **Never `git push --force` to main.**
