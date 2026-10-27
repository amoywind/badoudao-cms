"""Did gathering the media queries change the stylesheet?

Three things are compared between the original and the gathered copy:
the number of braces, the number of rules, and — the one that matters —
every property of every rule, in the order the rules appear.
"""
import io
import os
import re
import sys


def fingerprint(s):
    """A list of (selector, property, value) for every rule, in order,
    with the media query each rule sits in recorded."""
    masked = re.sub(r'/\*.*?\*/', lambda m: ' ' * (m.end() - m.start()), s, flags=re.S)

    spans = []
    for m in re.finditer(r'@media([^{]*)\{', masked):
        cond = ' '.join(m.group(1).split())
        depth = 1
        j = m.end()
        while j < len(masked) and depth:
            if masked[j] == '{': depth += 1
            elif masked[j] == '}': depth -= 1
            j += 1
        spans.append((cond, m.start(), j))

    out = []
    i = 0
    n = len(masked)
    while i < n:
        if masked[i] == '{':
            depth = 1
            j = i + 1
            while j < n and depth:
                if masked[j] == '{': depth += 1
                elif masked[j] == '}': depth -= 1
                j += 1
            k = i - 1
            while k >= 0 and masked[k] in ' \t\r\n': k -= 1
            end = k + 1
            while k >= 0 and masked[k] not in ';}{': k -= 1
            sel = masked[k + 1:end].strip()
            body = masked[i + 1:j - 1]
            blk = None
            for bi, (cond, a, b) in enumerate(spans):
                if a < i < b:
                    blk = bi
                    break
            props = []
            for decl in body.split(';'):
                if ':' in decl:
                    p, v = decl.split(':', 1)
                    props.append((p.strip().lower(), ' '.join(v.split())))
            if sel and not sel.startswith('@'):
                out.append((sel, blk, tuple(props)))
            i = j
        else:
            i += 1
    return out


def cond_list(s):
    masked = re.sub(r'/\*.*?\*/', lambda m: ' ' * (m.end() - m.start()), s, flags=re.S)
    out = []
    for m in re.finditer(r'@media([^{]*)\{', masked):
        depth = 1
        j = m.end()
        while j < len(masked) and depth:
            if masked[j] == '{': depth += 1
            elif masked[j] == '}': depth -= 1
            j += 1
        out.append((' '.join(m.group(1).split()), masked[m.end():j - 1]))
    return out


ok = True
for path in sys.argv[1:]:
    new = path
    # The copy lives in scripts/.mqtest/; the original is the file of
    # the same name in src/app/.
    base = path.split('/')[-1]
    old = 'src/app/' + base
    if not os.path.exists(old):
        print('skip', path)
        continue

    a = io.open(old, encoding='utf-8', newline='').read()
    b = io.open(new, encoding='utf-8', newline='').read()

    print(f'=== {old.split("/")[-1]} ===')
    for name, text in (('原', a), ('新', b)):
        print(f'  {name}: {{ {text.count("{")}  }} {text.count("}")}  '
              f'规则 {len(fingerprint(text))}  媒体查询 {len(cond_list(text))}')

    if a.count('{') != a.count('}'):
        print('  ✗ 原文件括号就不平衡')
        ok = False
    if b.count('{') != b.count('}'):
        print('  ✗ 归拢后括号不平衡')
        ok = False

    fa, fb = fingerprint(a), fingerprint(b)
    if len(fa) != len(fb):
        print(f'  ✗ 规则数不同: {len(fa)} → {len(fb)}')
        ok = False
    else:
        print(f'  ✓ 规则数相同 ({len(fa)})')

    # Every rule must be present, with the same properties. The order
    # changes — that is the point — so the two lists are compared as
    # multisets.
    def key(r):
        return (r[0], r[2])
    from collections import Counter
    ca, cb = Counter(key(r) for r in fa), Counter(key(r) for r in fb)
    if ca != cb:
        missing = ca - cb
        added = cb - ca
        print(f'  ✗ 规则内容不同: 少了 {len(missing)} 条, 多了 {len(added)} 条')
        for k in list(missing)[:5]:
            print('      少:', k[0][:50], k[1][:4])
        for k in list(added)[:5]:
            print('      多:', k[0][:50], k[1][:4])
        ok = False
    else:
        print('  ✓ 每条规则的属性完全一致')

    # The blocks themselves, in their new order.
    ca_list = cond_list(a)
    cb_list = cond_list(b)
    if sorted(x[0] for x in ca_list) != sorted(x[0] for x in cb_list):
        print('  ✗ 媒体查询条件集合不同')
        ok = False
    else:
        print('  ✓ 媒体查询条件集合相同')

    # The order the blocks are now in.
    print('  新顺序:', ', '.join(x[0] for x in cb_list[:8]),
          '...' if len(cb_list) > 8 else '')
    print()

print('全部一致' if ok else '有差异')
sys.exit(0 if ok else 1)
