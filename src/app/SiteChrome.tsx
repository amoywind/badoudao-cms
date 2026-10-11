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
  { id: 'nav-products', label: 'Products', href: '/products/', placement: 'top_nav', navOrder: 2 },
  { id: 'nav-factory', label: 'Factory', href: '/p/factory/', placement: 'top_nav', navOrder: 3 },
  { id: 'nav-quality', label: 'Quality', href: '/p/quality/', placement: 'top_nav', navOrder: 4 },
  { id: 'nav-articles', label: 'Cases', href: '/articles/', placement: 'top_nav', navOrder: 5 },
  { id: 'nav-contact', label: 'Contact', href: '/contact/', placement: 'top_nav', navOrder: 6 }
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
      <div className="wrap nav">
        <Link className="logo" href="/">BADOU<span>DAO</span></Link>
        <nav className="menu">
          {nav.map((n) => (
            <Link key={n.id} href={n.href}>{n.label}</Link>
          ))}
        </nav>
        <div className="nav-cta">
          <Link href="/products/" className="btn btn-ghost btn-sm">Browse Catalogue</Link>
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

  /* Each footer column comes from the pages table. If one fails the column
     renders empty rather than taking the whole footer down. */
  cols = await Promise.all(
    FOOTER_COLUMNS.map(async (c) => {
      try { return await listNav(c.area); } catch { return []; }
    })
  );

  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="f-grid">
          <div className="f-brand">
            <div className="logo">BADOU<span>DAO</span></div>
            <p>{s.siteName} is a quartz clock manufacturer offering OEM and ODM wall clocks, alarm clocks, table clocks and clock movements. Small-batch production with MOQ from {s.moq || 500} pieces.</p>
            <div className="certs" style={{ marginTop: 20 }}>
              <span className="cert">CE (movement)</span>
              <span className="cert">RoHS (movement)</span>
            </div>
          </div>
          <div>
            <div className="f-h">Products</div>
            <div className="f-list">
              {cats.map((c) => (
                <Link key={c.id} href={`/products/${c.id}/`}>{c.short || c.name}</Link>
              ))}
            </div>
          </div>
          {FOOTER_COLUMNS.map((c, i) => (
            <div key={c.area}>
              <div className="f-h">{c.heading}</div>
              <div className="f-list">
                {cols[i].map((n) => (
                  <Link key={n.id} href={n.href}>{n.label}</Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="f-bot">
          <span>© {new Date().getFullYear()} {s.siteName}. All rights reserved.</span>
          <span>Ex Works pricing · MOQ from {s.moq || 500} pcs</span>
        </div>
      </div>
    </footer>
  );
}
