import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale, locales } from "@/i18n/config";
import { applications } from "@/content/applications";
import { localizedAlternates } from "@/lib/seo";
import { ProductShowcase } from "@/components/product/ProductShowcase";

type Params = { params: Promise<{ locale: string; id: string }> };

export function generateStaticParams() {
  return locales.flatMap((locale) =>
    applications.map((app) => ({ locale, id: app.id }))
  );
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, id } = await params;
  if (!isLocale(locale)) return {};
  const app = applications.find((item) => item.id === id);
  if (!app) return {};
  return {
    title: app.name,
    description: app.description[locale],
    alternates: localizedAlternates(locale, `/applications/${app.id}`),
    openGraph: {
      title: `${app.name} — IPScans`,
      description: app.description[locale],
      url: `https://ipscans.com/${locale}/applications/${app.id}`,
    },
    twitter: {
      title: `${app.name} — IPScans`,
      description: app.description[locale],
    },
  };
}

export default async function ApplicationDetail({ params }: Params) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const app = applications.find((item) => item.id === id);
  if (!app) notFound();

  return (
    <ProductShowcase
      product={app.id}
      locale={locale}
      canonicalPath={`/applications/${app.id}`}
    />
  );
}
