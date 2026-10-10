/**
 * Static preview renderer.
 *
 * Next.js cannot build on this machine (the SWC native binary needs the MSVC
 * runtime, which is not installed). This script renders the same markup the
 * React pages produce, straight from the local D1 export, so the design and
 * content can be reviewed in a browser before deploying.
 *
 * It is a preview only — the deployed site still runs the real Next.js app.
 */
const fs = require('fs');
const path = require('path');
const { tables, settings: S } = require('./data');

const ROOT = __dirname;
const SRC = path.join(ROOT, '..', 'src', 'app');
const OUT = path.join(ROOT, 'out');

/* ---------------------------------------------------------------- helpers */

const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const money = (n) => Number(n || 0).toFixed(2);

function groupBy(rows, key) {
  const map = {};
  for (const r of rows) (map[r[key]] ||= []).push(r);
  return map;
}

/** capacityMin === capacityMax → show a single number, otherwise show the range */
function capacityLabel() {
  return String(S.capacityMin) === String(S.capacityMax)
    ? String(S.capacityMin)
    : `${S.capacityMin}-${S.capacityMax}`;
}

const specsByProduct = groupBy(tables.product_specs || [], 'product_id');
const optionsByProduct = groupBy(tables.product_options || [], 'product_id');

const products = (tables.products || []).filter((p) => p.status === 'published');
const categories = tables.categories || [];
const pages = (tables.pages || []).filter((p) => p.status === 'published');

/* ------------------------------------------------------------ page chrome */

function topbar() {
  return `<div class="topbar"><div class="wrap">
<span>${esc(S.siteName)} · Quartz clock manufacturer · OEM / ODM small-batch production</span>
<span><b>Reply within ${esc(S.quoteHours || 12)} hours</b> · <a href="#inquiry">Get a Quote</a></span>
</div></div>`;
}

function header() {
  const links = [
    ['/products/', 'Products'],
    ['/p/oem-odm/', 'OEM / ODM'],
    ['/p/small-batch/', 'Small Batch'],
    ['/p/factory/', 'Factory'],
    ['/p/quality/', 'Quality'],
    ['/blog/', 'Blog'],
  ];
  return `<header class="site-header"><div class="wrap nav">
<a class="logo" href="/">BADOU<span>DAO</span></a>
<nav class="menu">${links.map(([h, t]) => `<a href="${h}">${t}</a>`).join('')}</nav>
<div class="nav-cta">
<a href="/products/" class="btn btn-ghost btn-sm">Browse Catalogue</a>
<a href="#inquiry" class="btn btn-primary btn-sm">Get a Quote</a>
</div></div></header>`;
}

function footer() {
  return `<footer class="site-footer"><div class="wrap">
<div class="f-grid">
<div class="f-brand">
<div class="logo">BADOU<span>DAO</span></div>
<p>${esc(S.siteName)} is a quartz clock manufacturer offering OEM and ODM wall clocks, alarm clocks,
table clocks and clock movements. Small-batch production with MOQ from ${esc(S.moq || 500)} pieces.</p>
<div class="certs" style="margin-top:20px">
<span class="cert">CE (movement)</span><span class="cert">RoHS (movement)</span>
</div>
</div>
<div><div class="f-h">Products</div><div class="f-list">
${categories.map((c) => `<a href="/products/${c.id}/">${esc(c.short || c.name)}</a>`).join('')}
</div></div>
<div><div class="f-h">Services</div><div class="f-list">
<a href="/p/oem-odm/">OEM Manufacturing</a>
<a href="/p/small-batch/">Small Batch Runs</a>
<a href="/p/quality/">Quality Control</a>
<a href="/p/certification/">Certification</a>
</div></div>
<div><div class="f-h">Company</div><div class="f-list">
<a href="/p/factory/">About the Factory</a>
<a href="/p/quality/">Quality Control</a>
<a href="/p/certification/">Compliance</a>
<a href="#inquiry">Contact</a>
</div></div>
<div><div class="f-h">Guides</div><div class="f-list">
<a href="/blog/">Buyer Guides</a>
<a href="/p/small-batch/">MOQ Explained</a>
<a href="/p/certification/">CE &amp; RoHS Guide</a>
</div></div>
</div>
<div class="f-bot">
<span>© ${new Date().getFullYear()} ${esc(S.siteName)}. All rights reserved.</span>
<span>Ex Works pricing · MOQ from ${esc(S.moq || 500)} pcs</span>
</div>
</div></footer>`;
}

/* inquiry form — static preview, submit is inert */
function inquiryForm(list, preset) {
  const options = list.slice(0, 9).map((p) => `<option>${esc(p.name)}</option>`).join('');
  return `<div class="form-card">
<div class="form-msg"></div>
${preset ? `<div class="note-box" style="margin-top:0">Preview enquiry: <strong>${esc(preset)}</strong></div>` : ''}
<form onsubmit="event.preventDefault();this.querySelector('.form-msg').className='form-msg show ok';this.querySelector('.form-msg').textContent='Preview mode — the live form posts to /api/contact.'">
<div class="fg"><label class="fl" for="if-email">Business email<span class="req">*</span></label>
<input class="inp" id="if-email" type="email" required placeholder="you@company.com"></div>
<div class="fg2">
<div class="fg"><label class="fl" for="if-name">Your name</label><input class="inp" id="if-name" placeholder="Mark Smith"></div>
<div class="fg"><label class="fl" for="if-company">Company</label><input class="inp" id="if-company" placeholder="Company Ltd"></div>
</div>
<div class="fg2">
<div class="fg"><label class="fl" for="if-country">Country</label><input class="inp" id="if-country" placeholder="Netherlands"></div>
<div class="fg"><label class="fl" for="if-qty">Estimated quantity<span class="req">*</span></label>
<select class="inp" id="if-qty" required><option value="">Select…</option><option>500 - 999</option><option>1,000 - 2,999</option><option>3,000 - 9,999</option><option>10,000+</option><option>Not sure yet</option></select></div>
</div>
${list.length ? `<div class="fg"><label class="fl" for="if-product">Product of interest</label>
<select class="inp" id="if-product"><option value="">Select a model…</option>${options}</select></div>` : ''}
<div class="fg"><label class="fl" for="if-other">Other specification</label>
<input class="inp" id="if-other" placeholder="e.g. 20-inch metal wall clock with custom dial"></div>
<div class="fg"><label class="fl">Customisation required?</label>
<div class="chk-row"><label class="chk-item"><input type="checkbox"><span>Yes, logo printing</span></label></div></div>
<div class="fg"><label class="fl" for="if-msg">Your requirements<span class="req">*</span></label>
<textarea class="inp" id="if-msg" required placeholder="Sizes, materials, packaging, target price, delivery deadline…"></textarea></div>
<button class="btn btn-primary" type="submit" style="width:100%">Send Enquiry</button>
<p class="req-note">
<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0f5c4a" stroke-width="2.4"><path d="M20 6L9 17l-5-5"/></svg>
We reply within ${esc(S.quoteHours || 12)} hours. Your details are used only to answer this enquiry.
</p>
</form></div>`;
}

function layout({ title, description, canonical, body, schema, active }) {
  const css = fs.readFileSync(path.join(SRC, 'globals.css'), 'utf8');
  const base = S.siteUrl || 'http://localhost:8788';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical || base + '/')}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${esc(canonical || base + '/')}">
<meta property="og:image" content="${base}/hero-clocks.png">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>${css}
/* product images are not uploaded yet — show a neutral placeholder */
.ph{width:100%;height:100%;min-height:150px;display:grid;place-items:center;
background:repeating-linear-gradient(45deg,#f4f5f7,#f4f5f7 10px,#eef0f2 10px,#eef0f2 20px);
color:var(--ink3);font-size:12.5px;font-weight:500;letter-spacing:.04em;border-radius:4px}
</style>
${schema ? `<script type="application/ld+json">${JSON.stringify(schema)}</script>` : ''}
</head>
<body>
${topbar()}
${header()}
${body}
${footer()}
</body></html>`;
}

function breadcrumb(items) {
  return `<nav class="breadcrumb"><div class="wrap">${items
    .map((i, n) => (n === items.length - 1 ? `<span>${esc(i.t)}</span>` : `<a href="${i.h}">${esc(i.t)}</a><span>/</span>`))
    .join('')}</div></nav>`;
}

/* --------------------------------------------------------------- sections */

function productCard(p) {
  return `<a href="/products/${p.category}/${p.slug}/" class="card">
<div class="c-visual"><div class="ph">${esc(p.id)}</div></div>
<div class="c-body">
<h3 style="font-size:17px">${esc(p.name)}</h3>
<p style="font-size:13.5px">${esc((p.summary || '').slice(0, 100))}…</p>
<div class="c-meta"><span>MOQ <b>${p.moq}</b></span>
<span class="exw">EXW $${money(p.price_min)}–${money(p.price_max)}</span></div>
</div></a>`;
}

const CAPABILITIES = [
  ['Tooling & in-house moulding', 'New tooling in 15–25 days, no subcontractor margin.'],
  ['Surface finishing', 'UV spray, electroplating, brushed and antique brass effects, hand-painting.'],
  ['Assembly & movement sourcing', 'Japan, Taiwan and China movements — you choose the accuracy-to-cost point.'],
  ['Four-stage QC', 'IQC, IPQC, FQC and OQC. Every carton checked before it leaves.'],
  ['Retail-ready packaging', 'Colour boxes, window boxes and gift sets designed to survive ocean freight.'],
];

const PROCESS = [
  ['Send your brief', 'A reference photo, a sample or a sketch is enough to start.'],
  ['Quotation', `Within ${S.quoteHours || 12} hours with pricing broken down by tooling, unit, packaging and freight.`],
  ['Sample', `${S.sampleDays || '7-10'} days. Sample cost is credited against your first bulk order.`],
  ['Bulk production', '20–45 days depending on complexity, with photo and video updates.'],
  ['Delivery', 'Ex Works by default. CIF or DDP available on request.'],
];

/* ------------------------------------------------------------------ pages */

function home() {
  const base = S.siteUrl || '';
  const shown = (products.filter((p) => p.featured).length ? products.filter((p) => p.featured) : products).slice(0, 6);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: S.siteName,
    url: base,
    email: S.email,
    telephone: S.phone,
    address: { '@type': 'PostalAddress', addressLocality: S.address, addressCountry: 'CN' },
  };

  const body = `<main id="main">
<section class="hero"><div class="wrap">
<div>
<div class="eyebrow"><span style="width:6px;height:6px;border-radius:99px;background:var(--brand)"></span>Quartz Clock Manufacturer · Small-Batch OEM</div>
<h1>Custom quartz clocks, built for <em>your brand</em></h1>
<p class="lede">Wall clocks, alarm clocks and table clocks in OEM and ODM form. MOQ from ${esc(S.moq || 500)} pieces,
custom dial artwork and packaging, and a quote back within ${esc(S.quoteHours || 12)} hours.</p>
<div class="hero-btns">
<a href="#inquiry" class="btn btn-primary">Request a Quote</a>
<a href="/products/" class="btn btn-ghost">View Products</a>
</div>
<p class="hero-note">
<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0f5c4a" stroke-width="2.4"><path d="M20 6L9 17l-5-5"/></svg>
Movements are CE and RoHS compliant · Certification arranged on request
</p>
</div>
<div class="hero-img"><img src="/hero-clocks.png" alt="Assorted quartz wall clocks manufactured by Badoudao" width="1536" height="1024"></div>
</div></section>

<div class="trust"><div class="wrap trust-grid">
<div class="trust-item"><div class="trust-num">${esc(capacityLabel())}<small>pcs</small></div><div class="trust-lab">Daily Capacity</div></div>
<div class="trust-item"><div class="trust-num"><small>${esc(S.quoteHours || 12)}</small>h</div><div class="trust-lab">Quote Response</div></div>
<div class="trust-item"><div class="trust-num">20<small>&ndash;45</small>d</div><div class="trust-lab">Lead Time</div></div>
<div class="trust-item"><div class="trust-num">7<small>&ndash;10</small>d</div><div class="trust-lab">Sample Time</div></div>
<div class="trust-item"><div class="trust-num">${esc(S.moq || 500)}<small>pcs</small></div><div class="trust-lab">Starting MOQ</div></div>
</div></div>

<section id="categories"><div class="wrap">
<div class="sec-head">
<div class="sec-tag">Product Range</div>
<h2>Wall clocks, alarm clocks and movements — factory direct</h2>
<p class="sec-sub">All categories available with custom dials, logos, hands and packaging.
Prices shown are <strong>Ex Works (factory) prices</strong> at MOQ ${esc(S.moq || 500)} — freight and duties quoted separately.</p>
</div>
<div class="grid-3">
${categories.map((c) => `<a href="/products/${c.id}/" class="card">
<div class="c-visual"><div class="ph">${esc(c.short || c.name)}</div></div>
<div class="c-body"><h3>${esc(c.name)}</h3><p>${esc(c.description || '')}</p>
<div class="c-meta"><span><b>${esc(c.designs || '')}</b> designs</span><span class="exw">EXW ${esc(c.price_range || '')}</span></div>
</div></a>`).join('')}
</div>
</div></section>

<section class="alt" id="capability"><div class="wrap split">
<div>
<div class="sec-tag">Manufacturing</div>
<h2>Everything happens under one roof</h2>
<p class="sec-sub">From moulding to finished box. Keeping the whole process in-house means faster sampling,
tighter tolerances and no surprises between you and the factory.</p>
<div class="cap-list">
${CAPABILITIES.map(([h, p], i) => `<div class="cap"><div class="cap-n">0${i + 1}</div><div><h4>${esc(h)}</h4><p>${esc(p)}</p></div></div>`).join('')}
</div>
<div class="certs">
<span class="cert">CE (movement)</span><span class="cert">RoHS (movement)</span><span class="cert">QC: IQC / IPQC / FQC / OQC</span>
</div>
<p style="font-size:13px;color:var(--ink2);margin-top:14px;line-height:1.6">
Quartz clocks themselves carry no mandatory certification requirement.
<a href="/p/certification/" style="text-decoration:underline">Read the full compliance note</a></p>
</div>
<div class="hero-img"><img src="/hero-clocks.png" alt="Badoudao clock production" width="1536" height="1024"></div>
</div></section>

<section id="process"><div class="wrap">
<div class="sec-head"><div class="sec-tag">OEM / ODM Process</div><h2>From your idea to a shipped container</h2></div>
<div class="proc">
${PROCESS.map(([h, p], i) => `<div class="proc-i"><span class="proc-n">STEP 0${i + 1}</span><h4>${esc(h)}</h4><p>${esc(p)}</p></div>`).join('')}
</div>
</div></section>

<section class="alt" id="featured"><div class="wrap">
<div class="sec-head">
<div class="sec-tag">Popular Models</div>
<h2>Where most enquiries start</h2>
<p class="sec-sub">No featured discounts — these are simply the models buyers ask about most.</p>
</div>
<div class="grid-3">${shown.map(productCard).join('')}</div>
</div></section>

<section id="inquiry"><div class="wrap">
<div class="split" style="align-items:start">
<div>
<div class="sec-tag">Request a Quote</div>
<h2 style="font-size:32px">Tell us what you need built</h2>
<p class="sec-sub">Send a reference photo, a sample or just a rough idea.
You will get a quotation within ${esc(S.quoteHours || 12)} hours — no obligation.</p>
<div class="certs" style="margin-top:32px">
<span class="cert">MOQ from ${esc(S.moq || 500)} pcs</span>
<span class="cert">Samples in ${esc(S.sampleDays || '7-10')} days</span>
<span class="cert">Ex Works pricing</span>
</div>
</div>
${inquiryForm(products)}
</div>
</div></section>
</main>`;

  return layout({
    title: `${S.siteName} — Custom Quartz Clock Manufacturer | OEM & ODM`,
    description: `OEM and ODM quartz clock manufacturer. Wall clocks, alarm clocks, table clocks and movements. MOQ from ${S.moq} pieces, Ex Works pricing.`,
    body,
    schema,
  });
}

function productsIndex() {
  const body = `<main>
<div class="page-head"><div class="wrap">
<div class="sec-tag">Product Catalogue</div>
<h1>Quartz clocks, wholesale</h1>
<p class="sec-sub">Every category is available in OEM and ODM form with custom dials, logos and retail packaging.
All prices are Ex Works (factory) — freight and duties quoted separately.</p>
</div></div>
<section><div class="wrap">
<div class="grid-3" style="margin-bottom:56px">
${categories.map((c) => `<a href="/products/${c.id}/" class="card">
<div class="c-visual"><div class="ph">${esc(c.short || c.name)}</div></div>
<div class="c-body"><h3>${esc(c.name)}</h3><p>${esc(c.description || '')}</p>
<div class="c-meta"><span><b>${esc(c.designs || '')}</b> designs</span><span class="exw">EXW ${esc(c.price_range || '')}</span></div>
</div></a>`).join('')}
</div>
<div class="sec-head"><div class="sec-tag">All Models</div><h2 style="font-size:30px">${products.length} models in production</h2></div>
<div class="grid-3">${products.map(productCard).join('')}</div>
</div></section>
<section class="alt" id="inquiry"><div class="wrap">
<div class="split" style="align-items:start">
<div><div class="sec-tag">Request a Quote</div><h2 style="font-size:32px">Tell us what you need</h2>
<p class="sec-sub">Quotation within ${esc(S.quoteHours || 12)} hours.</p></div>
${inquiryForm(products)}
</div></div></section>
</main>`;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Quartz clock wholesale catalogue',
    description: `All ${products.length} quartz clock models from ${S.siteName}.`,
    hasPart: products.map((p) => ({
      '@type': 'ListItem',
      position: products.indexOf(p) + 1,
      name: p.name,
      url: `${S.siteUrl || ''}/products/${p.category}/${p.slug}/`,
    })),
  };

  return layout({
    title: `Quartz Clock Wholesale & OEM Catalogue | ${S.siteName}`,
    description: `Browse ${products.length} quartz clock models from ${S.siteName}. Wall, alarm, desk and metal clocks plus clock movements. Ex Works pricing, MOQ from ${S.moq} pcs.`,
    body,
    schema,
  });
}

function categoryPage(cat) {
  const list = products.filter((p) => p.category === cat.id);
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${cat.name} wholesale`,
    description: cat.description,
    hasPart: list.map((p) => ({ '@type': 'Product', name: p.name, sku: p.id })),
  };

  const body = `<main>
${breadcrumb([{ t: 'Home', h: '/' }, { t: 'Products', h: '/products/' }, { t: cat.short || cat.name }])}
<div class="page-head"><div class="wrap">
<div class="sec-tag">${esc(cat.short || cat.name)} · Wholesale &amp; OEM</div>
<h1>${esc(cat.name)} — wholesale &amp; OEM manufacturer</h1>
<p class="sec-sub">Looking for a ${esc((cat.short || cat.name).toLowerCase())} supplier? Badoudao manufactures in-house
with MOQ from ${esc(S.moq || 500)} pieces, custom dial artwork and retail-ready packaging.
Ex Works pricing shown — freight and duties quoted separately.</p>
</div></div>
<section><div class="wrap">
<div class="sec-head"><div class="sec-tag">Available Models</div>
<h2 style="font-size:30px">${list.length} ${list.length === 1 ? 'model' : 'models'} in production</h2>
<p class="sec-sub">Prices are per piece Ex Works. Larger orders step down.</p></div>
${list.length
  ? `<div class="grid-3">${list.map(productCard).join('')}</div>`
  : `<p style="color:var(--ink3)">Models in this category are being added. <a href="#inquiry" style="color:var(--brand)">Send us your requirement</a> and we will quote.</p>`}
</div></section>
<section class="alt" id="inquiry"><div class="wrap">
<div class="split" style="align-items:start">
<div><div class="sec-tag">Request a Quote</div><h2 style="font-size:32px">Tell us what you need</h2>
<p class="sec-sub">Send a reference photo or a sample. Quotation within ${esc(S.quoteHours || 12)} hours.</p></div>
${inquiryForm(list.length ? list : products)}
</div></div></section>
</main>`;

  return layout({
    title: `${cat.name} Wholesale & OEM Manufacturer | ${S.siteName}`,
    description: `${cat.name} from ${S.siteName}. ${cat.description || ''} MOQ from ${S.moq} pcs, Ex Works pricing, custom dials and retail packaging.`,
    body,
    schema,
  });
}

function productPage(p) {
  const specs = specsByProduct[p.id] || [];
  const options = optionsByProduct[p.id] || [];
  const others = products.filter((x) => x.category === p.category && x.id !== p.id).slice(0, 4);
  const base = S.siteUrl || '';

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    sku: p.id,
    description: p.summary,
    offers: {
      '@type': 'Offer',
      availability: 'https://schema.org/InStock',
      priceCurrency: 'USD',
      url: `${base}/products/${p.category}/${p.slug}/`,
    },
  };

  const body = `<main>
${breadcrumb([{ t: 'Home', h: '/' }, { t: 'Products', h: '/products/' }, { t: p.category, h: `/products/${p.category}/` }, { t: p.name }])}
<section><div class="wrap">
<div class="pd">
<div class="pd-gallery"><div class="ph" style="height:100%">${esc(p.id)}</div></div>
<div class="pd-info">
<h1>${esc(p.name)}</h1>
<p style="font-size:16px;color:var(--ink2)">${esc(p.summary || '')}</p>
<div class="pd-price">
<span class="amt">$${money(p.price_min)}–$${money(p.price_max)}</span>
<span class="lbl">Ex Works (factory price)<br>per piece, before freight</span>
</div>
<dl class="pd-facts">
<div class="pd-fact"><dt>Model / SKU</dt><dd>${esc(p.id)}</dd></div>
<div class="pd-fact"><dt>Minimum order</dt><dd>${p.moq} pcs</dd></div>
<div class="pd-fact"><dt>Lead time</dt><dd>${esc(p.lead_time || '')}</dd></div>
<div class="pd-fact"><dt>Sample time</dt><dd>${esc(S.sampleDays || '7-10')} days</dd></div>
${p.move_level ? `<div class="pd-fact"><dt>Movement</dt><dd>${esc(p.move_level)}</dd></div>` : ''}
</dl>
<div class="cta-panel" style="margin-bottom:26px">
<h3>Request pricing for ${esc(p.id)}</h3>
<p>Tell us your quantity and whether you need custom artwork. We reply within ${esc(S.quoteHours || 12)} hours.</p>
<a href="#inquiry" class="btn btn-primary" style="width:100%">Get a Quote for this Model</a>
</div>
${options.length ? `<h3 style="font-family:var(--sans);font-size:16px;margin-bottom:10px">Customisation available</h3>
<div class="chip-list" style="margin-bottom:26px">
${options.map((o) => `<span class="badge badge-brand">${esc(o.label)}${o.price_delta > 0 ? ` (+$${money(o.price_delta)})` : ''}</span>`).join('')}
</div>` : ''}
</div>
</div>
</div></section>

${specs.length ? `<section class="alt"><div class="wrap split">
<div><div class="sec-tag">Specifications</div><h2 style="font-size:28px">Technical detail</h2>
<table class="spec-table" style="margin-top:20px"><tbody>
${specs.map((s) => `<tr><th scope="row">${esc(s.label)}</th><td>${esc(s.value)}</td></tr>`).join('')}
</tbody></table></div>
<div><div class="sec-tag">Price tiers</div>
<table class="spec-table" style="margin-top:20px"><tbody>
${(tables.product_prices || []).filter((t) => t.product_id === p.id).map((t) => `<tr><th scope="row">${t.min_qty}${t.max_qty ? ` – ${t.max_qty}` : '+'} pcs</th><td>$${money(t.unit_price)}</td></tr>`).join('') || '<tr><td colspan="2">Standard pricing — ask for a quote.</td></tr>'}
</tbody></table></div>
</div></section>` : ''}

${others.length ? `<section><div class="wrap">
<div class="sec-head"><div class="sec-tag">Related</div><h2 style="font-size:30px">Other models in production</h2></div>
<div class="related-grid">${others.map(productCard).join('')}</div>
</div></section>` : ''}

<section id="inquiry" style="background:var(--bg2)"><div class="wrap">
<div class="split" style="align-items:start">
<div><div class="sec-tag">Request a Quote</div><h2 style="font-size:32px">Get pricing for ${esc(p.id)}</h2>
<p class="sec-sub">Quantity, customisation and delivery expectations — send them over.</p></div>
${inquiryForm(others.length ? others : [p], p.name)}
</div></div></section>
</main>`;

  return layout({
    title: `${p.name} — OEM Quartz Clock | ${S.siteName}`,
    description: `${p.name}. ${(p.summary || '').slice(0, 120)} MOQ ${p.moq} pcs, Ex Works $${money(p.price_min)}–$${money(p.price_max)}.`,
    body,
    schema,
  });
}

function staticPage(page) {
  const body = `<main>
${breadcrumb([{ t: 'Home', h: '/' }, { t: page.heading || page.title }])}
<div class="page-head"><div class="wrap">
<div class="sec-tag">${esc(page.title)}</div>
<h1>${esc(page.heading || page.title)}</h1>
${page.intro ? `<p class="sec-sub">${esc(page.intro)}</p>` : ''}
</div></div>
<section><div class="wrap">
<div class="content-block">
${page.body || `<p style="color:var(--ink3)">Content not written yet. Add it in the CMS under Pages.</p>`}
</div>
</div></section>
<section class="alt" id="inquiry"><div class="wrap">
<div class="split" style="align-items:start">
<div><div class="sec-tag">Request a Quote</div><h2 style="font-size:32px">Ready to talk numbers?</h2>
<p class="sec-sub">Send your requirement. We reply within ${esc(S.quoteHours || 12)} hours
with a breakdown of tooling, unit price, packaging and freight.</p>
<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:24px">
${categories.map((c) => `<a href="/products/${c.id}/" class="badge badge-brand">${esc(c.short || c.name)}</a>`).join('')}
</div></div>
${inquiryForm(products)}
</div></div></section>
</main>`;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.heading || page.title,
    description: page.seo_description || page.intro || '',
    url: `${S.siteUrl || ''}/p/${page.id}/`,
    publisher: { '@type': 'Organization', name: S.siteName },
  };

  return layout({
    title: page.seo_title || `${page.heading || page.title} | ${S.siteName}`,
    description: page.seo_description || page.intro || '',
    body,
    schema,
  });
}

/* ------------------------------------------------------------------ build */

function write(route, html) {
  const file = route === '/' ? path.join(OUT, 'index.html') : path.join(OUT, route, 'index.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html, 'utf8');
  return route;
}

function main() {
  /* overwrite in place — the safe-delete shim blocks rmSync on this machine */
  fs.mkdirSync(OUT, { recursive: true });

  const written = [];
  written.push(write('/', home()));
  written.push(write('/products/', productsIndex()));

  for (const c of categories) written.push(write(`/products/${c.id}/`, categoryPage(c)));
  for (const p of products) written.push(write(`/products/${p.category}/${p.slug}/`, productPage(p)));
  for (const p of pages) written.push(write(`/p/${p.id}/`, staticPage(p)));

  /* copy public assets */
  const pub = path.join(ROOT, '..', 'public');
  const copy = (from, to) => {
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
  };
  for (const f of fs.readdirSync(pub)) {
    if (f === '_headers' || f === 'robots.txt') continue;
    copy(path.join(pub, f), path.join(OUT, f));
  }

  console.log(`Rendered ${written.length} pages -> preview/out/\n`);
  written.forEach((r) => console.log('  ' + r));
}

main();