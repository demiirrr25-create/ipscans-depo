import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { PageShell } from "@/components/PageShell";
import { CartView } from "@/components/shop/CartView";
import { notFound } from "next/navigation";

export default async function CartPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <PageShell title={dict.cart.title} subtitle={dict.cart.subtitle}>
      <CartView locale={locale} dict={dict} />
    </PageShell>
  );
}
