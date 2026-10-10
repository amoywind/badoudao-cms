import Link from 'next/link';
import { getSettings, listCategories } from '@/lib/db';
import { getRequestContext } from '@cloudflare/next-on-pages';

export async function TopBar() {
  let s = {};
  try { s = await getSettings(); } catch {}
  return (
    <div className="topbar">
      <div className="wrap">
        <span>{s.siteName} · Quartz clock manufacturer · OEM / ODM small-batch production</span>
        <span><b>Reply within {s.quoteHours || 12} hours</b> · <Link href="/#inquiry">Get a Quote</Link></span>
      </div>
    </div>
  );
}

export async function Header() {
  let cats = [];
  try { cats = await listCategories(); } catch {}
  return (
    <header className="site-header">
      <div className="wrap nav">
        <Link className="logo" href="/">BADOU<span>DAO</span></Link>
        <nav className="menu">
          <Link href="/products/">Products</Link>
          <Link href="/oem-odm/">OEM / ODM</Link>
          <Link href="/small-batch/">Small Batch</Link>
          <Link href="/factory/">Factory</Link>
          <Link href="/quality/">Quality</Link>
          <Link href="/blog/">Guides</Link>
          <Link href="/faq/">FAQ</Link>
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
  let s = {}, cats = [];
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
