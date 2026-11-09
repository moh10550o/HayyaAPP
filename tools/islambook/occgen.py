import json, re, sys, difflib
sys.path.insert(0, '/home/claude/azwork')
from occasions import OCC
exec(open('/home/claude/azwork/qcheck.py').read().split("names = ")[0])  # norm(), q
SUR = {x['id']: x for x in q}
out, seen, bad = {}, {}, 0
for oid, L in OCC.items():
    items = []
    for t, s in L:
        if isinstance(s, tuple):
            _, su, a, b = s
            ref = ' '.join(SUR[su]['verses'][k - 1]['text'] for k in range(a, b + 1))
            A, B = norm(t), norm(ref)
            if A not in B:
                r = difflib.SequenceMatcher(None, A, B).ratio(); bad += 1
                print('QURAN MISMATCH', oid, su, a, '\n  mine :', A, '\n  quran:', B)
            s = f'سورة {SUR[su]["name"]}: {a}' + (f'–{b}' if b != a else '')
            t = '﴿' + t + '﴾'
        key = norm(t)
        if key in seen: print('DUPLICATE', oid, seen[key], t[:50]); bad += 1
        seen[key] = oid
        items.append({'t': t, 's': s})
    out[oid] = items
print('occasions', len(out), 'items', sum(len(v) for v in out.values()), 'problems', bad)
json.dump(out, open('/home/claude/azwork/occ.json', 'w'), ensure_ascii=False)
