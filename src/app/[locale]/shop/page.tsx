import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { PageShell } from "@/components/PageShell";
import { ProductCard } from "@/components/shop/ProductCard";
import { products } from "@/content/products";
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
    <PageShell title={dict.shop.title} subtitle={dict.shop.subtitle}>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <ProductCard
            key={product.slug}
            locale={locale}
            product={product}
            viewLabel={dict.shop.viewProduct}
          />
        ))}
      </div>
    </PageShell>
  );
}
