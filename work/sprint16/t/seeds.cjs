// Same seed, same wall as the main game. For 20 seeds, the first wall of each of the three chambers is built in rc9b and in the tray build:
// dirt, every find (name, tiles, age, base worth, relic, sarcophagus), every ore and the tell must be identical. Targets differ on purpose and are not compared.
const H=require('./h.cjs');const assert=require('assert');
const walls=async(file,seeds)=>{const {page,ctx,errors}=await H.open(file,{});await page.waitForTimeout(500);const out={};
  for(const s of seeds){await H.startSeeded(page,s);const a=[];for(let i=0;i<3;i++){if(i)await page.evaluate(i=>{document.getElementById('overlay').hidden=true;newChamber(i)},i);const w=JSON.parse(await H.wallSig(page));delete w.tg;a.push(JSON.stringify(w)+'|'+await page.evaluate(()=>rngState>>>0))}out[s]=a}
  const e=errors.slice();await ctx.close();return{out,e}};
(async()=>{const seeds=Array.from({length:20},(_,k)=>'SEED-'+k);
  const a=await walls(H.MAIN,seeds),b=await walls(H.BUILD,seeds);let diff=0,n=0;
  for(const s of seeds)for(let i=0;i<3;i++){n++;if(a.out[s][i]!==b.out[s][i]){diff++;if(diff<4)console.log('DIFF',s,i,a.out[s][i].slice(0,200),'\n ',b.out[s][i].slice(0,200))}}
  assert.strictEqual(a.e.length+b.e.length,0,a.e.concat(b.e).join('\n'));
  console.log(diff?'SEEDS FAIL: '+diff+' of '+n+' walls differ':'SEEDS PASS: '+n+' walls over '+seeds.length+' seeds identical to rc9b (dirt, finds, ores, tell, generator state)');await H.close();process.exit(diff?1:0)})().catch(e=>{console.error(e);process.exit(1)});
