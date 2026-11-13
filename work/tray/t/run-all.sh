#!/bin/bash
# Every test on the build, one after another; outputs in t/results/. bash run-all.sh
cd "$(dirname "$0")"; mkdir -p results
md5sum ../build.html | cut -c1-32 > results/build-md5.txt
bash check.sh ../build.html > results/check.txt 2>&1
node tray.cjs      > results/tray.txt 2>&1
node flow.cjs      > results/flow.txt 2>&1
node extras.cjs    > results/extras.txt 2>&1
node seeds.cjs     > results/seeds.txt 2>&1
node mainsave.cjs  > results/mainsave.txt 2>&1
node rc9b-resume.cjs > results/rc9b-resume.txt 2>&1
node rc9b-fork.cjs   > results/rc9b-fork.txt 2>&1
node fuzz.cjs 3 1200 > results/fuzz.txt 2>&1
FUZZ_HOLD=1 FUZZ_OUT=fuzz-report-hold.json node fuzz.cjs 3 1200 ../build.html 7 > results/fuzz-hold.txt 2>&1
node shots.cjs     > results/shots.txt 2>&1
for f in results/*.txt; do echo "== $f: $(tail -1 $f | cut -c1-200)"; done > results/SUMMARY.txt
