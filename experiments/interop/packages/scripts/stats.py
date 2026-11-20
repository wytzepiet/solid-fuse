# Aggregates widget-generator output: python3 -I scripts/stats.py  -> out/widgets-stats.json + a markdown table on stdout
import json,glob,os,re,collections
R='/home/claude/solid-fuse/experiments/interop/packages'
def cat(reason):
    r=reason
    if r.startswith('nested:'):
        u=r[7:]
        if u.startswith('nested:'): u=u[7:]
        if u.startswith('widget/slot') or u.startswith('widget/preferredSize') or u.startswith('handle') or 'void()' in u or 'void(encodable args)' in u:
            return 'nested widget/void callback/handle (bridge 05)'
        return cat(u)
    if r.startswith('deprecated') or r.startswith('key'): return None
    if r.startswith('builder'): return 'builder'
    if 'sync-return' in r: return 'sync-return callback'
    if 'Future' in r: return 'future callback'
    if 'unencodable args' in r: return 'callback, unencodable args'
    if 'nested' in r: return 'nested widget/callback'
    if 'abstract' in r: return 'abstract delegate/subclass'
    if 'handle' in r or 'controller' in r.lower(): return 'controller'
    if 'generic' in r or 'type-parameter' in r: return 'generics'
    if 'future/stream' in r: return 'streams'
    if 'framework-object' in r: return 'context'
    if 'private/unexported' in r: return 'unexported type'
    if 'binary' in r: return 'binary data'
    if 'default value' in r: return 'default not reproducible'
    if 'widget/subtype' in r: return 'specific widget subtype'
    if 'no-usable-constructor' in r: return 'opaque class (no usable constructor)'
    if 'untyped-Function' in r or 'record' in r or 'map-key' in r or 'Type' in r or 'nested-collection' in r: return 'other type'
    return 'other'
rows={}; allc=collections.Counter(); raw=collections.Counter(); alld=collections.Counter()
tc=collections.Counter()
for f in glob.glob(R+'/manifests/*.manifest.json'):
    for tn in json.load(open(f))['types']: tc[tn]+=1
pc=json.load(open(R+'/host/.dart_tool/package_config.json'))
roots={p['name']:p['rootUri'].replace('file://','') for p in pc['packages']}
_src={}
def declared_by(pkg,tn):
    # is data type `tn` declared by the package (or a federated sibling such as <pkg>_platform_interface)?
    if pkg not in _src:
        t=''
        for n,r in roots.items():
            if n.startswith(pkg) and os.path.isdir(r+'/lib'):
                for d,_,fs in os.walk(r+'/lib'):
                    for f in fs:
                        if f.endswith('.dart'): t+=open(os.path.join(d,f),errors='replace').read()
        _src[pkg]=t
    return re.search(r'(class|mixin|enum)\s+'+re.escape(tn)+r'\b',_src[pkg]) is not None
for f in sorted(glob.glob(R+'/out/widgets/*.summary.json')):
    n=os.path.basename(f)[:-13]
    try: s=json.load(open(f))
    except Exception: rows[n]={'error':open(R+'/out/widgets/'+n+'.log').read()[-400:]}; continue
    u=s['units'][n]
    wall=float(re.search(r'wall=([\d.]+)',open(R+'/out/widgets/'+n+'.time').read()).group(1))
    row={'wallS':wall,'loadMs':s['loadMs'],'unitMs':u.get('ms')}
    if 'crash' in u: row['crash']=u['crash']; rows[n]=row; continue
    m=json.load(open(R+'/manifests/'+n+'.manifest.json'))
    om=collections.Counter(); omitted={}
    for wn,w in m['widgets'].items():
        for k,v in (w.get('omitted') or {}).items():
            c=cat(v); raw[v]+=1
            if c: om[c]+=1; allc[c]+=1; omitted[wn+'.'+k]=v
    dom=collections.Counter(); domitted={}
    for tn,t in m['types'].items():
        if not declared_by(n,re.sub(r'Of.*$','',tn)) and not declared_by(n,tn): continue
        for v in t.get('variants') or []:
            for k,why in (v.get('omitted') or {}).items():
                c=cat(why); raw['data:'+why]+=1
                if c: dom[c]+=1; alld[c]+=1; domitted[tn+('.'+v['tag'] if v.get('tag') else '')+'.'+k]=why
    skipped=m.get('skipped') or {}
    sk=collections.Counter()
    for k,v in skipped.items():
        mm=re.search(r'is not bridgeable: (.*)$',v); c=cat(mm.group(1) if mm else v) or 'other'; sk[c]+=1
    props=sum(len(w['props']) for w in m['widgets'].values())
    row.update(version=m['version'],requested=u['widgetsRequested'],emitted=u['widgetsEmitted'],paramsTotal=u['paramsTotal'],paramsEmitted=u['paramsEmitted'],
               props=props,omittedByCat=dict(om),omitted=omitted,dataOmittedByCat=dict(dom),dataOmitted=domitted,skipped=skipped,skippedByCat=dict(sk),dartLines=u['dartLines'],adapterLines=u['dartAdapterLines'],warnings=u['warnings'])
    rows[n]=row
json.dump({'packages':rows,'omittedTotals':dict(allc),'dataOmittedTotals':dict(alld),'rawReasons':dict(raw)},open(R+'/out/widgets-stats.json','w'),indent=1)
print('| package | ver | wall s | ctors emitted/found | params bridged/total | omitted ctor params (by category) | omitted inside package data types | ctors skipped |')
print('|---|---|---:|---:|---:|---|---|---|')
for n,r in rows.items():
    if 'emitted' not in r: print(f'| {n} | FAILED | | | | {r} |'); continue
    o=', '.join(f'{k} {v}' for k,v in sorted(r['omittedByCat'].items(),key=lambda x:-x[1])) or 'none'
    s=', '.join(f'{k} {v}' for k,v in r['skippedByCat'].items()) or '-'
    d=', '.join(f'{k} {v}' for k,v in sorted(r['dataOmittedByCat'].items(),key=lambda x:-x[1])) or 'none'
    print(f"| {n} | {r['version']} | {r['wallS']:.0f} | {r['emitted']}/{r['requested']} | {r['paramsEmitted']}/{r['paramsTotal']} | {o} | {d} | {s} |")
print(); print('omitted ctor params:',allc.most_common()); print('omitted data-type fields:',alld.most_common())
