import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
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
  const t = getDictionary(locale).ipcast;
  return {
    title: t.title,
    description: t.subtitle,
    alternates: localizedAlternates(locale, "/applications/ipcast"),
    openGraph: {
      title: `${t.title} — IPScans`,
      description: t.subtitle,
      url: `https://ipscans.com/${locale}/applications/ipcast`,
    },
    twitter: {
      title: `${t.title} — IPScans`,
      description: t.subtitle,
    },
  };
}

export default async function IpCastPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  return (
    <ProductShowcase
      product="ipcast"
      locale={locale}
      canonicalPath="/applications/ipcast"
    />
  );
}
