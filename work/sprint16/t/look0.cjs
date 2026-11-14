const H=require('./h.cjs');
(async()=>{for(const [w,h] of [[390,844],[360,640],[844,390]]){const {page,errors}=await H.open(process.argv[2]||H.MAIN,{w,h});await page.waitForTimeout(1300);await H.startSeeded(page,'look1');
 await page.evaluate(()=>{let n=0;for(const f of state.finds){if(f.sarc)continue;if(n++>=8)break;f.cells.forEach(([x,y])=>state.dirt[y][x]=0)}ui();draw()});await page.waitForTimeout(500);
 await page.screenshot({path:`/tmp/claude-0/-home-claude/2b3470e7-19b2-5d02-9345-42ab1f96496f/scratchpad/look_${w}.png`});console.log(w,errors.length)}await H.close()})();
