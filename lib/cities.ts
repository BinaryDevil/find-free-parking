import { query } from './db';
import { coverageAreas } from './coverage';

// Existing city navigation only. These locations never establish Coverage.
const CITY_NAVIGATION: { name: string; slug: string; center: [number, number] }[] = [
  { name: 'Vancouver', slug: 'vancouver', center: [-123.1207, 49.2827] },
  { name: 'Seattle', slug: 'seattle', center: [-122.3321, 47.6062] },
  { name: 'Richmond', slug: 'richmond', center: [-123.1368, 49.1666] },
  { name: 'Burnaby', slug: 'burnaby', center: [-122.9805, 49.2488] },
  { name: 'Surrey', slug: 'surrey', center: [-122.849, 49.1913] },
  { name: 'New Westminster', slug: 'new-westminster', center: [-122.9109, 49.2057] },
  { name: 'Coquitlam', slug: 'coquitlam', center: [-122.7932, 49.2838] },
  { name: 'North Vancouver', slug: 'north-vancouver', center: [-123.0724, 49.3197] },
  { name: 'West Vancouver', slug: 'west-vancouver', center: [-123.1594, 49.3283] },
  { name: 'Delta', slug: 'delta', center: [-123.0456, 49.0911] },
  { name: 'Langley', slug: 'langley', center: [-122.6587, 49.1042] },
  { name: 'White Rock', slug: 'white-rock', center: [-122.8023, 49.0253] },
  { name: 'Port Coquitlam', slug: 'port-coquitlam', center: [-122.7785, 49.2625] },
  { name: 'Redmond', slug: 'redmond', center: [-122.1215, 47.674] },
  { name: 'Kirkland', slug: 'kirkland', center: [-122.2059, 47.6769] },
  { name: 'Bellevue', slug: 'bellevue', center: [-122.2015, 47.6101] },
  { name: 'Maple Ridge', slug: 'maple-ridge', center: [-122.6, 49.2167] },
  { name: 'Council Bluffs', slug: 'council-bluffs', center: [-95.8608, 41.2619] },
  { name: 'Ashburn', slug: 'ashburn', center: [-77.4875, 39.0437] },
  { name: 'Boardman', slug: 'boardman', center: [-119.7006, 45.8399] },
  { name: 'New York', slug: 'new-york', center: [-74.006, 40.7143] },
  { name: 'Aspen', slug: 'aspen', center: [-106.8175, 39.1911] },
  { name: 'Warsaw', slug: 'warsaw', center: [21.0175, 52.237] },
  { name: 'Amsterdam', slug: 'amsterdam', center: [4.8971, 52.378] },
];

export async function getCityBySlug(slug: string) {
  const normalized = slug.toLowerCase();
  const area = (await coverageAreas(query)).find(area => area.slug === normalized);
  if (area) return area;
  const navigation = CITY_NAVIGATION.find(city => city.slug === normalized);
  return navigation ? { ...navigation, level: 'none' as const, declaredSubset: null } : undefined;
}
