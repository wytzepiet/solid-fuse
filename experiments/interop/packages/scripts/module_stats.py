# python3 -I scripts/module_stats.py -> markdown table for the object/module generator runs + out/modules-stats.json
import json,glob,os,re,collections
R='/home/claude/solid-fuse/experiments/interop/packages'
def cat(w):
    w=w or ''
    l=w.lower()
    if 'stream' in l and 'not encodable' in l: return 'streams'
    if 'sync' in l and 'callback' in l or 'returns a value' in l: return 'sync-return callback'
    if 'callback' in l or 'function' in l: return 'takes a callback'
    if 'generic' in l: return 'generics'
    if 'buildcontext' in l or 'context' in l: return 'context'
    if 'widget' in l: return 'returns/takes a widget'
    if 'uint8list' in l or 'typed' in l or 'bytedata' in l: return 'binary data'
    if 'record' in l: return 'dart record type'
    if 'not encodable' in l or 'not decodable' in l or 'no record shape' in l or 'unbridgeable' in l: return 'opaque type'
    return 'other'
rows={}; tot=collections.Counter()
for f in sorted(glob.glob(R+'/host/out/*.report.json')):
    r=json.load(open(f)); n=r['name']
    t=open(R+'/out/modules/'+n+'.time').read() if os.path.exists(R+'/out/modules/'+n+'.time') else ''
    m=re.search(r'wall=([\d.]+)',t)
    c=collections.Counter()
    for x in r['notBridged']:
        k=cat(x.get('why')); c[k]+=1; tot[k]+=1
    rows[n]={'wallS':float(m.group(1)) if m else None,'total':r['surface']['total'],'bridged':r['surface']['bridged'],'objects':[o['class'] for o in r['objects']],
             'notBridged':r['notBridged'],'byCat':dict(c),'dartLines':r['dartLines'],'tsLines':r['tsLines'],'warnings':r['warnings'],'notCallable':r.get('notCallable')}
json.dump({'packages':rows,'totals':dict(tot)},open(R+'/out/modules-stats.json','w'),indent=1)
print('| package | wall s | public callable members bridged/total | objects (handles) | not bridged (by category) | Dart / TS lines |')
print('|---|---:|---:|---|---|---|')
for n,r in rows.items():
    o=', '.join(f'{k} {v}' for k,v in sorted(r['byCat'].items(),key=lambda x:-x[1])) or 'none'
    ob=', '.join(r['objects'][:6])+(' …' if len(r['objects'])>6 else '')
    print(f"| {n} | {r['wallS'] or 0:.0f} | {r['bridged']}/{r['total']} | {len(r['objects'])}: {ob} | {o} | {r['dartLines']} / {r['tsLines']} |")
print(); print('totals', tot.most_common())
