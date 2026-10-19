import { query } from '@/lib/db';
import { coverageAreas } from '@/lib/coverage';

export default async function JsonLd() {
  const areas = (await coverageAreas(query)).filter(area => area.level !== 'none');
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Find Free Parking",
    url: "https://www.findfreeparking.info",
    spatialCoverage: areas.map(area => ({
      '@type': 'Place',
      name: area.name,
      description: area.level === 'partial' ? area.declaredSubset : undefined,
      url: `https://www.findfreeparking.info/en/${area.slug}`,
    })),
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate:
          "https://www.findfreeparking.info/search?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
    />
  );
}
