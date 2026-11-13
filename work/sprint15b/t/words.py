#!/usr/bin/env python3
"""Retired-word audit. Finds every use of the retired luck vocabulary in a build, drops code comments, code identifiers and
telemetry keys, and prints what is left: text a player could read. Exit 1 if anything is left that is not on the ALLOW list.
usage: words.py [build.html] [-v]"""
import re,sys
f=sys.argv[1] if len(sys.argv)>1 and not sys.argv[1].startswith('-') else '/home/claude/grave-goods/work/sprint15b/build.html'
V='-v' in sys.argv
s=open(f,encoding='utf-8').read()
# 1. blank out comments (JS // and /* */, HTML <!-- -->) and inline font/data blobs, keeping offsets
def blank(m):return re.sub(r'[^\n]',' ',m.group(0))
t=re.sub(r'<!--.*?-->',blank,s,flags=re.S)
t=re.sub(r'/\*.*?\*/',blank,t,flags=re.S)
t=re.sub(r'(?<![:\\"\'`])//[^\n]*',blank,t)           # // comments (not URLs, not inside the few strings that carry //)
t=re.sub(r'base64,[A-Za-z0-9+/=]{100,}',blank,t)
WORDS=r"jackpots?|reels?|spin(?:s|ning)?|spun|wheels?|teas(?:e|es|ing)|near[ -]miss(?:es)?|lucky strikes?|press your luck|coins?|flip(?:s|ped)?|heads|tails|odds|lucky|five slots"
out=[];quoted={}
for m in re.finditer(r'(?<![A-Za-z])('+WORDS+r')(?![A-Za-z])',t,flags=re.I):
    a,b=m.start(),m.end();w=m.group(1)
    pre=t[max(0,a-1):a];post=t[b:b+1]
    ctx=t[max(0,a-70):b+70].replace('\n',' ')
    line=t.count('\n',0,a)+1
    # 2. code, not text: identifiers, property access, object keys, quoted keys used as ids, css classes
    if pre in '._$#-' or post in '_$(=' : continue                       # a.b, snake_case, call, assignment, #id, css-class
    if re.match(r"\s*[:=,)\]]",t[b:b+3]) and pre in "'\"{, (!&|[?" and not re.search(r"[A-Za-z] $",t[max(0,a-2):a]): 
        # 'coin': / coin: / ,coin) / ==='coin'  -> key or id unless it sits in prose
        if pre in "'\"" and post in "'\"" and w==w.lower(): quoted[w]=quoted.get(w,0)+1; continue
        if post in ':' or t[b:b+1] in ',)]': 
            if not re.search(r"[A-Za-z]{2,} $",t[max(0,a-12):a]): continue
    if pre in "'\"" and post in "'\"":                                    # 'coin' as a whole quoted token: an id or key IF it is lower case; a capitalised one is a label
        if w==w.lower(): quoted[w]=quoted.get(w,0)+1; continue
    if pre=='(' and post=='?': continue                                   # (flip?a:b): a variable
    if re.search(r"(class|id|data-[a-z]+|for)=\"[^\"]*$",t[max(0,a-60):a]): continue   # html attribute naming a class or id
    out.append((line,w,ctx))
ALLOW=[ # real things a dig finds or a museum label says; not the luck vocabulary
 (r"gear wheel in a lump of rock",'Antikythera mechanism: a historical fact about a gear'),
 (r"spinning jeweler's wheel",'crystal skull: a historical fact about a tool mark'),
 (r"most widely used coin in the ancient world",'Athenian tetradrachm: a real coin'),
 (r"tetradrachm[^.]*\.? and the coins were calle",'Athenian owl coins: a real coin'),
 (r"not one coin, and so few",'tomb rule text: coins as finds'),
 (r"I have taken heads for less",'Camazotz, the death bat: actual heads'),
 (r"hunger:\"a Coin\"|a Coin",'a find named Coin (an artifact the relic wants fed)'),
 (r"Coins are wild for Dynasties",'Athenian Owl power: Coin is a kind of find'),
 (r"called the coins 'little owls'",'Athenian owl coins: a real coin'),
 (r"there are no coins|no coins, a target",'tomb rule text: coins as finds'),
 (r"gives? a fox more tails",'the nine-tailed fox: actual tails'),
 (r"Lucky Knucklebone|Lucky Bone",'the name of a piece of gear (not on the retire list)'),
 (r"n:\"Coin\"|name===?[\"']Coin[\"']|add\(\"Coin\"|hFind\(g,'Coin'",'Coin is the name of the smallest find on the wall (a buried coin), not the luck vocabulary'),
 (r"traditionally the lucky number",'a plain adjective about the number thirteen'),
]
left=[]
for line,w,ctx in out:
    why=None
    for pat,note in ALLOW:
        if re.search(pat,ctx): why=note;break
    if why:
        if V: print(f'allowed  {line}: [{w}] {note}')
    else: left.append((line,w,ctx))
for line,w,ctx in left: print(f'{line}: [{w}] …{ctx}…')
print('lower-case whole-token strings treated as code keys (telemetry, state, sprite ids):',quoted)
print(f'{len(out)} candidate uses outside comments and code names; {len(out)-len(left)} allowed (real coins, gears, a fox, a gear name); {len(left)} left')
sys.exit(1 if left else 0)
