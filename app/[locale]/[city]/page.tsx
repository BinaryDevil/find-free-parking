import { notFound } from "next/navigation";
import MainMap from "@/components/MainMap";
import { getCityBySlug } from "@/lib/cities";
import { query } from "@/lib/db";
import { cityNoRestrictionFound, type NrfCitySummary } from "@/lib/no-restriction-found-city";
import { measurementText, missingCategoriesText } from "@/components/parking-map/no-restriction-found";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";

interface Props {
  params: Promise<{ locale: string; city: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale, city } = await params;
  const cityInfo = await getCityBySlug(city);
  if (!cityInfo) return {};

  const t = await getTranslations({ locale, namespace: "HomePage" });
  const coverageText = cityInfo.level === 'none' ? t('cityNotCovered', { city: cityInfo.name }) :
    cityInfo.level === 'full' ? t('cityFullCoverage', { city: cityInfo.name }) :
    t('cityPartialCoverage', { city: cityInfo.name, subset: cityInfo.declaredSubset ?? '' });

  const alternates: Record<string, string> = {};
  routing.locales.forEach((l) => {
    alternates[l] = `/${l}/${city}`;
  });

  return {
    title: `${t("title")} - ${coverageText}`,
    description: `${coverageText}. ${t("metaDescription")}`,
    robots: { index: cityInfo.level !== 'none' },
    keywords: `${cityInfo.name} parking, ${t("metaKeywords")}`,
    alternates: {
      canonical: `/${locale}/${city}`,
      languages: alternates,
    },
  };
}

export default async function CityPage({ params }: Props) {
  const { city, locale } = await params;
  const cityInfo = await getCityBySlug(city);

  if (!cityInfo) {
    notFound();
  }
  const t = await getTranslations({ locale, namespace: "HomePage" });
  const coverageText = cityInfo.level === 'none' ? t('cityNotCovered', { city: cityInfo.name }) :
    cityInfo.level === 'full' ? t('cityFullCoverage', { city: cityInfo.name }) :
    t('cityPartialCoverage', { city: cityInfo.name, subset: cityInfo.declaredSubset ?? '' });
  // Nothing stores a city's measurement summary yet; loading it on the server
  // is a follow-up. Until then the No Restriction Found line stays dark.
  const storedSummary: NrfCitySummary | null = null;
  const nrf = 'id' in cityInfo ? await cityNoRestrictionFound(query, cityInfo.id, storedSummary) : null;
  const nrfLines = nrf ? [t('cityNoRestrictionFound'), measurementText(nrf.measurement, t),
    missingCategoriesText(nrf.missingCategories, t, locale)].filter((line): line is string => !!line) : undefined;

  return (
    <MainMap
      initialCenter={cityInfo.center}
      initialZoom={14}
      cityName={cityInfo.name}
      cityCoverageText={coverageText}
      cityNoRestrictionFoundLines={nrfLines}
    />
  );
}
