import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import "../globals.css";

const siteUrl = "https://www.findfreeparking.info";

import { routing } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import JsonLd from "@/components/JsonLd";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "HomePage" });

  const alternates: Record<string, string> = {};
  routing.locales.forEach((l) => {
    alternates[l] = `/${l}`;
  });

  return {
    metadataBase: new URL(siteUrl),
    title: {
      template: `%s | ${t("title")}`,
      default: t("title"),
    },
    description: t("metaDescription"),
    keywords: t("metaKeywords"),
    openGraph: {
      type: "website",
      locale: locale,
      url: `${siteUrl}/${locale}`,
      title: t("title"),
      siteName: t("title"),
    },
    alternates: {
      canonical: `/${locale}`,
      languages: alternates,
    },
  };
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className="antialiased">
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());

              gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
            `}
            </Script>
          </>
        )}

        <NextIntlClientProvider messages={messages}>
          {children}
          <JsonLd />
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
