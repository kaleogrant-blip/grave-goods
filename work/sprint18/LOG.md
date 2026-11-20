# Sprint 18 log: v1.0-rc10a, store screenshots, owner hand-off

Resume by reading this file. Branch `sprint-18` (from `origin/main` at 4fccc32).

## Checklist
- [x] A1-A4. Four game fixes, patch script `work/sprint18/ed.py` (17 counted replacements on rc10), build `work/sprint18/build.html`
- [x] A. `t/fixes.cjs` (19 checks, real taps): pass. Same seed, same wall (60 walls) and same results (360 simulated runs) as rc10
- [ ] A. Sprint 16 test set and fuzz on the final build (`bash t/run-all.sh`)
- [ ] B. Promote into `game/current.html`, shell tests and documents, full `npm test`
- [ ] C. Store screenshots (`scripts/store-shots.mjs`)
- [ ] D. `docs/OWNER-TODO.md` rewritten
- [ ] E. Merge to main, CI green

## State right now
Game build made and its own tests pass. Next: run-all, then promote.
