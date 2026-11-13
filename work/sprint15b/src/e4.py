from ed import run
run([
("function kitTool(){return(run&&run.kit&&run.kit.tool)||'standard'}",
 "function kitTool(){return(run&&run.kit&&run.kit.tool)||'standard'}\n// Sprint 15b (item 7): what this run's two tool buttons really are. Wall and coaching text names tools only through this, so it never mentions one the kit does not have\n// (the Daily can deal a Chisel, which has no hammer at all). ham is null when there is no heavy tool; stdPick / stdHam say whether the class's own numbers still apply.\nfunction kitNames(){const T=kitTool(),P={trowel:'trowel',chisel:'chisel',brush:'brush',auger:'auger'}[T],H={mattock:'mattock',drill:'drill',powder:'powder',pulley:'pulley'}[T];return{T,pick:P||'pick',ham:T==='chisel'?null:(H||'hammer'),stdPick:!P,stdHam:!H&&T!=='chisel'}}"),
("""function s12ClassLine(k){
  const c=CLASSES[k];if(!c)return'';const hc=c.hamCrack,pc=c.pickCrack;
  switch(k){
    case'scholar':return`Your hammer is modest (${hc} crack). X-ray a 3×3 patch once a chamber, then dig where it shows.`;
    case'brute':return`Your hammer clears 4×4 but costs ${hc} crack, and the pick is clumsy (${pc}). Hammer the big finds, pick the rest.`;
    case'medium':return`Her hammer is expensive (${hc} crack). Listen for the thump, then pick. Relics pay ×3; commons pay only their age.`;
    case'fence':return`Your hammer is weak (3×3, ${hc} crack). One find is sealed for you at the end of every chamber, at half value.`;
    case'cartographer':return`Your hammer is a surveyor's (3×3, ${hc} crack). Learn the outlines in the first 3 seconds, then dig from memory.`;
    case'mystic':return`Your hammer is 5×5 and three deep (${hc} crack). There is no Fever: fill the Sight meter, then take the relics it shows.`;
  }
  return String(c.d||'');
}""",
"""function s12ClassLine(k){ // Sprint 15b: built from the kit the run really has. The class hammer is described only when the kit carries it.
  const c=CLASSES[k];if(!c)return'';const hc=c.hamCrack,pc=c.pickCrack,N=kitNames(),TD=KIT_TOOL_BY[N.T];
  const H={scholar:`Your hammer is modest (${hc} crack).`,brute:`Your hammer clears 4×4 but costs ${hc} crack${N.stdPick?`, and the pick is clumsy (${pc})`:''}.`,medium:`Her hammer is expensive (${hc} crack).`,fence:`Your hammer is weak (3×3, ${hc} crack).`,cartographer:`Your hammer is a surveyor's (3×3, ${hc} crack).`,mystic:`Your hammer is 5×5 and three deep (${hc} crack).`}[k];
  const R={scholar:'X-ray a 3×3 patch once a chamber, then dig where it shows.',brute:N.stdHam?(N.stdPick?'Hammer the big finds, pick the rest.':`Hammer the big finds; the ${N.pick} takes the rest.`):'Take the big finds first.',medium:'Listen for the thump, then dig. Relics pay ×3; commons pay only their age.',fence:'One find is sealed for you at the end of every chamber, at half value.',cartographer:'Learn the outlines in the first 3 seconds, then dig from memory.',mystic:'There is no Fever: fill the Sight meter, then take the relics it shows.'}[k];
  if(!H||!R)return String(c.d||'');
  const big=N.stdHam?H:N.ham?`Your ${N.ham} does the heavy work${TD&&/^Hammer /.test(TD.d)?': it '+TD.d.replace(/^Hammer /,''):''}.`:`This kit carries one tool${TD&&/^Pick /.test(TD.d)?': the '+N.pick+' '+TD.d.replace(/^Pick /,''):', the '+N.pick}.`;
  return big+' '+R;
}"""),
(" damp:()=>['Damp',`The pick cracks the wall ${Math.round((1-PROG_DATA.tells.damp.pick)*100)}% less. The hammer cracks it ${Math.round((PROG_DATA.tells.damp.hammer-1)*100)}% more.`],",
 " damp:()=>{const N=kitNames();return['Damp',`The ${N.pick} cracks the wall ${Math.round((1-PROG_DATA.tells.damp.pick)*100)}% less.${N.ham?` The ${N.ham} cracks it ${Math.round((PROG_DATA.tells.damp.hammer-1)*100)}% more.`:''}`]},"),
("ks.abort='The chisel has no hammer. Use the pick.';ks.ab='No hammer on a chisel'","ks.abort='The chisel is the only tool in this kit.';ks.ab='Chisel only'"),
('log("The Glass Hammer is spent. Back to the pick.")','log("The Glass Hammer is spent. Back to the "+kitNames().pick+".")'),
(" {el:'#wrap', at:'top',   h:'1 · Dig',   t:'Tap to dig. Hold a finger down to preview the crack first, then tap. The Pick takes a tile, the Hammer a patch.'},",
 " {el:'#wrap', at:'top',   h:'1 · Dig',   get t(){const N=kitNames(),C=s=>s[0].toUpperCase()+s.slice(1);return'Tap to dig. Hold a finger down to preview the crack first, then tap. The '+C(N.pick)+(N.stdPick?' takes a tile':' is your small tool')+(N.ham?', the '+C(N.ham)+(N.stdHam?' a patch':' your heavy one'):'')+'.'}},"),
("Sarcophagi turn up twice as often. Bring a good hammer.","Sarcophagi turn up twice as often. Bring something heavy."),
("and roots that reward a good hammer.","and roots that reward a heavy tool."),
("Reach for the hammer and the Flint just waits.","Reach for anything heavier and the Flint just waits."),
])
