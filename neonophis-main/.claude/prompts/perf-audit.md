# Prompt — Performance audit

Run before any release. Target: **60 fps stable on a 2018 laptop**, frame
budget ≤ 8 ms per frame.

---

## Steps

1. **Build production:** `npm run build`. Confirm bundle is < 100 KB
   gzipped. (Currently ~15 KB.)
2. **Serve preview:** `npm run preview`.
3. **Open Chrome DevTools → Performance.**
   - Disable cache.
   - Set CPU throttling to **4× slowdown** (simulates a Chromebook).
   - Record 10 seconds of active gameplay including a power-up,
     a combo break, and a screen shake event.
4. **Look for these red flags:**
   - **Long task > 16 ms.** Anything red on the frame timeline.
   - **GC sawteeth.** Allocation pressure during gameplay → check the
     particle pool isn't being bypassed; check for `new` in render.
   - **Layout / Paint thrashing.** Should be near zero — we render to
     canvas only. CSS changes are limited to start/pause overlays.
   - **`drawImage` from a non-power-of-two source.** The bg-canvas
     isn't drawn into the main canvas (separate layer), so this should
     not appear. If it does, you accidentally added an offscreen
     compositing step.
5. **Memory tab → Heap snapshot during gameplay.** Take two snapshots
   60s apart. Diff them. Allocation count should be near zero in
   gameplay code.
6. **Network tab on first load:** confirm only `index.html` and the
   single `.js` chunk are downloaded. No fonts, no images, no audio.

---

## Common offenders & fixes

| Symptom                              | Likely cause                                   | Fix                                                  |
|--------------------------------------|------------------------------------------------|------------------------------------------------------|
| GC pause every ~5s                   | Particles `{}` literal in spawn path          | Use `findFree()` from the pool, mutate in place.    |
| Frame > 16ms with many powerups      | `tickPowerUps` calls `array.find` per frame    | Already O(N) on tiny N; profile first before fixing. |
| Stutter on first sound               | `AudioContext` cold-start                      | `ensureAudio()` on first user gesture, not on RAF.   |
| Background canvas flickers           | Re-paint on every `requestAnimationFrame`      | Confirm the 33ms gate in `updateBackground` is intact. |
| Snake "wavers" mid-cell              | Render mutating state                          | Audit for any state writes inside `render()`.        |
| Bundle creeps over 50 KB             | New dep snuck in                              | Audit `package.json` runtime deps; should be empty.  |

---

## Acceptance bar

- [ ] 60 fps sustained for a full 60-second TimeAttack run on
      mid-range hardware (2018 laptop, mobile-class GPU).
- [ ] No GC pause > 5 ms in a 60-second window.
- [ ] First-paint latency < 200 ms on cached load.
- [ ] No console errors or warnings during gameplay.
- [ ] Production bundle < 100 KB gzipped (we have lots of headroom).

If anything fails: document the issue, propose a fix, and add a
`lessons-learned.md` entry once it's resolved.
