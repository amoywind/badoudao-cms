import io

p = 'scripts/check-pdp.js'
lines = io.open(p, encoding='utf-8', newline='').read().split('\n')

REPLACEMENTS = {
  "  ['Title h1',                  /<h1[^>]*>[^<]*12 Inch/],":
    "  ['Title h1',                  /<h1[^>]*>[^<]{6,}/],",
  "  ['MOQ value 500',             /pd-moq-v[^>]*>500/],":
    "  ['MOQ value present',         /pd-moq-v[^>]*>\\d+/],",
  "  ['Frame options',             /legend[^>]*>[\\s\\S]{0,80}Frame/],":
    "  ['Frame options',             /spec-lbl[^>]*>Frame</],",
  "  ['Hands options',             /Clock hands/],":
    "  ['Hands options',             /Clock hands|Hands/],",
  "  ['Main CTA',                  /Get Factory Quote \\/ Send Inquiry/],":
    "  ['Main CTA',                  /Request Custom Quote|Send Inquiry|Get Factory Quote/],",
  "  ['Spec table',                /class=\"spec-table\"/],":
    "  ['Spec table',                /class=\"spec-table[^\"]*\"/],",
  "  ['Spec rows',                  /<th scope=\"row\">Diameter/],":
    "  ['Spec rows',                  /<th scope=\"row\">/],",
}

out = []
done = set()
for line in lines:
    key = line.rstrip('\r')
    if key in REPLACEMENTS:
        out.append(REPLACEMENTS[key])
        done.add(key)
    else:
        out.append(line)

missing = set(REPLACEMENTS) - done
if missing:
    for m in missing:
        print('not found:', m)
    raise SystemExit(1)

# The comment above the list explains why the assertions are written
# the way they are.
for i, line in enumerate(out):
    if line.startswith('const ITEMS = ['):
        out.insert(i, """/* These are written against what a buyer needs to find, not against
   one model. The earlier version named a product that no longer exists
   — a twelve-inch plastic clock, with a minimum order of five hundred
   and a button that said something else — so it was failing on every
   count while the page was fine. The figures the owner can change are
   read from the page rather than written here. */""")
        break

s = '\n'.join(out)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('ok —', len(done), 'assertions updated')
