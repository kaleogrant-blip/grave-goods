#!/bin/bash
# The simulator runs behind the tables in LOG.md, in the order they were made. Each writes sim-out/<name>.txt (the table) and .json (the numbers).
# Run from outside the repo root so node does not pick up the repo's own playwright:  cd /tmp && bash /home/claude/grave-goods/work/tray/sim-queue.sh
D=/home/claude/grave-goods/work/tray; O=$D/sim-out; export PAGES=${PAGES:-2}
run(){ name=$1; shift; [ -s $O/$name.json ] && return; OUT=$O/$name.json "$@" > $O/$name.txt 2>&1; }
POLS=early,hold,hold9,pick,pick9,hammer,novice
run t1s1        node $D/sim.cjs table 1500 1:1 $POLS
BUILD=/home/claude/grave-goods/game/current.html run main-t1s1 node $D/sim.cjs table 500 1:1 early,hold,hammer,novice     # the same players on rc9b (old seal rule), for scale
run quick-rows  node $D/sim.cjs table 300 1:3,3:1,5:1,5:6 early,hold,pick,pick9,hammer                                    # a first look at the other rows
run t1s3        node $D/sim.cjs table 1500 1:3 early,hold,pick,pick9,hammer
run t3s1        node $D/sim.cjs table 1500 3:1 early,hold,pick,pick9,hammer
run t5s1        node $D/sim.cjs table 1500 5:1 early,hold,pick,pick9,hammer
run t5s6        node $D/sim.cjs table 1500 5:6 early,hold,pick,pick9,hammer
