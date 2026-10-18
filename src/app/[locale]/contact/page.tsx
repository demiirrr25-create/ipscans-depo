import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, locales } from "@/i18n/config";
import { InformationPage, informationTitles } from "@/components/InformationPage";
import { infoCopy } from "@/components/content/info-copy";

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
    title: informationTitles[locale].contact,
    description: infoCopy[locale].subtitle,
    alternates: {
      canonical: `/${locale}/contact`,
      languages: {
        ...Object.fromEntries(locales.map((l) => [l, `/${l}/contact`])),
        "x-default": "/en/contact",
      },
    },
  };
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <InformationPage locale={locale} page="contact" />;
}
