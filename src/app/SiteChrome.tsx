import Link from 'next/link';
import { getSettings, listCategories } from '@/lib/db';
import type { Category, SiteSettings } from '@/lib/db';

/* The DB read is wrapped in try/catch so a missing binding degrades to an
   empty page instead of a 500. The annotations keep the fallback variables
   typed — `let s = {}` would infer {} and every property access below it
   would fail type checking. */

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
  try { cats = await listCategories(); } catch {}
  return (
    <header className="site-header">
      <div className="wrap nav">
        <Link className="logo" href="/">BADOU<span>DAO</span></Link>
        <nav className="menu">
          <Link href="/products/">Products</Link>
          <Link href="/p/oem-odm/">OEM / ODM</Link>
          <Link href="/p/small-batch/">Small Batch</Link>
          <Link href="/p/factory/">Factory</Link>
          <Link href="/p/quality/">Quality</Link>
          <Link href="/blog/">Guides</Link>
        </nav>
        <div className="nav-cta">
          <Link href="/products/" className="btn btn-ghost btn-sm">Browse Catalogue</Link>
          <Link href="/#inquiry" className="btn btn-primary btn-sm">Get a Quote</Link>
        </div>
      </div>
    </header>
  );
}

export async function Footer() {
  let s: SiteSettings = {}, cats: Category[] = [];
  try {
    s = await getSettings();
    cats = await listCategories();
  } catch {}
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
          <div>
            <div className="f-h">Services</div>
            <div className="f-list">
              <Link href="/oem-odm/">OEM Manufacturing</Link>
              <Link href="/small-batch/">Small Batch Runs</Link>
              <Link href="/quality/">Quality Control</Link>
              <Link href="/certification/">Certification</Link>
            </div>
          </div>
          <div>
            <div className="f-h">Company</div>
            <div className="f-list">
              <Link href="/factory/">About the Factory</Link>
              <Link href="/quality/">Quality Control</Link>
              <Link href="/certification/">Certification</Link>
              <Link href="/#inquiry">Contact</Link>
            </div>
          </div>
          <div>
            <div className="f-h">Guides</div>
            <div className="f-list">
              <Link href="/faq/">Buyer FAQ</Link>
              <Link href="/small-batch/">MOQ Explained</Link>
              <Link href="/certification/">CE &amp; RoHS Guide</Link>
            </div>
          </div>
        </div>
        <div className="f-bot">
          <span>© {new Date().getFullYear()} {s.siteName}. All rights reserved.</span>
          <span>Ex Works pricing · MOQ from {s.moq || 500} pcs</span>
        </div>
      </div>
    </footer>
  );
}
