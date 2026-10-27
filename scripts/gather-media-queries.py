"""Gather the media queries to the end of each stylesheet.

The blocks are moved whole — the rules inside a block keep their order,
and the blocks are put in the order of their width, widest first, so
that the rules for a narrow screen come last and win where two of
them apply.

A plain rule that was written after a media query used to override it,
and moving the media query to the end would reverse that. So before
anything is moved, every plain rule is compared with the media query
blocks that come before it, and the script refuses to touch a file
where one of them would change its mind. The comparison is by
selector and by property: a rule that sets the padding and one that
sets the font size are not in conflict however they are ordered.
"""
import io
import re
import sys


def analyse(s):
    """The media query spans and every rule with its properties."""
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

    rules = []
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
            props = {}
            for decl in body.split(';'):
                if ':' in decl:
                    p, v = decl.split(':', 1)
                    p = p.strip().lower()
                    if p and not p.startswith('--'):
                        props[p] = ' '.join(v.split())
            if sel and not sel.startswith('@'):
                blk = None
                for bi, (cond, a, b) in enumerate(spans):
                    if a < i < b:
                        blk = bi
                        break
                rules.append((sel, props, i, blk))
            i = j
        else:
            i += 1

    return spans, rules


def selectors(sel):
    return {' '.join(x.split()) for x in sel.split(',') if x.strip()}


def find_conflicts(spans, rules):
    """The rules that would change their mind if the media queries moved
    to the end.

    Two kinds matter. A plain rule written after a media query used to
    override it, and would stop doing so. And two media query blocks
    that both apply at some width decide between themselves by their
    order — the blocks keep their order here, so those are unaffected,
    but they are checked anyway so that a future change to the
    arrangement cannot pass unnoticed.
    """
    mq_by_sel = {}
    for sel, props, pos, blk in rules:
        if blk is None:
            continue
        for one in selectors(sel):
            mq_by_sel.setdefault(one, []).append((props, pos, blk))

    conflicts = []
    for sel, props, pos, blk in rules:
        if blk is not None:
            continue
        for one in selectors(sel):
            for (mprops, mpos, mblk) in mq_by_sel.get(one, []):
                if mpos >= pos:
                    continue          # the plain rule came first; it wins either way
                for p, v in props.items():
                    if p in mprops and mprops[p] != v:
                        conflicts.append((one, p, v, mprops[p]))
                        break
    return conflicts


def find_block_conflicts(spans, rules):
    """Two media query blocks that set the same property on the same
    thing to different values. The blocks keep their order, so these
    keep their result — this only reports them."""
    by_block = {}
    for sel, props, pos, blk in rules:
        if blk is None:
            continue
        for one in selectors(sel):
            by_block.setdefault((blk, one), []).append(props)

    out = []
    seen = set()
    for (blk, one), entries in by_block.items():
        for other_blk, other_one in list(by_block):
            if other_blk <= blk or other_one != one:
                continue
            for p1, v1 in entries[0].items():
                for p2, v2 in by_block[(other_blk, other_one)][0].items():
                    if p1 == p2 and v1 != v2:
                        key = (one, p1)
                        if key not in seen:
                            seen.add(key)
                            out.append((one, p1, v1, v2, blk, other_blk))
    return out


def sort_key(cond):
    """Widest first. A block with only a minimum width covers the most
    ground, so it goes first."""
    mx = re.search(r'max-width:\s*(\d+)px', cond)
    mn = re.search(r'min-width:\s*(\d+)px', cond)
    if mx:
        return (0, -int(mx.group(1)))
    if mn:
        return (-1, -int(mn.group(1)))
    return (1, 0)


def gather(path):
    raw = io.open(path, encoding='utf-8', newline='').read()
    nl = '\r\n' if '\r\n' in raw else '\n'
    s = raw.replace('\r\n', '\n')

    spans, rules = analyse(s)
    if not spans:
        print(f'  {path}: 没有媒体查询')
        return 0

    conflicts = find_conflicts(spans, rules)
    if conflicts:
        print(f'  {path}: {len(conflicts)} 处规则会改变，未改动')
        seen = set()
        for one, p, v, mv in conflicts:
            if one in seen:
                continue
            seen.add(one)
            print(f'      {one[:44]:46} {p}: 顶层 {v} / 媒体内 {mv}')
        return 0

    block_conflicts = find_block_conflicts(spans, rules)
    if block_conflicts:
        print(f'  {path}: {len(block_conflicts)} 处两个媒体查询块互相竞争'
              f'（块的相对顺序保持不变，结果不受影响）:')
        seen = set()
        for one, p, v1, v2, b1, b2 in block_conflicts:
            if one in seen:
                continue
            seen.add(one)
            print(f'      {one[:40]:42} {p}: 块{b1} {v} / 块{b2} {v2}')
        print()

    # The range to cut for each block: the block itself, and the
    # comment that introduces it if there is one directly above.
    #
    # "Directly above" means the comment ends immediately before the
    # block, with nothing but whitespace between. Looking for the last
    # blank line instead would take in whatever rule stood between that
    # line and the block, and cut it away with the comment.
    cuts = []
    pieces = []
    for cond, a, b in spans:
        start = a
        k = a - 1
        while k >= 0 and s[k] in ' \t\r\n':
            k -= 1
        if k >= 1 and s[k] == '/' and s[k - 1] == '*':
            close = k + 1
            open_ = s.rfind('/*', 0, close)
            if open_ != -1:
                start = open_
        cuts.append((start, b))
        pieces.append((cond, s[start:b]))

    # The blocks are cut from the end of the file backwards. Cutting
    # forwards shifts the position of every block that has not been cut
    # yet, and the blocks that follow would be taken out at the wrong
    # place.
    rest = s
    for start, b in sorted(cuts, key=lambda x: -x[0]):
        rest = rest[:start] + rest[b:]

    rest = rest.rstrip() + '\n\n'

    # The blocks keep the order they were written in.
    #
    # Putting them in the order of their width would read better, and
    # it is the usual way round — but the order two blocks are in
    # decides which of them wins where they both apply, and the order
    # in this file is the one the styles were written in. Sorting them
    # by width changed what was painted: the block for a narrower
    # screen moved after the one for a wider screen, and where they
    # set the same property on the same thing, the other one won.
    ordered = pieces
    header = (
        '/* ===================================================================\n'
        '   Media queries\n'
        '   -------------------------------------------------------------------\n'
        '   They are gathered here so that a change of breakpoint is one edit\n'
        '   rather than a hunt through the file.\n'
        '   =================================================================== */\n\n'
    )

    out = rest + header + '\n\n'.join(p for _, p in ordered) + '\n'
    if nl == '\r\n':
        out = out.replace('\n', '\r\n')
    io.open(path, 'w', encoding='utf-8', newline='').write(out)
    return len(spans)


total = 0
for path in sys.argv[1:]:
    n = gather(path)
    total += n
    if n:
        print(f'  {path}: 归拢了 {n} 个媒体查询块')
print('共归拢', total, '个块')
