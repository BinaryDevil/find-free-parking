import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = "https://www.findfreeparking.info";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Find Free Parking - Canada",
  description:
    "Find free and paid parking spots in Vancouver, Coquitlam, and other Canadian cities. Real-time map with rates, time limits, and street parking info.",
  keywords: [
    "free parking",
    "parking map",
    "Vancouver parking",
    "Coquitlam parking",
    "street parking",
    "Canada parking",
    "cheap parking",
  ],
  authors: [{ name: "Find Free Parking" }],
  creator: "Find Free Parking",
  openGraph: {
    type: "website",
    locale: "en_CA",
    url: siteUrl,
    title: "Find Free Parking - Canada",
    description:
      "Find free and paid parking spots in Vancouver, Coquitlam, and other Canadian cities.",
    siteName: "Find Free Parking",
  },
  twitter: {
    card: "summary_large_image",
    title: "Find Free Parking - Canada",
    description:
      "Find free and paid parking spots in Vancouver, Coquitlam, and other Canadian cities.",
  },
  appleWebApp: {
    capable: true,
    title: "Free Parking",
    statusBarStyle: "black-translucent",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-F04D2JVCQ5"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-F04D2JVCQ5');
          `}
        </Script>

        {children}
      </body>
    </html>
  );
}
