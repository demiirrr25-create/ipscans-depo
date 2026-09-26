import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type { Product } from "@/content/products";

export function ProductCard({
  locale,
  product,
  viewLabel,
}: {
  locale: Locale;
  product: Product;
  viewLabel: string;
}) {
  return (
    <Link
      href={`/${locale}/shop/${product.slug}`}
      className="group relative block overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition hover:border-white/25 hover:bg-white/[0.04]"
    >
      {product.badge && (
        <span className="absolute right-4 top-4 rounded-full bg-amber-400 px-3 py-1 text-xs font-semibold text-black">
          {product.badge[locale]}
        </span>
      )}
      <div className="mx-auto grid h-36 w-36 place-items-center rounded-full bg-[radial-gradient(60%_60%_at_50%_30%,rgba(0,194,255,0.15),transparent)]">
        <svg width="72" height="72" viewBox="0 0 200 200" fill="none">
          <circle cx="100" cy="100" r="70" fill="#111318" stroke="#00C2FF" strokeWidth="2" />
          <circle cx="100" cy="100" r="46" fill="#0A0B0D" stroke="#00F5A0" strokeWidth="1.5" />
          <circle cx="100" cy="100" r="10" fill="#00C2FF" />
        </svg>
      </div>
      <h3 className="mt-4 font-[family-name:var(--font-display)] text-lg font-semibold text-white">
        {product.name[locale]}
      </h3>
      <p className="mt-1 text-sm text-neutral-400">{product.tagline[locale]}</p>
      <div className="mt-4 flex items-center justify-between">
        <span className="font-mono text-xl font-bold text-white">
          {product.price.toLocaleString(locale === "tr" ? "tr-TR" : "en-US")}₺
        </span>
        <span className="text-sm text-[#00C2FF] opacity-0 transition group-hover:opacity-100">
          {viewLabel} →
        </span>
      </div>
    </Link>
  );
}
