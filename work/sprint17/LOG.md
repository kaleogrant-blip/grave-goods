# Sprint 17 log: promote v1.0-rc10 into the app shell

Resume by reading this file. Branch `sprint-17` (from `origin/sprint-16`). Game build: `game/current.html` = `work/sprint16/build.html`, md5 `421166210941d55e890a27378f833bea`. The game file is never edited.

## Checklist
- [x] 0. Branch pushed, rc10 copied over `game/current.html`
- [ ] 1. Remote config (schema, config.json, stale cache rejected, test)
- [ ] 2. Ads and rewards against the tray rule, the first-tomb guard, the bare-wall Memory, resume record v2
- [ ] 3. Save adapter / iCloud (new keys, rc9b cloud copy on rc10, rc10 cloud copy on an older build)
- [ ] 4. Telemetry (cfgVer 11, event shapes)
- [ ] 5. Tests updated and added, full run
- [ ] 6. Documents and store text
- [ ] 7. Merge to main, CI green

## State right now
Step 0 done. Nothing else started.

## How to run the tests here
Scratch dir S with `S/chromium_headless_shell-1194/chrome-linux -> /opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64` and `S/chromium-1194 -> /opt/pw-browsers/chromium-1243`, then `PLAYWRIGHT_BROWSERS_PATH=S GG_REQUIRE_BROWSER=1 npm test`.
