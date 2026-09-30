import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import { notFound } from "next/navigation";
import "../globals.css";
import { isLocale, locales, defaultLocale, ogLocales, localeTags } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AuroraBackground } from "@/components/AuroraBackground";
import { GoogleTag } from "@/components/GoogleTag";
import { CookieConsent } from "@/components/CookieConsent";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

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
    alternates: {
      canonical: `/${locale}`,
      languages: {
        ...Object.fromEntries(locales.map((l) => [l, `/${l}`])),
        "x-default": `/${defaultLocale}`,
      },
    },
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
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col text-white">
        <script
          type="application/ld+json"
          // Static, code-defined structured data — safe to inject directly.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-black"
        >
          {dict.a11y.skipToContent}
        </a>
        <AuroraBackground />
        <Header locale={locale} dict={dict} />
        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1">
          {children}
        </main>
        <Footer locale={locale} dict={dict} />
        <Analytics />
        <SpeedInsights />
        <GoogleTag />
        <CookieConsent dict={dict} />
      </body>
    </html>
  );
}
