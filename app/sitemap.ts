import { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { SUPPORTED_CITIES } from "@/lib/cities";

// Generate a static sitemap and let the CDN cache it for a day
export const dynamic = "force-static";
export const revalidate = 60 * 60 * 24; // 24 hours

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ??
  "https://www.findfreeparking.info";
const lastModified = new Date();

export default function sitemap(): MetadataRoute.Sitemap {
  const sitemapEntries: MetadataRoute.Sitemap = [];

  // Add home page for each locale
  for (const locale of routing.locales) {
    sitemapEntries.push({
      url: `${siteUrl}/${locale}`,
      lastModified,
      changeFrequency: "daily",
      priority: 1,
    });

    // Add city pages for each locale
    for (const city of SUPPORTED_CITIES) {
      sitemapEntries.push({
        url: `${siteUrl}/${locale}/${city.slug}`,
        lastModified,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  }

  // Also include the root URL if consistent
  sitemapEntries.push({
    url: siteUrl,
    lastModified,
    changeFrequency: "daily",
    priority: 1,
  });

  return sitemapEntries;
}
