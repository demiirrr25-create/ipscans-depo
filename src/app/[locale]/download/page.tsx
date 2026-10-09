import { isLocale } from "@/i18n/config";
import { getPublicDictionary } from "@/i18n/dictionaries";
import { ApplicationsSection } from "@/components/ApplicationsSection";
import { notFound } from "next/navigation";
import { platformCopy } from "@/content/applications";
import type { Metadata } from "next";
import { localizedAlternates } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const copy = platformCopy[locale];
  return {
    title: copy.applications,
    description: copy.applicationsIntro,
    alternates: localizedAlternates(locale, "/download"),
    openGraph: { title: `${copy.applications} — IPScans`, description: copy.applicationsIntro, url: `https://ipscans.com/${locale}/download` },
  };
}

export default async function DownloadPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <div className="pt-10">
      <ApplicationsSection locale={locale} dict={getPublicDictionary(locale)} primary />
    </div>
  );
}
