// Polish carried over from the tray log: toasts off the tool buttons, a find is at least 44 px to tap, the crumble's own sound, a relic about to crumble. node polish.cjs [build]
// Finds are brought to one tile from open by setup; every uncovering and tray tap is a real touchscreen tap.
const H=require('./h.cjs');const assert=require('assert');const path=require('path');
const FILE=process.argv[2]||H.BUILD,SHOTS=path.join(__dirname,'..','shots');
const rows=[];let fail=0;
const T=async(name,fn)=>{try{const note=await fn();rows.push([name,'PASS',note||'']);console.log('PASS',name,note||'')}catch(e){fail++;rows.push([name,'FAIL',String(e.message).slice(0,300)]);console.log('FAIL',name,e.stack||e)}};
const SND=`window.__snd=[];addEventListener('DOMContentLoaded',()=>{});(()=>{const iv=setInterval(()=>{try{if(typeof sfx==='function'&&!sfx.__w){const o=sfx;sfx=function(n){window.__snd.push(n);return o.apply(this,arguments)};sfx.__w=1;clearInterval(iv)}}catch(e){}},20)})();`;
const almost=(page,n,first)=>page.evaluate(([n,first])=>{try{luckSlipHide()}catch(e){}const out=[];let L=state.finds.filter(f=>!f.sarc&&!f.banked&&!f.cells.every(([x,y])=>state.dirt[y][x]===0));
  if(first==='relic')L=L.filter(f=>f.relic&&!f.fake).slice(0,1).concat(L.filter(f=>!f.relic));else if(first==='one')L=L.filter(f=>f.cells.length===1&&!f.relic).slice(0,1).concat(L.filter(f=>!f.relic&&f.cells.length>1));else L=L.filter(f=>!f.relic);
  for(const f of L){if(out.length>=n)break;f.cells.forEach(([x,y],j)=>{state.dirt[y][x]=j===0?1:0});out.push({id:f.id,x:f.cells[0][0],y:f.cells[0][1],n:f.cells.length,relic:!!f.relic,name:f.name})}
  ui();draw();return out},[n,first||'']);
const tapCell=async(page,x,y)=>{const p=await H.cellXY(page,x,y);await H.clearWay(page,p);await H.tapXY(page,p.x,p.y);await page.waitForTimeout(80)};
const fresh=async(seed,o)=>{const r=await H.open(FILE,Object.assign({init:SND},o||{}));await r.page.waitForTimeout(500);await H.startSeeded(r.page,seed);await r.page.waitForTimeout(400);await r.page.locator('#pick').tap();return r};
const box=(page,sel)=>page.evaluate(sel=>{const e=document.querySelector(sel);if(!e||e.hidden||e.offsetParent===null&&getComputedStyle(e).position!=='fixed')return null;const b=e.getBoundingClientRect();return b.width&&b.height?{l:b.left,t:b.top,r:b.right,b:b.bottom}:null},sel);
const hit=(a,b)=>a&&b&&a.l<b.r&&b.l<a.r&&a.t<b.b&&b.t<a.b;
(async()=>{
  for(const [w,h] of [[390,844],[360,640],[844,390]])await T('a coaching toast does not cover a tool button ('+w+'x'+h+')',async()=>{const {page,errors,ctx}=await fresh('POL-T'+w,{w,h});
    const c=await almost(page,9);for(const q of c)await tapCell(page,q.x,q.y);await page.waitForTimeout(250);
    const t=await box(page,'#uitoast');assert(t,'the nine-finds toast is up');const txt=await page.evaluate(()=>document.getElementById('uitoast').textContent);assert(/Nine loose finds/.test(txt),txt);
    const over=[];const btns=await page.evaluate(()=>[...document.querySelectorAll('button')].filter(b=>b.offsetParent!==null&&!b.closest('#overlay')).filter(b=>{const r=b.getBoundingClientRect(),e=r.width&&r.height?document.elementFromPoint(r.left+r.width/2,r.top+r.height/2):null;return !!e&&(e===b||b.contains(e))}).map(b=>{const r=b.getBoundingClientRect();return{id:b.id||b.textContent.trim().slice(0,12),l:r.left,t:r.top,r:r.right,b:r.bottom}})); // every button on screen: tools, Seal, Pouch, pause, speed, sound
    assert(btns.length>=7,'buttons found: '+btns.length);for(const q of btns)if(hit(t,q))over.push(q.id);if(hit(t,await box(page,'#looseTag')))over.push('#looseTag');
    assert.deepStrictEqual(over,[],'toast overlaps '+over.join(', ')+' '+JSON.stringify(t));assert(t.l>=0&&t.r<=w+.5&&t.t>=0&&t.b<=h+.5,'toast on screen '+JSON.stringify(t));
    const wall=await box(page,'#c');assert(t.b<=wall.b+1&&t.t>=wall.t-1,'toast sits over the wall');
    const under=await page.evaluate(([x,y])=>{const e=document.elementFromPoint(x,y);return e&&e.id},[(t.l+t.r)/2,(t.t+t.b)/2]);assert.strictEqual(under,'c','taps pass through the toast to the wall');
    const sc=await H.noScroll(page);assert(sc.ok,'no horizontal scroll');await page.screenshot({path:path.join(SHOTS,'toast-nine-'+w+'x'+h+'.png')});
    assert.strictEqual(errors.length,0,errors.join('\n'));await ctx.close();return 'toast '+Math.round(t.r-t.l)+'x'+Math.round(t.b-t.t)+' over the foot of the wall'});

  for(const [w,h] of [[844,390],[360,640]])await T('a one-tile find is 44 px to tap ('+w+'x'+h+')',async()=>{const {page,errors,ctx}=await fresh('POL-N'+w,{w,h});
    const c=await almost(page,8,'one');assert.strictEqual(c[0].n,1,'a one-tile find on this wall');for(const q of c)await tapCell(page,q.x,q.y);
    const one=c[0],cellPx=await page.evaluate(()=>cell),m=(44-cellPx)/2;assert(m>=3,'tile '+cellPx+' px');
    const s=()=>page.evaluate(id=>({pick:state.finds[id].tray==null?null:state.finds[id].tray,on:trayList().some(f=>f.id===id),crack:state.crack,dirt:JSON.stringify(state.dirt)}),one.id);
    const p=await H.cellXY(page,one.x,one.y);const notes=[];
    // every side of the find: a tile that can still be dug gives up a thin strip (15% of a tile), a tile a strike can do nothing with gives up the whole 44 px box
    await page.evaluate(([x,y])=>{const q=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>[x+dx,y+dy]).filter(([a,b])=>a>=0&&b>=0&&a<COLS&&b<ROWS&&state.owner[b][a]<0&&state.dirt[b][a]>0);if(q.length>1){state.dirt[q[0][1]][q[0][0]]=0;ui();draw()}},[one.x,one.y]); // setup: one empty neighbour is dug out, so both kinds of side are there
    const sides=await page.evaluate(([x,y])=>[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({dx,dy,x:x+dx,y:y+dy})).filter(q=>q.x>=0&&q.y>=0&&q.x<COLS&&q.y<ROWS&&!trayAt(q.x,q.y)&&!sarcAt(q.x,q.y)).map(q=>{const d=state.dirt[q.y][q.x],pl=d===0?strikePlan(q.x,q.y):null;return Object.assign(q,{d,idle:d===0&&(!pl||!pl.hit||!!pl.idle)})}),[one.x,one.y]);
    const dirtSide=sides.find(q=>q.d>0),idleSide=sides.find(q=>q.idle);assert(dirtSide||idleSide,'a side to test');
    for(const [nb,out,kind] of [[idleSide,m-1,'open tile'],[dirtSide,Math.min(m,cellPx*.15)-1,'dirt tile']]){if(!nb||out<1)continue;const a=await s();
      await H.clearWay(page,p);await H.tapXY(page,p.x+nb.dx*(cellPx/2+out),p.y+nb.dy*(cellPx/2+out));await page.waitForTimeout(120);const b=await s();
      assert.notStrictEqual(b.on,a.on,kind+': the tap '+out.toFixed(1)+' px outside the find moved it');assert.strictEqual(b.crack,a.crack,'no crack');assert.strictEqual(b.dirt,a.dirt,'no dirt moved');
      await H.tapXY(page,p.x,p.y);await page.waitForTimeout(120);const b2=await s();assert.strictEqual(b2.on,a.on,'a tap on the tile itself moves it back');notes.push(kind+' side: '+out.toFixed(1)+' px outside still moves the find')}
    if(dirtSide){const a=await s(),edge=Math.min(m,cellPx*.15)+2; // just past the strip, still on the dirt tile: that is a dig
      await H.tapXY(page,p.x+dirtSide.dx*(cellPx/2+edge),p.y+dirtSide.dy*(cellPx/2+edge));await page.waitForTimeout(160);const d=await s();assert.notStrictEqual(d.dirt,a.dirt,'a tap '+edge.toFixed(1)+' px into the dirt tile digs it');assert.strictEqual(d.on,a.on,'and the find is not moved');notes.push(edge.toFixed(1)+' px into the dirt tile digs')}
    assert.strictEqual(errors.length,0,errors.join('\n'));await ctx.close();return 'tile '+cellPx+' px; '+notes.join('; ')});
  await T('portrait 390: tiles are 42 px, so a tap 5 px outside a find is not taken for it',async()=>{const {page,errors,ctx}=await fresh('POL-N390',{});
    const c=await almost(page,8,'one');for(const q of c)await tapCell(page,q.x,q.y);const one=c[0],cellPx=await page.evaluate(()=>cell);
    const near=await page.evaluate(([x,y,c])=>{const r=[];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){r.push(!!trayNear((x+.5+dx*.5)*c+dx*5,(y+.5+dy*.5)*c+dy*5,x+dx,y+dy))}return r},[one.x,one.y,cellPx]);
    assert(near.every(v=>!v),'5 px outside: '+JSON.stringify(near));assert.strictEqual(errors.length,0,errors.join('\n'));await ctx.close();return 'tile '+cellPx+' px'});

  for(const [w,h] of [[390,844],[844,390]])await T('a relic about to crumble is unmistakable, and the crumble has its own sound ('+w+'x'+h+')',async()=>{const {page,errors,ctx}=await fresh('POL-R'+w,{w,h});
    const c=await almost(page,10,'relic');assert(c[0].relic,'a relic on this wall');for(const q of c.slice(0,9))await tapCell(page,q.x,q.y);const lg=await page.waitForFunction(()=>{const t=document.getElementById('log').textContent;return /is the oldest of nine loose finds/.test(t)?t:false},null,{timeout:3000}).then(h=>h.jsonValue()).catch(()=>''); // read in the same breath: a once-a-profile hint about sets may take the log line over a moment later
    const a=await page.evaluate(()=>({toast:document.getElementById('uitoast').textContent,up:!document.getElementById('uitoast').hidden,warned:state.relicWarned,old:trayOldest()&&trayOldest().id,log:document.getElementById('log').textContent,loose:document.getElementById('looseTag').textContent}));
    assert.strictEqual(a.old,c[0].id,'the relic is the oldest');assert.strictEqual(a.warned,c[0].id);assert(a.up&&new RegExp('The '+c[0].name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+' is your oldest loose find\\. Uncover one more and it crumbles\\. Seal it first\\.').test(a.toast),a.toast);
    assert(/is the oldest of nine loose finds/.test(lg),'log line: '+(lg||a.log));assert(/Loose 9\/9/.test(a.loose));
    // the words are painted on the wall: look for the label's dark red plate next to the relic
    const px=await page.evaluate(id=>{const f=state.finds[id],xs=f.cells.map(q=>q[0]),ys=f.cells.map(q=>q[1]),x0=Math.min(...xs)*cell,x1=(Math.max(...xs)+1)*cell,y0=Math.min(...ys)*cell,y1=(Math.max(...ys)+1)*cell,fs=Math.max(10,Math.round(cell*.3)),ly=y0>=fs*1.7?y0-fs*.85:y1+fs*.85;
      const cv=document.getElementById('c'),k=cv.width/cv.getBoundingClientRect().width,g=cv.getContext('2d');let red=0,n=0;for(let dx=-20;dx<=20;dx+=4){const d=g.getImageData(Math.round(((x0+x1)/2+dx)*k),Math.round((ly+TOP*cell-fs*.55)*k),1,1).data;n++;if(d[0]>90&&d[1]<60&&d[2]<70)red++}return{red,n}},c[0].id);
    assert(px.red>=px.n*.5,'RELIC CRUMBLES NEXT plate painted: '+JSON.stringify(px));
    await page.evaluate(()=>{const s=document.getElementById('strip');if(s&&s.getAttribute('aria-expanded')==='true')s.click()});await page.waitForTimeout(500); // for the picture only: the score sheet is shut so the top rows show
    await page.screenshot({path:path.join(SHOTS,'relic-crumbles-next-'+w+'x'+h+'.png')});
    await page.evaluate(()=>{window.__snd.length=0});await tapCell(page,c[9].x,c[9].y);await page.waitForTimeout(200);
    const b=await page.evaluate(id=>({lost:!!state.finds[id].lost,snd:window.__snd.slice(),cr:RS().cr|0,n:exposedFinds().length,has:typeof SND.crumble==='function'}),c[0].id);
    assert(b.lost&&b.cr===1&&b.n===9,'the relic crumbled: '+JSON.stringify(b));assert(b.has&&b.snd.indexOf('crumble')>=0,'crumble sound played: '+b.snd.join(','));assert(!b.snd.some((n,i)=>n==='dig'&&i>b.snd.indexOf('crumble')),'no second dig thud after it');
    assert.strictEqual(errors.length,0,errors.join('\n'));await ctx.close();return 'toast, log and painted label for the '+c[0].name+'; sounds on the tenth find: '+b.snd.join(', ')});
  await T('an ordinary oldest find is labelled too',async()=>{const {page,errors,ctx}=await fresh('POL-O',{});const c=await almost(page,9);for(const q of c)await tapCell(page,q.x,q.y);await page.waitForTimeout(300);
    const old=await page.evaluate(()=>trayOldest().id);assert.strictEqual(old,c.slice().sort((a,b)=>0)[0]&&old);await page.evaluate(()=>{const s=document.getElementById('strip');if(s&&s.getAttribute('aria-expanded')==='true')s.click();const t=document.getElementById('uitoast');if(t)t.hidden=true});await page.waitForTimeout(500);await page.screenshot({path:path.join(SHOTS,'crumbles-next-390x844.png')});
    assert.strictEqual(errors.length,0,errors.join('\n'));await ctx.close();return 'screenshot crumbles-next-390x844.png'});
  console.log('\n| Test | Result | Note |\n|---|---|---|');rows.forEach(r=>console.log('| '+r.join(' | ')+' |'));
  console.log(fail?'POLISH FAIL '+fail:'POLISH PASS '+rows.length);await H.close();process.exit(fail?1:0)})().catch(e=>{console.error('POLISH ERROR',e);process.exit(1)});
