import { notFound } from "next/navigation";
import MainMap from "@/components/MainMap";
import { getCityBySlug } from "@/lib/cities";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";

interface Props {
  params: Promise<{ locale: string; city: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale, city } = await params;
  const cityInfo = getCityBySlug(city);
  if (!cityInfo) return {};

  const t = await getTranslations({ locale, namespace: "HomePage" });

  const alternates: Record<string, string> = {};
  routing.locales.forEach((l) => {
    alternates[l] = `/${l}/${city}`;
  });

  return {
    title: `${t("title")} - ${cityInfo.name}`,
    description: `${cityInfo.name} parking map. ${t("metaDescription")}`,
    keywords: `${cityInfo.name} parking, ${t("metaKeywords")}`,
    alternates: {
      canonical: `/${locale}/${city}`,
      languages: alternates,
    },
  };
}

export default async function CityPage({ params }: Props) {
  const { city } = await params;
  const cityInfo = getCityBySlug(city);

  if (!cityInfo) {
    notFound();
  }

  return (
    <MainMap
      initialCenter={cityInfo.center}
      initialZoom={cityInfo.zoom}
      cityName={cityInfo.name}
    />
  );
}
