#!/bin/bash
# Tomb V, Stake 6: how far do the Stake target multipliers have to come down? Tried in the simulator only (EVAL / SET poke the numbers into the page); the build is not changed.
# Stake multipliers today: Stake 4 x1.05, Stake 5 x1.10, Stake 6 x1.15. Fourth chamber (Stake 6): chamber 3 x 1.6 x long4 (0.75).
D=/home/claude/grave-goods/work/tray; O=$D/sim-out; export PAGES=${PAGES:-1}
run(){ name=$1; shift; [ -s $O/$name.json ] && return; OUT=$O/$name.json "$@" > $O/$name.txt 2>&1; }
mult(){ echo "const _pt=progTargets;progTargets=function(i,TR){_pt(i,TR);if(!TR){const o=[1,1,1,1.05,1.1,1.15][stakeN()-1],n=[$1][stakeN()-1];if(o!==n)TARGETS[i]=Math.round(TARGETS[i]/o*n/10)*10}}"; }
EVAL="$(mult 1,1,1,1,1,1)"                                  run retune-A node $D/sim.cjs table 300 5:6 early,pick9   # A: no Stake multiplier at all
EVAL="$(mult 1,1,1,1,1,1)"      SET='{"SKILL.long4":0.5}'   run retune-B node $D/sim.cjs table 300 5:6 early,pick9   # B: A, and the fourth chamber asks 0.5 (not 0.75) of the deep step
EVAL="$(mult 1,1,1,.9,.8,.7)"   SET='{"SKILL.long4":0.5}'   run retune-C node $D/sim.cjs table 300 5:6 early,pick9   # C: Stakes 4/5/6 ask 0.9 / 0.8 / 0.7
EVAL="$(mult 1,1,1,.85,.7,.55)" SET='{"SKILL.long4":0.4}'   run retune-D node $D/sim.cjs table 300 5:6 early,pick9   # D: 0.85 / 0.7 / 0.55, fourth chamber 0.4
