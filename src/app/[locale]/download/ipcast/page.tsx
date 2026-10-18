import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { localizedAlternates } from "@/lib/seo";
import { ProductShowcase } from "@/components/product/ProductShowcase";

type Props = { params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const product = getDictionary(locale).ipcast;
  return {
    title: product.title,
    description: product.subtitle,
    alternates: localizedAlternates(locale, "/applications/ipcast"),
    openGraph: {
      title: `${product.title} — IPScans`,
      description: product.subtitle,
      url: `https://ipscans.com/${locale}/applications/ipcast`,
    },
    twitter: {
      title: `${product.title} — IPScans`,
      description: product.subtitle,
    },
  };
}

export default async function IPCastDownloadPage({ params }: Props) {
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
