import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, locales } from "@/i18n/config";
import { scannerApplication } from "@/content/applications";
import { localizedAlternates } from "@/lib/seo";
import { ProductShowcase } from "@/components/product/ProductShowcase";

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
  return {
    title: scannerApplication.name,
    description: scannerApplication.description[locale],
    alternates: localizedAlternates(locale, "/applications/scanner"),
    openGraph: {
      title: `${scannerApplication.name} — IPScans`,
      description: scannerApplication.description[locale],
      url: `https://ipscans.com/${locale}/applications/scanner`,
    },
    twitter: {
      title: `${scannerApplication.name} — IPScans`,
      description: scannerApplication.description[locale],
    },
  };
}

export default async function IpScannerPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <ProductShowcase
      product="scanner"
      locale={locale}
      canonicalPath="/applications/scanner"
    />
  );
}
