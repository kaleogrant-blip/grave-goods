const H=require('./h.cjs');const S='/tmp/claude-0/-home-claude/2b3470e7-19b2-5d02-9345-42ab1f96496f/scratchpad/';
(async()=>{const {page,errors}=await H.open(process.argv[2]||H.RC9A);
await page.waitForTimeout(1500);
await page.screenshot({path:S+'title.png'});
await H.startSeeded(page,'OWL-1234');await page.waitForTimeout(1200);
await page.screenshot({path:S+'dig.png'});
// find a sarcophagus across seeds
const info=await page.evaluate(()=>({sarc:state.finds.filter(f=>f.sarc).map(f=>f.cells),cols:COLS,rows:ROWS,overlay:!document.getElementById('overlay').hidden,hud:[...document.querySelectorAll('#wrap > *, body > *')].map(e=>e.tagName+'#'+e.id+'.'+e.className).join(' | ')}));
console.log(JSON.stringify(info));
console.log(errors);await H.close()})();
