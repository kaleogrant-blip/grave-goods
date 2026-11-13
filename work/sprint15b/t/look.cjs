// ad-hoc: play one reading with real taps and save a shot per step.  node look.cjs <r> <prefix> [w h] [fever]
const H=require('./h.cjs');const S=process.env.SHOT||'/tmp/claude-0/-home-claude/2b3470e7-19b2-5d02-9345-42ab1f96496f/scratchpad/';
(async()=>{const r=+process.argv[2],pre=process.argv[3]||'b',w=+process.argv[4]||390,h=+process.argv[5]||844,fev=process.argv[6]==='fever';
const {page,errors}=await H.open(H.BUILD,{w,h});await page.waitForTimeout(600);
await H.startSeeded(page,'OWL-1234');await page.waitForTimeout(900);
if(fev){await page.evaluate(k=>{luckSlipHide();const W=LUCK.jackpot.w;const o=srnd;let n=0;const keys=JP_KEYS;let acc=0,tot=0;keys.forEach(q=>tot+=W[q]);for(const q of keys){if(q===k)break;acc+=W[q]}const v=(acc+W[k]/2)/tot;srnd=function(){if(n++===0)return v;srnd=o;return o()};RS().jpOwed=1;luckJackpot()},process.argv[7]||'nothing')}
else{await H.forceSarc(page,r);await H.tapSarc(page)}
await page.waitForTimeout(900);
for(let i=0;i<4;i++){await page.screenshot({path:S+pre+'-'+i+'.png'});console.log(i,JSON.stringify(await H.boneInfo(page)));if(i<3)await H.boneStep(page,i==2?1900:900)}
console.log('scroll',await H.noScroll(page));
await page.waitForTimeout(3200);console.log('after',await page.evaluate(()=>({panel:!!document.getElementById('lkp'),busy:LK.busy,log:document.getElementById('log').textContent,pend:state.sarcPend||state.jpPend||null})));
console.log('errors',errors);await H.close()})();
