from ed import run
run([
("f.banked=true;state.sarcPend={id:f.id,r:r,hit:!!R9.hit};try{S11.save()}catch(e){}\n  luckReels(r,()=>sarcPay(f,R9));",
 "f.banked=true;state.sarcPend={id:f.id,r:r,hit:!!R9.hit,sul:!!R9.sul};try{S11.save()}catch(e){} // decided and saved before the bone is even handed over\n  luckBone(r,()=>sarcPay(f,R9),R9.sul);"),
("function s9SarcRoll(){ // openSarc(): the roll, with Sulfur turning a would-be mimic (0.75 to 0.9) into the bones range, so the reels and the lid agree\n  const r0=srnd(),sul=s9Sulfur(),hit=sul&&r0>=.75&&r0<.9;return{r:hit?.45+(r0-.75)/.15*.3:r0,hit};",
 "function s9SarcRoll(){ // openSarc(): the roll, with Sulfur turning a would-be mimic (0.75 to 0.9) into the bones range, so the bone and the lid agree. sul = Sulfur was armed, so the printed record can say mimic 0%\n  const r0=srnd(),sul=s9Sulfur(),hit=sul&&r0>=.75&&r0<.9;return{r:hit?.45+(r0-.75)/.15*.3:r0,hit,sul};"),
("  return{t:'Nothing. The wheel is a wheel.'};","  return{t:'Nothing. Robbed in antiquity.'};"),
("LK.timers.forEach(clearTimeout);LK.timers.clear();LK.busy=false;LK.mode='';LK.jp=null;lkClose();","LK.timers.forEach(clearTimeout);LK.timers.clear();LK.busy=false;LK.mode='';boneQuiet();lkClose();"),
("// ---- runtime state: LK.busy is true while any luck screen (coin, reels, wheel) owns the wall\nconst LK={busy:false,mode:'',panel:null,timers:new Set(),log:[],jp:null,",
 "// ---- runtime state: LK.busy is true while the knucklebone panel or a bone reading owns the wall\nconst LK={busy:false,mode:'',panel:null,timers:new Set(),log:[],"),
("function statsJackpot(){ST.jp=(ST.jp||0)+1;stSave()}\nObject.assign(window,{statsNear,statsCoin,statsLucky,statsTremor,statsJackpot});","Object.assign(window,{statsNear,statsCoin,statsLucky,statsTremor});"),
("    if(state.sarcPend){const sp=state.sarcPend,f=state.finds[sp.id];state.sarcPend=null;if(f&&f.sarc&&typeof sp.r==='number'){if(luckOn()&&sp.r>=.45&&sp.r<.9)srnd();sarcPay(f,{r:sp.r,hit:!!sp.hit})}}",
 "    if(state.sarcPend){const sp=state.sarcPend,f=state.finds[sp.id];state.sarcPend=null;if(f&&f.sarc&&typeof sp.r==='number'){if(luckOn()&&sp.r>=.45&&sp.r<.9)srnd();sarcPay(f,{r:sp.r,hit:!!sp.hit})}}\n    if(state.jpPend){const jk=state.jpPend&&state.jpPend.k;state.jpPend=null;if(JP_KEYS.indexOf(jk)>=0)jpPay(jk,true)} // Sprint 15b: a second bone that was decided but not yet read out"),
# audio
("function aV(n,t0,t1,off){AU.vc++;MUSIC.voices=AU.vc;n.onended=()=>{AU.vc--;MUSIC.voices=AU.vc};",
 "const BONE_AU=new Set();let _bnAu=0; // Sprint 15b: the nodes a bone reading started, so a reading that is cut short can stop them and a test can see that none is left\nfunction aV(n,t0,t1,off){AU.vc++;MUSIC.voices=AU.vc;const bn=_bnAu;if(bn)BONE_AU.add(n);n.onended=()=>{AU.vc--;MUSIC.voices=AU.vc;if(bn)BONE_AU.delete(n)};"),
("// --- luck layer: coin, reels, wheel, jackpot","// --- luck layer: the knucklebone throw, the Quartermaster's bone"),
(',"k_reeltick":9,"k_reelstop":-2,"k_win":2,"k_wheel":3,"k_jackpot":-2}',',"k_win":2,"k_hiss":4,"k_crack":2,"k_creep":3,"k_stop":2,"k_tag":2}'),
("'rank','k_jackpot','blast'","'rank','k_crack','k_stop','blast'"),
])
