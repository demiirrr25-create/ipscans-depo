import Link from "next/link";
import type { Metadata } from "next";
import { isLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { PageShell } from "@/components/PageShell";
import { ProductViewer } from "@/components/shop/ProductViewer";
import { InstallSelector } from "@/components/shop/InstallSelector";
import { getProduct, products } from "@/content/products";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return locales.flatMap((locale) =>
    products.map((product) => ({ locale, slug: product.slug }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = getProduct(slug);
  if (!isLocale(locale) || !product) return {};
  return {
    title: `${product.name[locale]} — ipscans`,
    description: product.tagline[locale],
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const product = getProduct(slug);
  if (!product) notFound();
  const dict = getDictionary(locale);

  return (
    <PageShell title={product.name[locale]} subtitle={product.tagline[locale]}>
      <Link
        href={`/${locale}/shop`}
        className="mb-8 inline-block text-sm text-neutral-400 hover:text-white"
      >
        {dict.shop.backToShop}
      </Link>

      <div className="grid gap-10 lg:grid-cols-2">
        <ProductViewer badge={product.badge?.[locale]} />

        <div>
          <p className="text-neutral-300 leading-relaxed">
            {product.description[locale]}
          </p>
          <div className="mt-4 font-mono text-3xl font-bold text-white">
            {product.price.toLocaleString(locale === "tr" ? "tr-TR" : "en-US")}
            ₺
          </div>

          <h2 className="mt-8 font-[family-name:var(--font-display)] text-lg font-semibold text-white">
            {dict.shop.specsTitle}
          </h2>
          <dl className="mt-3 divide-y divide-white/10 rounded-xl border border-white/10">
            {product.specs[locale].map((spec) => (
              <div
                key={spec.label}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <dt className="text-neutral-400">{spec.label}</dt>
                <dd className="font-mono text-white">{spec.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-8">
            <InstallSelector
              locale={locale}
              productSlug={product.slug}
              productName={product.name[locale]}
              price={product.price}
              installTitle={dict.shop.installTitle}
              installOptions={dict.shop.installOptions}
              addToCartLabel={dict.shop.addToCart}
              addedLabel={dict.shop.addedToCart}
              goToCartLabel={dict.shop.goToCart}
            />
          </div>
        </div>
      </div>
    </PageShell>
  );
}
