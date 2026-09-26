import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { PageShell } from "@/components/PageShell";
import { ComingSoon } from "@/components/shop/ComingSoon";
import { notFound } from "next/navigation";

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
