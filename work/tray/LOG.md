# Tray test build log (v1.0-tray1)

DRAFT while the long simulator runs finish. Numbers marked "pending" are filled in below as they land.

- Build: `work/tray/build.html`. It is made from `game/current.html` (v1.0-rc9b, md5 `6fd8da9d13ffa9be150ed06466b93888`) by `python3 work/tray/ed.py`: 76 exact text replacements, each with a checked count. Nothing else in the repo was edited.
- Tests: `work/tray/t/` (`bash t/run-all.sh`), outputs in `t/results/`. Screenshots: `work/tray/shots/`.
- Simulator: `work/tray/sim.cjs` with `simlib.js` and `sim-verify.cjs`. Results: `work/tray/sim-out/`.

See the sections below. This file is rewritten when the runs complete.
