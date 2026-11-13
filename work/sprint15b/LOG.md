# Sprint 15b log (v1.0-rc9b: "Read the Bone")

Working copy: `work/sprint15b/build.html` (from `game/current.html`, v1.0-rc9a). Reference, untouched: `work/sprint15b/rc9a.html`.
Harness: `work/sprint15b/t/h.cjs` (Playwright, Chromium, touchscreen taps, loads a build by file path). Source fragments kept in `work/sprint15b/src/`.

## Progress
- [x] Harness: loads a build by path at any viewport, starts a seeded run, taps wall cells and the bone with a real touchscreen.
- [x] Item 1 (first pass): sarcophagus reels replaced by the bone reading (three taps, printed record, honest fork, finds tag). Result still rolled and saved in `openSarc()` before the panel opens.
- [x] Item 2 (first pass): fourth-Fever wheel replaced by the second bone. The roll now happens (and is saved as `state.jpPend`) when the bone is brought out, not on a later tap.
- [x] Reel / wheel sound effects removed; bone sounds added (`k_hiss`, `k_crack`, `k_creep`, `k_stop`, `k_tag`).
- [x] How to Play "Luck" card rewritten as "Chances".
