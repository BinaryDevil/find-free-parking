import { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { SUPPORTED_CITIES } from "@/lib/cities";

const siteUrl = "https://www.findfreeparking.info";

export default function sitemap(): MetadataRoute.Sitemap {
  const sitemapEntries: MetadataRoute.Sitemap = [];

  // Add home page for each locale
  for (const locale of routing.locales) {
    sitemapEntries.push({
      url: `${siteUrl}/${locale}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    });

    // Add city pages for each locale
    for (const city of SUPPORTED_CITIES) {
      sitemapEntries.push({
        url: `${siteUrl}/${locale}/${city.slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  }

  // Also include the root URL if consistent
  sitemapEntries.push({
    url: siteUrl,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 1,
  });

  return sitemapEntries;
}
