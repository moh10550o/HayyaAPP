import json, re, difflib, sys
q = json.load(open('/home/claude/qtmp/q/package/dist/quran.json'))
d = {c['id']: c for c in json.load(open('/home/claude/azdata/islambook-azkar.json'))}
DIA = re.compile('[ؐ-ًؚ-ٟۖ-ۭـ]')
def norm(s):
    s = s.replace('ٰ', 'ا').replace('ٱ', 'ا')
    s = DIA.sub('', s)
    s = re.sub('[أإآءؤئٔ]', '', s); s = s.replace('ى', 'ي').replace('ة', 'ه')
    s = re.sub('[^ء-ي ]', ' ', s)
    s = s.replace('ا', '')
    return re.sub(r'\s+', ' ', s).strip()
names = {norm(x['name']).replace(' ', ''): x for x in q}
def surah(nm):
    n = norm(nm).replace(' ', '')
    for k, v in names.items():
        if k == n or k == 'ل' + n or 'ل' + k == n or k.replace('ل', '', 1) == n.replace('ل', '', 1): return v
    return None
REF = re.compile(r'"([^"]+)"\s*\.?\s*\[([^\]\-–]+)[-–]\s*([\d\s،,\-–]+)\]')
bad = 0
for cid in (15, 28, 25, 26):
    for i, it in enumerate(d[cid]['items']):
        for m in REF.finditer(it['t']):
            txt, nm, nums = m.group(1), m.group(2), m.group(3)
            s = surah(nm)
            ns = [int(x) for x in re.findall(r'\d+', nums)]
            if not s: print('NO SURAH', cid, i, nm); bad += 1; continue
            lo, hi = min(ns), max(ns)
            ref = ' '.join(s['verses'][k - 1]['text'] for k in range(lo, hi + 1) if k <= len(s['verses']))
            a, b = norm(txt), norm(ref)
            r = difflib.SequenceMatcher(None, a, b).ratio()
            # the quote may be part of the verse
            part = a in b
            if r < 0.9 and not part:
                sm = difflib.SequenceMatcher(None, a, b); blocks = sum(x.size for x in sm.get_matching_blocks())
                cov = blocks / max(1, len(a))
                if cov < 0.93:
                    bad += 1; print(f'CHECK {cid}/{i} {nm.strip()} {lo}-{hi} ratio={r:.2f} cov={cov:.2f}\n  site: {a[:160]}\n  quran:{b[:160]}')
print('bad', bad)
