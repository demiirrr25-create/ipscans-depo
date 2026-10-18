import type { Metadata, Viewport } from "next";
import { Google_Sans_Flex, Google_Sans_Code } from "next/font/google";
import { notFound } from "next/navigation";
import "../globals.css";
import { isLocale, locales, ogLocales, localeTags } from "@/i18n/config";
import { getDictionary, getPublicDictionary } from "@/i18n/dictionaries";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { GoogleTag } from "@/components/GoogleTag";
import { CookieConsent } from "@/components/CookieConsent";
import { localizedAlternates } from "@/lib/seo";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";

const flex = Google_Sans_Flex({
  variable: "--font-flex",
  subsets: ["latin", "latin-ext"],
  axes: ["opsz"],
  display: "swap",
});

const code = Google_Sans_Code({
  variable: "--font-code",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return {
    title: {
      default: dict.meta.title,
      template: `%s — ipscans`,
    },
    description: dict.meta.description,
    applicationName: "ipscans",
    metadataBase: new URL("https://ipscans.com"),
    alternates: localizedAlternates(locale, ""),
    // Explicit opt-in to larger snippet/image previews in Google results,
    // which improves click-through rate (an indirect ranking signal).
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    // Search-engine site-verification meta tags — set these env vars once
    // the Search Console / Bing Webmaster Tools properties are created.
    verification: {
      google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
      other: {
        ...(process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
          ? { "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION }
          : {}),
        ...(process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID
          ? { "google-adsense-account": process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID }
          : {}),
      },
    },
    openGraph: {
      type: "website",
      siteName: "ipscans",
      title: dict.meta.title,
      description: dict.meta.description,
      url: `https://ipscans.com/${locale}`,
      locale: ogLocales[locale],
    },
    twitter: {
      card: "summary",
      title: dict.meta.title,
      description: dict.meta.description,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  // Optional comma-separated list of social/profile URLs (e.g. X, LinkedIn,
  // GitHub) — set NEXT_PUBLIC_SAME_AS to strengthen entity recognition for
  // Google Knowledge Graph and AI answer engines.
  const sameAs = (process.env.NEXT_PUBLIC_SAME_AS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://ipscans.com/#organization",
        name: "ipscans",
        url: "https://ipscans.com",
        // Opaque dark-background render — a bare white-on-transparent SVG
        // isn't reliably indexed as a logo by Google's structured data.
        logo: {
          "@type": "ImageObject",
          url: "https://ipscans.com/api/logo",
          width: 512,
          height: 512,
        },
        image: "https://ipscans.com/api/logo",
        ...(sameAs.length ? { sameAs } : {}),
      },
      {
        "@type": "WebSite",
        "@id": "https://ipscans.com/#website",
        name: "ipscans",
        url: "https://ipscans.com",
        publisher: { "@id": "https://ipscans.com/#organization" },
        inLanguage: localeTags[locale],
      },
    ],
  };

  return (
    <html
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      className={`${flex.variable} ${code.variable} h-full antialiased`}
    >
      <head />
      <body className="flex min-h-full flex-col bg-surface text-ink">
        {(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || process.env.NEXT_PUBLIC_GOOGLE_ADS_ID) && (
          <Script id="google-consent-default" strategy="beforeInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('consent', 'default', {
                ad_storage: 'denied',
                ad_user_data: 'denied',
                ad_personalization: 'denied',
                analytics_storage: 'denied',
                wait_for_update: 500
              });
            `}
          </Script>
        )}
        <script
          type="application/ld+json"
          // Static, code-defined structured data — safe to inject directly.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-5 focus:py-2.5 focus:text-sm focus:font-medium focus:text-white"
        >
          {dict.a11y.skipToContent}
        </a>
        <Header locale={locale} dict={getPublicDictionary(locale)} />
        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 outline-none">
          {children}
        </main>
        <Footer locale={locale} dict={dict} />
        {process.env.VERCEL && <Analytics />}
        {process.env.VERCEL && <SpeedInsights />}
        <GoogleTag />
        <CookieConsent dict={dict.cookieConsent} />
      </body>
    </html>
  );
}
