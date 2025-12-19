import { routing } from "@/i18n/routing";
import { SUPPORTED_CITIES } from "@/lib/cities";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ??
  "https://www.findfreeparking.info";

const lastModified = new Date().toISOString().split("T")[0]; // YYYY-MM-DD for sitemap compatibility

const baseHeaders = {
  "Content-Type": "application/xml; charset=utf-8",
  "Cache-Control": "public, max-age=0, s-maxage=86400, must-revalidate",
};

function buildUrl(
  loc: string,
  changefreq: "daily" | "weekly",
  priority: 1 | 0.8,
): string {
  return [
    "  <url>",
    `    <loc>${loc}</loc>`,
    `    <lastmod>${lastModified}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority.toFixed(1)}</priority>`,
    "  </url>",
  ].join("\n");
}

export async function GET() {
  const urls: string[] = [];

  for (const locale of routing.locales) {
    urls.push(buildUrl(`${siteUrl}/${locale}`, "daily", 1));

    for (const city of SUPPORTED_CITIES) {
      urls.push(buildUrl(`${siteUrl}/${locale}/${city.slug}`, "weekly", 0.8));
    }
  }

  // Root without locale
  urls.push(buildUrl(siteUrl, "daily", 1));

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">',
    ...urls,
    "</urlset>",
  ].join("\n");

  return new Response(xml, {
    status: 200,
    headers: baseHeaders,
  });
}
