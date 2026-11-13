// Screenshots for the owner: the tray pick, nine loose finds with the oldest cracked, the crumble (mid-fall and after), the updated How to Play card,
// the Training-complete card and the title with the TRAY TEST tag. Three viewports. Finds are brought to one tile from open by setup; every uncovering and pick is a real tap.
const H=require('./h.cjs');const path=require('path');const OUT=path.join(H.DIR,'shots');const FILE=process.argv[2]||H.BUILD;
const VPS=[[390,844],[360,640],[844,390]];
const shot=(page,n)=>page.screenshot({path:path.join(OUT,n+'.png')});
const almost=(page,n)=>page.evaluate(n=>{try{luckSlipHide()}catch(e){}const out=[];for(const f of state.finds){if(f.sarc||f.banked||f.cells.every(([x,y])=>state.dirt[y][x]===0))continue;if(out.length>=n)break;f.cells.forEach(([x,y],j)=>{state.dirt[y][x]=j===0?1:0});out.push({id:f.id,x:f.cells[0][0],y:f.cells[0][1]})}ui();draw();return out},n);
const tapCell=async(page,x,y)=>{const p=await H.cellXY(page,x,y);await H.tapXY(page,p.x,p.y);await page.waitForTimeout(80)};
const sheetShut=page=>page.evaluate(()=>{const s=document.getElementById('strip');if(s&&s.getAttribute('aria-expanded')==='true')s.click();const t=document.getElementById('uitoast');if(t)t.hidden=true});
const next=async page=>{const r=page.locator('#card .hr:visible');if(await r.count())await r.tap();else await page.evaluate(()=>{const d=[...document.querySelectorAll('#card .hdot')],i=d.findIndex(b=>b.getAttribute('aria-current')==='true');d[Math.min(d.length-1,i+1)].click()})}; // the dots are hidden on the smallest screen; the arrow is the way there
(async()=>{for(const [w,h] of (process.env.VP?[process.env.VP.split('x').map(Number)]:VPS)){const tag=w+'x'+h;
  { // title
    const {page,ctx}=await H.open(FILE,{w,h});await page.waitForTimeout(1600);await shot(page,'title-'+tag);await ctx.close()}
  { // tray pick, nine loose, crumble
    const {page,ctx,errors}=await H.open(FILE,{w,h});await page.waitForTimeout(500);await H.startSeeded(page,'SHOT-TRAY');await page.waitForTimeout(500);await page.locator('#pick').tap();
    const c=await almost(page,10);for(const q of c.slice(0,8))await tapCell(page,q.x,q.y);await page.waitForTimeout(400);await shot(page,'coach-six-'+tag); // the first-time line about the tray
    await page.waitForTimeout(400);await sheetShut(page);
    // swap: take the first tray find off, put a left-out one on
    const s=await page.evaluate(()=>({tray:trayList().map(f=>f.id),ex:exposedFinds().map(f=>f.id)}));const off=s.ex.find(i=>s.tray.indexOf(i)<0);
    for(const id of [s.tray[0],off]){const q=await page.evaluate(id=>state.finds[id].cells[0],id);await tapCell(page,q[0],q[1])}
    await page.waitForTimeout(500);await shot(page,'tray-pick-'+tag);
    await tapCell(page,c[8].x,c[8].y);await page.waitForTimeout(500);await shot(page,'coach-nine-'+tag);await sheetShut(page);await page.waitForTimeout(300);await shot(page,'nine-loose-'+tag);
    await page.evaluate(()=>{const o=trayOldest();window.__old=o&&o.id});
    await tapCell(page,c[9].x,c[9].y);await page.waitForTimeout(170);await shot(page,'crumble-1-crack-'+tag);await page.waitForTimeout(330);await shot(page,'crumble-2-fall-'+tag);
    await page.waitForTimeout(1400);await sheetShut(page);await page.waitForTimeout(200);await shot(page,'crumble-3-after-'+tag);
    const sc=await H.noScroll(page);console.log(tag,'wall shots, scroll ok',sc.ok,'errors',errors.length);await ctx.close()}
  { // Reduce Motion crumble
    const {page,ctx}=await H.open(FILE,{w,h,rm:true});await page.waitForTimeout(500);await H.startSeeded(page,'SHOT-TRAY');await page.waitForTimeout(500);await page.locator('#pick').tap();
    const c=await almost(page,10);for(const q of c.slice(0,9))await tapCell(page,q.x,q.y);await page.waitForTimeout(300);await sheetShut(page);await tapCell(page,c[9].x,c[9].y);await page.waitForTimeout(350);await sheetShut(page);await page.waitForTimeout(60);await shot(page,'crumble-reduce-motion-'+tag);await ctx.close()}
  { // How to Play, the new card; and the training-complete card
    const {page,ctx,errors}=await H.open(FILE,{w,h});await page.waitForTimeout(1300);
    await page.evaluate(()=>{try{if(_title)_title.done()}catch(e){}showHowTo()});await page.waitForTimeout(H.GUARD+200);
    await shot(page,'howto-1-dig-and-seal-'+tag);
    await next(page);await page.waitForTimeout(900);await shot(page,'howto-2-the-finds-tray-'+tag);
    await next(page);await page.waitForTimeout(900);await shot(page,'howto-3-worth-fame-'+tag);
    const sc=await H.noScroll(page);console.log(tag,'how-to shots, scroll ok',sc.ok,'errors',errors.length,'cards',await page.evaluate(()=>HOW.length));await ctx.close()}
}await H.close()})().catch(e=>{console.error(e);process.exit(1)});
