import { query } from './db';
import { coverageAreas } from './coverage';

export async function getCityBySlug(slug: string) {
  return (await coverageAreas(query)).find(area => area.slug === slug.toLowerCase());
}
