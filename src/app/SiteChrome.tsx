import Link from 'next/link';
import { getSettings, listCategories, listNav } from '@/lib/db';
import type { Category, NavItem, SiteSettings } from '@/lib/db';

/* The DB read is wrapped in try/catch so a missing binding degrades to an
   empty page instead of a 500. The annotations keep the fallback variables
   typed — `let s = {}` would infer {} and every property access below it
   would fail type checking. */

/* Used only if the navigation table is unavailable, so a database hiccup
   leaves a working menu rather than a blank header. */
const FALLBACK_TOP: NavItem[] = [
  { id: 'nav-home', label: 'Home', href: '/', placement: 'top_nav', navOrder: 1 },
  { id: 'nav-products', label: 'Products', href: '/products', placement: 'top_nav', navOrder: 2 },
  { id: 'nav-factory', label: 'Factory', href: '/p/factory', placement: 'top_nav', navOrder: 3 },
  { id: 'nav-quality', label: 'Quality', href: '/p/quality', placement: 'top_nav', navOrder: 4 },
  { id: 'nav-articles', label: 'Cases', href: '/articles', placement: 'top_nav', navOrder: 5 },
  { id: 'nav-contact', label: 'Contact', href: '/contact', placement: 'top_nav', navOrder: 6 }
];

export async function TopBar() {
  let s: SiteSettings = {};
  try { s = await getSettings(); } catch {}
  return (
    <div className="topbar">
      <div className="wrap">
        <span>{s.siteName || 'Badoudao'} · Quartz clock manufacturer · OEM / ODM small-batch production</span>
        <span><b>Reply within {s.quoteHours || 12} hours</b> · <Link href="/#inquiry">Get a Quote</Link></span>
      </div>
    </div>
  );
}

export async function Header() {
  let cats: Category[] = [];
  let nav: NavItem[] = [];
  try { cats = await listCategories(); } catch {}
  try { nav = await listNav('top_nav'); } catch {}
  if (!nav.length) nav = FALLBACK_TOP;

  return (
    <header className="site-header">
      {/* The mobile menu is a checkbox and a label, not a <details>.

          <details> was the first attempt and it does not work here: a
          closed details hides its children from rendering outright, so a
          server-rendered header with no open attribute shows no
          navigation at all on desktop — which is what happened. Setting
          `open` fixes desktop and then the phone cannot close it, because
          removing the attribute from CSS is not possible and
          content-visibility only hides the content, not the open/closed
          behaviour the summary toggles.

          A checkbox is the version that behaves the same on both: the
          markup is identical at every width, the peer selector
          (#nav-toggle:checked ~ .nav) does the rest in CSS, and the
          labels stay in the document for crawlers and screen readers.

          The checkbox takes tabIndex={-1} and nothing else. It previously
          carried aria-hidden="true" as well, which is invalid on a
          focusable element — the console rejected it, with "Blocked
          aria-hidden on an element because its descendant retained focus",
          on every page load. Hiding a control from assistive tech while
          leaving it reachable by keyboard is the opposite of what either
          audience needs.

          So it stays out of the tab order, and the label keeps the accessible
          name "Menu" — the checkbox is a CSS state holder, not something a
          person operates. */}
      <input type="checkbox" id="nav-toggle" className="nav-checkbox"
        tabIndex={-1} />
      <label className="nav-toggle" htmlFor="nav-toggle">
        <span className="nav-toggle-bars" aria-hidden="true">
          <span /><span /><span />
        </span>
        <span className="nav-toggle-text">Menu</span>
      </label>

      <div className="wrap nav">
          <Link className="logo" href="/">BADOU<span>DAO</span></Link>

          {/* Products opens a dropdown of the categories.
              CSS-only, using :hover and :focus-within: no JavaScript means no
              layout shift on load and it still works with the header already
              rendered on the server. */}
          <nav className="menu">
          {nav.map((n) =>
            n.id === 'nav-products' ? (
              <div className="navdrop-wrap" key={n.id}>
                <Link href={n.href} className="navdrop-trigger">
                  {n.label}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="3" aria-hidden="true">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </Link>

                {cats.length > 0 && (
                  <div className="navdrop">
                    <div className="drop-grid">
                      {cats.map((c) => (
                        <Link key={c.id} href={`/products/${c.id}`} className="navdrop-item">
                          <span className="navdrop-name">{c.name}</span>
                          <span className="navdrop-desc">{c.short || c.description || ''}</span>
                        </Link>
                      ))}
                    </div>
                    <Link href="/products" className="navdrop-all">
                      View all products →
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <Link key={n.id} href={n.href}>{n.label}</Link>
            )
          )}
        </nav>

        <div className="nav-cta">
          <Link href="/products" className="btn btn-ghost btn-sm">Browse Catalogue</Link>
          <Link href="/#inquiry" className="btn btn-primary btn-sm">Get a Quote</Link>
        </div>
        </div>
    </header>
  );
}

/* Footer column headings, paired with the placement that feeds each one. */
const FOOTER_COLUMNS: { area: string; heading: string }[] = [
  { area: 'footer_2', heading: 'Services' },
  { area: 'footer_3', heading: 'Company' },
  { area: 'footer_4', heading: 'Resources' }
];

export async function Footer() {
  let s: SiteSettings = {}, cats: Category[] = [];
  let cols: NavItem[][] = [[], [], []];
  try {
    s = await getSettings();
    cats = await listCategories();
  } catch {}

  /* Footer columns come from pages.footer_slot, not pages.placement.

     placement holds top_nav, so a page set to a footer column left the
     header — which is how OEM/ODM, Small Batch, Factory, Quality, Contact
     and Certification came to be missing from the nav. One column cannot
     mean both places. The two are now separate fields and a page can be in
     both, which is what a site map actually looks like: the header is how
     you move around, the footer is the index at the end. */
  cols = await Promise.all(
    FOOTER_COLUMNS.map(async (c) => {
      try {
        return await listNav(c.area, { column: 'footer_slot' });
      } catch {
        return [];
      }
    })
  );

  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="f-grid">
          <div className="f-brand">
            <div className="logo">BADOU<span>DAO</span></div>
            <p>{s.siteName} is a quartz clock manufacturer offering OEM and ODM wall clocks, alarm clocks, table clocks and clock movements. Small-batch production with MOQ from {s.moq || 500} pieces.</p>
            {/* The certification belongs to the movement, not to the clock —
                that distinction is the whole compliance note, and printing
                "(movement)" on a badge was a note to myself that shipped.
                The clockmaker's licence question comes up on the
                certification page; a footer badge has room for the claim
                and not for the caveat. */}
            <div className="certs" style={{ marginTop: 20 }}>
              <span className="cert">CE &amp; RoHS movements</span>
            </div>
          </div>
          <div>
            <div className="f-h">Products</div>
            <div className="f-list">
              {cats.map((c) => (
                <Link key={c.id} href={`/products/${c.id}`}>{c.short || c.name}</Link>
              ))}
            </div>
          </div>
          {/* A column with nothing in it is not rendered at all.

              Rendering the heading alone leaves a heading over blank space,
              which reads as a page that failed to finish loading — and it
              pushes the columns that do have links into a narrower grid, so
              one unassigned page degrades the whole footer. The grid is
              fixed at four, so the remaining columns widen to fill. */}
          {FOOTER_COLUMNS.map((c, i) =>
            cols[i].length === 0 ? null : (
              <div key={c.area}>
                <div className="f-h">{c.heading}</div>
                <div className="f-list">
                  {cols[i].map((n) => (
                    <Link key={n.id} href={n.href}>{n.label}</Link>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
        <div className="f-bot">
          <span>© {new Date().getFullYear()} {s.siteName}. All rights reserved.</span>
          <span>Ex Works pricing · MOQ from {s.moq || 500} pcs</span>
        </div>
      </div>
    </footer>
  );
}
