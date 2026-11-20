#!/bin/bash
# Every test on the build, one after another; outputs in t/results/. bash run-all.sh
# Run it from anywhere; the simulator must not be running at the same time (two cores: the real-time tests need one).
cd "$(dirname "$0")"; mkdir -p results ../shots
md5sum ../build.html | cut -c1-32 > results/build-md5.txt
bash check.sh ../build.html > results/check.txt 2>&1
for t in tray bare first polish upgrade flow extras seeds daily rc9b-resume rc9b-fork; do node $t.cjs > results/$t.txt 2>&1; echo "== $t: $(tail -1 results/$t.txt | cut -c1-200)"; done
node fuzz.cjs 3 1200 > results/fuzz.txt 2>&1
FUZZ_HOLD=1 FUZZ_OUT=fuzz-report-hold.json node fuzz.cjs 3 1200 ../build.html 7 > results/fuzz-hold.txt 2>&1
node shots.cjs     > results/shots.txt 2>&1
for f in results/*.txt; do echo "== $f: $(tail -1 $f | cut -c1-200)"; done > results/SUMMARY.txt
