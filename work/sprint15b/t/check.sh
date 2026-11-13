#!/bin/bash
# extract every inline <script> of a build and run node --check on it
f=${1:-/home/claude/grave-goods/work/sprint15b/build.html}; d=$(mktemp -d)
python3 - "$f" "$d" <<'PY'
import re,sys
s=open(sys.argv[1],encoding='utf-8').read()
n=0
for m in re.finditer(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>',s,re.S):
    open(f'{sys.argv[2]}/s{n}.js','w',encoding='utf-8').write(m.group(1));n+=1
print('scripts:',n)
PY
rc=0;for j in $d/*.js;do node --check $j && echo "node --check OK $(wc -c <$j) bytes" || rc=1;done;rm -rf $d;exit $rc
