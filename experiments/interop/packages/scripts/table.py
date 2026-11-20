# python3 -I scripts/table.py -> the per-package table of report 09 (markdown on stdout)
import json,re,collections
R='/home/claude/solid-fuse/experiments/interop/packages'
W=json.load(open(R+'/out/widgets-stats.json'))['packages']; M=json.load(open(R+'/out/modules-stats.json'))['packages']
sc={}
for l in open(R+'/sample/scores.txt'):
    a=l.split()
    if len(a)>=3: sc[a[0]]=(a[1],a[2])
def short(d):
    ab={'sync-return callback':'sync cb','builder':'builder','nested widget/void callback/handle (bridge 05)':'nested','callback, unencodable args':'cb args','unexported type':'unexported','abstract delegate/subclass':'abstract','specific widget subtype':'typed slot','future callback':'future cb','default not reproducible':'default','opaque class (no usable constructor)':'opaque','nested widget/callback':'nested','binary data':'binary','streams':'stream','context':'context','other':'other'}
    return ', '.join(f'{ab.get(k,k)} {v}' for k,v in sorted(d.items(),key=lambda x:-x[1]))
print('| package | likes | 30-day downloads | class | gen s (widget / module) | widget ctors | ctor params | omitted params and data fields | ctors skipped | module members | note |')
print('|---|---:|---:|:-:|---:|---:|---:|---|---|---:|---|')
for l in open(R+'/classification.tsv'):
    n,kind,cls,sub,note=l.rstrip('\n').split('\t')
    w=W.get(n); m=M.get(n)
    lk,dl=sc.get(n,('?','?'))
    t=f"{w['wallS']:.0f}" if w else '-'
    t+=' / '+(f"{m['wallS']:.0f}" if m and m['wallS'] else '-')
    if w and 'emitted' in w:
        c=collections.Counter(w['omittedByCat']); c.update(w['dataOmittedByCat'])
        wc=f"{w['emitted']}/{w['requested']}"; wp=f"{w['paramsEmitted']}/{w['paramsTotal']}"; om=short(c) or 'none'; sk=short(w['skippedByCat']) or '-'
    else: wc=wp=om=sk='-'
    mm=f"{m['bridged']}/{m['total']}" if m else ('crash' if n in ('flutter_slidable','rive') else '-')
    cl=cls+(' ('+sub+')' if cls in 'CD' and sub!='-' else '')
    print(f"| {n} | {lk} | {int(dl):,} | {cl} | {t} | {wc} | {wp} | {om} | {sk} | {mm} | {note} |")
