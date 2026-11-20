# python3 -I scripts/props.py <pkg> <Name> [<Name>...]  -> compact view of generated TS interfaces / types
import sys,re
R='/home/claude/solid-fuse/experiments/interop/packages/ts/generated/'
t=open(R+sys.argv[1]+'.ts').read()
t=re.sub(r'/\*\*.*?\*/\s*','',t,flags=re.S)
for n in sys.argv[2:]:
    m=re.search(r'export interface '+n+r'(Props|Out)? [^{]*\{(.*?)\n\}',t,re.S)
    if m: print(n+':', ' '.join(l.strip() for l in m.group(2).split('\n') if l.strip())[:1800]); continue
    m=re.search(r'export type '+n+r' =(.*?);\n\n',t,re.S) or re.search(r'export type '+n+r' =(.*?);\n',t,re.S)
    print(n+' =', (' '.join(l.strip() for l in m.group(1).split('\n'))[:1500]) if m else 'NOT FOUND')
