import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { PageShell } from "@/components/PageShell";
import { ComingSoon } from "@/components/shop/ComingSoon";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { localizedAlternates } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return {
    title: getDictionary(locale).shop.title,
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

  return (
    <PageShell title={dict.shop.title}>
      <ComingSoon dict={dict.shop} />
    </PageShell>
  );
}
