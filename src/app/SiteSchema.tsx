import type { SiteSettings } from '@/lib/db';

/**
 * The site-wide structured data — §7.2 of the specification.
 *
 * One component, used by every page, rather than a block of JSON-LD
 * written out per page. The three pages that carried a schema each had
 * their own slightly different Organization object, which is how three
 * descriptions of the same company end up disagreeing with each other
 * in Google's panel.
 *
 * The @graph form is what the specification asks for: an Organization
 * and a WebSite that reference each other by @id, so the two are
 * connected rather than two unrelated things on the same page.
 *
 * Everything that could be wrong is read from the settings row rather
 * than written here. The telephone and the email address are the two
 * that matter most — a schema that says a number nobody answers is
 * worse than no schema, because it is an advert for a number nobody
 * answers.
 */
export function SiteSchema({ s }: { s: SiteSettings }) {
  const site = String(s.siteUrl || 'https://oemwallclocks.com').replace(/\/+$/, '');
  const origin = site.replace(/^https?:\/\//, '');

  const address = String(s.address || 'Xiamen, Fujian, China');
  const [, city, region] = address.split(',').map((x) => x.trim());

  const phone = String(s.phone || '').trim();
  const email = String(s.email || '').trim();

  const graph: Record<string, unknown>[] = [
    {
      '@type': 'Organization',
      '@id': `${site}/#organization`,
      name: 'Xiamen Chengmaomao Creative Home Furnishings Co., Ltd.',
      alternateName: 'OEMWALLCLOCKS',
      url: site,
      /* The logo is the one file that actually exists. The specification
         names /assets/logo.png, which was never created, and a schema
         pointing at a missing image is a broken reference in the search
         panel. */
      logo: `${site}/favicon.svg`,
      description:
        'Precision agile wall clock OEM/ODM manufacturing for modern global brands. ' +
        'Flexible MOQ 300, 24h 3D CAD rendering, and 1.2m drop-tested packaging.',
      address: {
        '@type': 'PostalAddress',
        addressLocality: city || 'Xiamen',
        addressRegion: region || 'Fujian',
        addressCountry: 'CN'
      },
      ...(phone || email
        ? {
            contactPoint: {
              '@type': 'ContactPoint',
              ...(phone ? { telephone: phone } : {}),
              contactType: 'sales',
              ...(email ? { email } : {}),
              availableLanguage: ['English', 'Chinese']
            }
          }
        : {})
    },
    {
      '@type': 'WebSite',
      '@id': `${site}/#website`,
      url: site,
      name: 'OEMWALLCLOCKS',
      publisher: {
        '@id': `${site}/#organization`
      }
    }
  ];

  return (
    <script
      type="application/ld+json"
      /* The JSON is built from settings values, and a stray quote in a
         company name would end the script tag early. */
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })
      }}
    />
  );
}
