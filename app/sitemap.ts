import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://findfreeparking.ca",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    // We could add more dynamic routes here if we had them (e.g. /city/vancouver)
  ];
}
