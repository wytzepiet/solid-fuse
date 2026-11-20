import json,sys
R='/home/claude/solid-fuse/experiments/interop/packages'
for n in sys.argv[1:]:
    try: m=json.load(open(f'{R}/manifests/{n}.manifest.json'))
    except Exception as e: print('==',n,'NO MANIFEST'); continue
    print(f"== {n} {m['version']}: {len(m['widgets'])} ctors")
    for wn,w in m['widgets'].items():
        req=[k for k,p in w['props'].items() if p.get('required')]
        om={k:v for k,v in (w.get('omitted') or {}).items() if not v.startswith('deprecated') and not v.startswith('key')}
        print(f"  {wn}: {len(w['props'])} props, children={w.get('children')}, required={req}")
        if om: print('     OMITTED:', '; '.join(f'{k} ({v})' for k,v in om.items()))
        if w.get('notes'): print('     notes:', w['notes'])
    for k,v in (m.get('skipped') or {}).items(): print('  SKIPPED', k, '--', v[:170])
