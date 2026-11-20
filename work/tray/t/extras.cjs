// Smaller rules and the words. node extras.cjs [build]
const H=require('./h.cjs');const assert=require('assert');const FILE=process.argv[2]||H.BUILD;
const rows=[];let fail=0;const T=async(n,fn)=>{try{const note=await fn();rows.push([n,'PASS',note||'']);console.log('PASS',n,note||'')}catch(e){fail++;rows.push([n,'FAIL',String(e.message).slice(0,240)]);console.log('FAIL',n,e.message)}};
(async()=>{
  const sizes={};
  for(const [w,h] of [[390,844],[360,640],[844,390]]){const {page,ctx,errors}=await H.open(FILE,{w,h});await page.waitForTimeout(1300);
    await T('title shows v1.0-tray1 and the TRAY TEST tag ('+w+'x'+h+')',async()=>{const r=await page.evaluate(()=>{const t=document.getElementById('trayTag'),b=t.getBoundingClientRect(),v=document.querySelector('.tl-ver');return{tag:t.textContent,vis:b.width>40&&b.height>8&&b.top>=0&&b.right<=innerWidth&&getComputedStyle(t).visibility!=='hidden'&&getComputedStyle(t).display!=='none',top:document.elementFromPoint(b.left+b.width/2,b.top+b.height/2)===t||getComputedStyle(t).pointerEvents==='none',ver:v&&v.textContent,title:document.title}});
      assert(/TRAY TEST/.test(r.tag)&&/v1\.0-tray1/.test(r.tag)&&r.vis,'tag');assert.strictEqual(r.ver,'v1.0-tray1');return r.tag+' | '+r.title});
    await H.startSeeded(page,'EX-'+w);await page.waitForTimeout(400);
    await T('the tag stays up during a dig and under a card ('+w+'x'+h+')',async()=>{const a=await page.evaluate(()=>{const b=document.getElementById('trayTag').getBoundingClientRect();return b.width>40&&b.bottom<=innerHeight});await page.evaluate(()=>{showHowTo()});await page.waitForTimeout(700);
      const z=await page.evaluate(()=>{const t=document.getElementById('trayTag'),b=t.getBoundingClientRect();const o=document.getElementById('overlay');return{vis:b.width>40,z:+getComputedStyle(t).zIndex>(+getComputedStyle(o).zIndex||0)}});assert(a&&z.vis&&z.z,'tag above the card');
      const how=await page.evaluate(()=>({n:HOW.length,tray:HOW.findIndex(c=>c.h==='The finds tray'),txt:document.getElementById('card').textContent}));
      assert.strictEqual(how.tray,1,'the tray card is the second card');assert(/A finds tray holds six/.test(how.txt)&&/room for nine loose finds/.test(how.txt)&&/the oldest one crumbles/.test(how.txt),'tray card text is in the manual');
      {const m=/hoard of eight|everything that glows|tops out|\u2014/.exec(how.txt);assert(!m,'retired wording or an em dash in the rendered manual: '+(m?how.txt.slice(Math.max(0,m.index-80),m.index+40):''))}
      const sc=await H.noScroll(page);assert(sc.ok,'no horizontal scroll with the manual open');return how.n+' cards'});
    sizes[w+'x'+h]=await page.evaluate(()=>{const q=id=>{const b=document.getElementById(id).getBoundingClientRect();return Math.round(b.width)+'x'+Math.round(b.height)};return{tile:Math.round(cell*10)/10,seal:q('seal'),pick:q('pick'),hammer:q('hammer')}});
    assert.strictEqual(errors.length,0,errors.join('\n'));await ctx.close()}
  rows.push(['tap sizes (reported, not judged)','INFO',JSON.stringify(sizes)]);
  {const {page,ctx,errors}=await H.open(FILE,{});await page.waitForTimeout(500);await H.startSeeded(page,'EX-R');await page.waitForTimeout(300);
    await T('relics that count finds',async()=>{const r=await page.evaluate(()=>{const fs=state.finds.filter(f=>!f.sarc&&!f.relic).slice(0,6);const base=score(fs.slice(0,5)).notes.some(n=>/^Hoard/.test(n));
        relic={name:'Rhind Mathematical Papyrus',state:'hungry'};const rh5=score(fs.slice(0,5)).notes.some(n=>/^Hoard 5/.test(n)),rh4=score(fs.slice(0,4)).notes.some(n=>/^Hoard/.test(n)),d=POWERS['Rhind Mathematical Papyrus'].d;
        relic={name:'Draupnir',state:'hungry'};const s=score(fs.slice(0,4)),dr=s.notes.find(n=>/^Draupnir/.test(n));
        relic={name:'Cyrus Cylinder',state:'hungry'};const cy=score(fs.slice(0,2)).notes.find(n=>/^Decree/.test(n));
        relic={name:'Terracotta Warrior',state:'hungry'};const same=state.finds.filter(f=>!f.sarc&&!f.relic);const byN={};same.forEach(f=>(byN[f.name]=byN[f.name]||[]).push(f));const three=Object.values(byN).find(a=>a.length>=3);const tw=three?score(three.slice(0,3)).notes.some(n=>/Rank and File/.test(n)):null;
        relic=null;return{base,rh5,rh4,d,dr,cy,tw}});
      assert(!r.base,'five finds are not a Hoard');assert(r.rh5&&!r.rh4,'Rhind: Hoard at five');assert(/5 finds, not a full tray of 6/.test(r.d),r.d);assert.strictEqual(r.dr,'Draupnir +36');assert.strictEqual(r.cy,'Decree +24');if(r.tw!==null)assert(r.tw,'Terracotta Warrior still fires on three of a shape');
      return 'Rhind 5 ("'+r.d+'"), Draupnir +9 a find, Cyrus +24, Terracotta Warrior '+(r.tw===null?'not testable on this wall':'unchanged')});
    await T('Gold and XP are paid on a third of the x3 points; no payout cap',async()=>{const r=await page.evaluate(()=>({g:ecoSealG({total:9000}),div:ECON.gold.sealDiv,c:skillCredit(1e8),coin:LUCK.coin.min,mem:MEMFULL.points,tr:TRAIN_T,jp:LUCK.jackpot.gold}));
      assert.strictEqual(r.g,30);assert.strictEqual(r.c,1e8);assert.deepStrictEqual([r.coin,r.mem,r.tr,r.jp],[2700,75,90,1500]);return '9,000 banked pays 30 Gold (rc9b: 3,000 pays 30); knucklebone from 2,700; second-bone gold 1,500; full-Memory gift 75; training target 90'});
    await T('targets of the tombs',async()=>{const out=await page.evaluate(()=>{ST.chambers=50;const o={};for(const [tb,st] of [[1,1],[1,3],[3,1],[5,1],[5,6]]){run.tomb=tb-1;run.stake=st;const a=[];for(let i=0;i<(st>=6?4:3);i++){TARGETS.length=3;TARGETS[0]=SKILL.targets[0];TARGETS[1]=SKILL.targets[1];TARGETS[2]=SKILL.targets[2];if(TARGETS[i]===undefined)TARGETS[i]=Math.round(SKILL.targets[2]*Math.pow(SKILL.deepMul,i-2)*(st>=6&&i===3?SKILL.long4:1)/1500)*1500;luckTargets(i,false,null);progTargets(i,false);a.push(TARGETS[i])}o[tb+':'+st]=a}run.tomb=0;run.stake=1;return o});
      assert.deepStrictEqual(out['1:1'],[900,1200,9000]);return JSON.stringify(out)});
    await T('training wall still clears with one seal of five',async()=>{const r=await page.evaluate(()=>{const dirt=Array.from({length:ROWS},()=>Array(COLS).fill(0)),owner=Array.from({length:ROWS},()=>Array(COLS).fill(-1)),finds=[];trainWall(dirt,owner,finds);const keep=state;state=Object.assign({},state,{finds,dirt:dirt.map(r=>r.map(()=>0)),train:true,fever:0,sealed:0,crack:0});const s=score(finds);state=keep;return{n:finds.length,total:s.total,t:TRAIN_T}});
      assert(r.n<=6&&r.total>=r.t,'five finds, one tray: '+JSON.stringify(r));return r.n+' finds score '+r.total+' against '+r.t});
    assert.strictEqual(errors.length,0,errors.join('\n'));await ctx.close()}
  console.log('\n| Check | Result | Note |\n|---|---|---|');rows.forEach(r=>console.log('| '+r.join(' | ')+' |'));
  console.log(fail?'EXTRAS FAIL '+fail:'EXTRAS PASS');await H.close();process.exit(fail?1:0)})().catch(e=>{console.error('EXTRAS ERROR',e);process.exit(1)});
