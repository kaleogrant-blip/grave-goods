// The Daily on the tray build: started from the title with real taps, then eight loose finds, a pick, a seal. Same seed twice gives the same first wall and the same kit.
const H=require('./h.cjs');const assert=require('assert');
const go=async()=>{const {page,ctx,errors}=await H.open(H.BUILD,{});await page.waitForTimeout(1500);
  await page.locator('#title .tl-c.daily').first().tap();
  for(let k=0;k<6;k++){await page.waitForTimeout(H.GUARD+200);if(await page.evaluate(()=>!!state&&!!run&&!!run.daily&&document.getElementById('overlay').hidden&&!state.train))break;
    const b=page.locator('#overlay:not([hidden]) #dig:visible, #overlay:not([hidden]) #dgo:visible, #overlay:not([hidden]) #go:visible, #overlay:not([hidden]) button.primary:visible').first();
    if(await b.count())await b.tap();else{const any=page.locator('#overlay:not([hidden]) .body>button:visible').first();if(await any.count())await any.tap()}}
  const st=await page.evaluate(()=>({daily:!!(run&&run.daily),seed:run&&run.seed,cls:clsKey(),gear:gear&&gear.id,tomb:run.tomb,stake:run.stake,tg:TARGETS.slice(0,3),card:document.getElementById('card').textContent.slice(0,60),ov:!document.getElementById('overlay').hidden}));
  assert(st.daily,'the Daily started: '+JSON.stringify(st));
  await page.waitForTimeout(700);await page.locator('#pick').tap();
  const last=await page.evaluate(()=>{try{luckSlipHide()}catch(e){}const out=[];for(const f of state.finds){if(f.sarc||f.banked)continue;if(out.length>=8)break;f.cells.forEach(([x,y],j)=>{state.dirt[y][x]=j===0?1:0});out.push(f.cells[0])}ui();draw();return out});
  for(const [x,y] of last){const p=await H.cellXY(page,x,y);await H.clearWay(page,p);await H.tapXY(page,p.x,p.y);await page.waitForTimeout(90)}
  const a=await page.evaluate(()=>({ex:exposedFinds().length,tray:trayList().map(f=>f.id),sig:JSON.stringify(state.finds.map(f=>[f.name,f.cells,f.age]))}));
  assert.strictEqual(a.ex,8);assert.strictEqual(a.tray.length,6);
  const c=await page.evaluate(id=>state.finds[id].cells[0],a.tray[0]);const p=await H.cellXY(page,c[0],c[1]);await H.clearWay(page,p);await H.tapXY(page,p.x,p.y);await page.waitForTimeout(150);
  const b=await page.evaluate(()=>({tray:trayList().map(f=>f.id),tot:score(trayList()).total,bank:run.banked}));assert(b.tray.indexOf(a.tray[0])<0&&b.tray.length===6,'pick by tap in the Daily');
  await page.evaluate(()=>{Q.speed=4;TARGETS[state.i]=999999});await page.locator('#seal').tap();await page.waitForFunction(()=>!state.sealing&&!Q.busy,null,{timeout:15000});await page.waitForTimeout(500);
  const bank=await page.evaluate(()=>run.banked);assert(bank>=b.bank+b.tot,'the tray was banked');
  const sc=await H.noScroll(page);assert(sc.ok);assert.strictEqual(errors.length,0,errors.join('\n'));await ctx.close();return{st,sig:a.sig,banked:bank}};
(async()=>{const a=await go(),b=await go();assert.strictEqual(a.sig,b.sig,'same Daily wall twice');assert.deepStrictEqual(a.st,b.st,'same Daily kit twice');
  console.log(JSON.stringify(a.st));console.log('DAILY PASS: started from the title, tray pick and seal worked, same wall and kit on a second launch, 0 page errors');await H.close();process.exit(0)})().catch(async e=>{console.error('DAILY FAIL',e.message);try{await H.close()}catch(_){}process.exit(1)});
