import re,sys
p='/home/claude/grave-goods/work/sprint15b/build.html'
s=open(p,encoding='utf-8').read()
js=open('/home/claude/grave-goods/work/sprint15b/src/bone.js',encoding='utf-8').read()
css=open('/home/claude/grave-goods/work/sprint15b/src/bone.css',encoding='utf-8').read()
a=s.index('// ================= 4. SARCOPHAGUS REELS =================')
b=s.index('function jpApply(key){')
s=s[:a]+js+s[b:]
# css: replace the reels + jackpot card rules
a=s.index('.lkreels{flex-direction:column')
b=s.index('/* -- the tell: a torn parchment slip')
s=s[:a]+s[b:]
a=s.index('/* -- the jackpot card -- */')
b=s.index('@media (orientation:landscape) and (max-height:560px){.lkslip{top:6%}')
s=s[:a]+css+s[b:]
open(p,'w',encoding='utf-8').write(s)
print('spliced')
