const fs=require('fs');
const f='src/app/products/[category]/[slug]/page.tsx';
let lines=fs.readFileSync(f,'utf8').split('\n');
const start=lines.findIndex(l=>l.includes('export async function generateMetadata'));
const end=lines.findIndex((l,i)=>i>start && l.startsWith('export default'));
const real=[
'/**',
' * Per-product metadata.',
' *',
' * The admin\'s seo_title / seo_description win when set; otherwise both are',
' * built from the price band and MOQ, which is what a buyer searches on.',
' * The Product JSON-LD further down the page is what marks this as a',
' * product — og:type has no "product" member, and passing one made Next',
' * discard this whole object.',
' */',
'export async function generateMetadata({ params }) {',
'  const { category, slug } = params;',
'',
'  try {',
'    const product = await getProduct(slug, { includeDrafts: false }).catch(() => null);',
'',
'    if (!product || product.category !== category) {',
'      return { title: `Product | Badoudao`, robots: { index: false } };',
'    }',
'',
'    const moq = product.moq || 500;',
'    const price = product.priceMin',
'      ? ` EXW $${product.priceMin.toFixed(2)}–$${product.priceMax.toFixed(2)}.`',
'      : \'\';',
'',
'    return buildMeta({',
'      title: `${product.name} | OEM Quartz Clock Manufacturer | Badoudao`,',
'      description:',
'        `${product.name} — ${product.summary || \'\'} MOQ ${moq} pcs.${price}` +',
'        ` ${product.leadTime || \'20-30 days\'} lead time, custom dial artwork available.`,',
'      seoTitle: product.seoTitle,',
'      seoDescription: product.seoDescription,',
'      keywords: product.metaKeywords,',
'      path: `/products/${category}/${product.slug}`,',
'      image: product.images[0]?.url',
'    });',
'  } catch (err) {',
'    /* Contained on purpose: a throw here leaves the page rendering with no',
'       title at all, which is invisible from the front end. */',
'    console.error(\'generateMetadata failed:/', (err as Error)?.message);',
'    return {',
'      title: `${slug} | Badoudao Quartz Clocks`,',
'      description:',
'        \'OEM and ODM quartz clocks from Badoudao. MOQ from 500 pieces, Ex Works pricing.\'',
'    };',
'  }',
'}',
''
];
lines=[...lines.slice(0,start),...real,...lines.slice(end)];
fs.writeFileSync(f,lines.join('\n'));
console.log('已恢复正式实现');
