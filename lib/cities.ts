export interface CityInfo {
  name: string;
  slug: string;
  center: [number, number]; // [lng, lat]
  zoom: number;
}

export const SUPPORTED_CITIES: CityInfo[] = [
  {
    name: "Vancouver",
    slug: "vancouver",
    center: [-123.1207, 49.2827],
    zoom: 15,
  },
  { name: "Seattle", slug: "seattle", center: [-122.3321, 47.6062], zoom: 14 },
  {
    name: "Richmond",
    slug: "richmond",
    center: [-123.1368, 49.1666],
    zoom: 14,
  },
  { name: "Burnaby", slug: "burnaby", center: [-122.9805, 49.2488], zoom: 14 },
  { name: "Surrey", slug: "surrey", center: [-122.849, 49.1913], zoom: 13 },
  {
    name: "New Westminster",
    slug: "new-westminster",
    center: [-122.9109, 49.2057],
    zoom: 14,
  },
  {
    name: "Coquitlam",
    slug: "coquitlam",
    center: [-122.7932, 49.2838],
    zoom: 14,
  },
  {
    name: "North Vancouver",
    slug: "north-vancouver",
    center: [-123.0724, 49.3197],
    zoom: 14,
  },
  {
    name: "West Vancouver",
    slug: "west-vancouver",
    center: [-123.1594, 49.3283],
    zoom: 14,
  },
  { name: "Delta", slug: "delta", center: [-123.0456, 49.0911], zoom: 13 },
  { name: "Langley", slug: "langley", center: [-122.6587, 49.1042], zoom: 14 },
  {
    name: "White Rock",
    slug: "white-rock",
    center: [-122.8023, 49.0253],
    zoom: 15,
  },
  {
    name: "Port Coquitlam",
    slug: "port-coquitlam",
    center: [-122.7785, 49.2625],
    zoom: 14,
  },
  { name: "Redmond", slug: "redmond", center: [-122.1215, 47.674], zoom: 14 },
  {
    name: "Kirkland",
    slug: "kirkland",
    center: [-122.2059, 47.6769],
    zoom: 14,
  },
  {
    name: "Bellevue",
    slug: "bellevue",
    center: [-122.2015, 47.6101],
    zoom: 14,
  },
];

export function getCityBySlug(slug: string): CityInfo | undefined {
  return SUPPORTED_CITIES.find((c) => c.slug === slug.toLowerCase());
}
