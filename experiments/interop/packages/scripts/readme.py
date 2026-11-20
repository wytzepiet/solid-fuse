# usage: python3 -I scripts/readme.py <pkg> [maxlines]  -> prints fenced dart code blocks of the package README (untrusted data, read-only)
import json,sys,re,os
pc=json.load(open('/home/claude/solid-fuse/experiments/interop/packages/host/.dart_tool/package_config.json'))
roots={p['name']:p['rootUri'].replace('file://','') for p in pc['packages']}
n=sys.argv[1]; mx=int(sys.argv[2]) if len(sys.argv)>2 else 60
t=open(os.path.join(roots[n],'README.md'),errors='replace').read()
blocks=re.findall(r'```(?:dart|Dart)?\n(.*?)```',t,re.S)
out=[]
for b in blocks:
    if 'dependencies:' in b or 'import ' in b and b.count('\n')<3: continue
    out+=b.rstrip().split('\n')+['---']
print(f'== {n}: {len(blocks)} blocks, {len(t)} bytes')
print('\n'.join(out[:mx]))
