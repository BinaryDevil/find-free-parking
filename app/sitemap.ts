import { MetadataRoute } from "next";

const siteUrl = "https://www.findfreeparking.info";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    // We could add more dynamic routes here if we had them (e.g. /city/vancouver)
  ];
}
