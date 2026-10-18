import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/PageShell";
import { downloadHubCopy } from "@/components/catalog/copy";
import { ComingSoon } from "@/components/shop/ComingSoon";
import { isLocale } from "@/i18n/config";
import { getDictionary, getPublicDictionary } from "@/i18n/dictionaries";
import { localizedAlternates } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return {
    title: dict.shop.title,
    description: dict.shop.comingSoonBody,
    alternates: localizedAlternates(locale, "/shop"),
    robots: { index: false, follow: true },
  };
}

export default async function ShopPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const toolsDict = getPublicDictionary(locale);
  const copy = downloadHubCopy[locale];

  return (
    <PageShell
      eyebrow={copy.shop.eyebrow}
      title={dict.shop.title}
      subtitle={dict.shop.comingSoonBody}
    >
      <ComingSoon dict={dict.shop} locale={locale} toolsDict={toolsDict} />
    </PageShell>
  );
}
