# tiny helper: exact, counted replacements on build.html
import sys
P='/home/claude/grave-goods/work/sprint15b/build.html'
def run(pairs):
    s=open(P,encoding='utf-8').read()
    for old,new,*n in pairs:
        n=n[0] if n else 1
        c=s.count(old)
        if c!=n: print('MISMATCH',c,'!=',n,':',old[:90]); sys.exit(1)
        s=s.replace(old,new)
    open(P,'w',encoding='utf-8').write(s); print('ok',len(pairs))
