import type { Metadata } from "next";
import { isLocale, locales, localeTags } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { PageShell } from "@/components/PageShell";
import { notFound } from "next/navigation";
import { localizedAlternates } from "@/lib/seo";

const BASE_URL = "https://ipscans.com";

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
  const dict = getDictionary(locale);
  return {
    title: dict.pro.title,
    description: dict.pro.subtitle,
    alternates: localizedAlternates(locale, "/pro"),
  };
}

export default async function ProPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const t = dict.pro;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: t.title,
    description: t.subtitle,
    url: `${BASE_URL}/${locale}/pro`,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Windows",
    inLanguage: localeTags[locale],
    offers: t.plans.map((plan) => ({
      "@type": "Offer",
      name: plan.name,
      description: plan.price,
    })),
  };

  return (
    <PageShell title={t.title} subtitle={t.subtitle}>
      <script
        type="application/ld+json"
        // Static, code-authored structured data — safe to inject directly.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto max-w-3xl text-center">
        <span className="inline-block rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-neutral-300">
          {t.badge}
        </span>
        <a
          href="/downloads/ipscans-network-health-pro.exe"
          download
          className="btn-primary mx-auto mt-6 flex w-fit items-center justify-center gap-2 rounded-xl px-8 py-3.5 font-semibold"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {t.button}
        </a>
        <p className="mt-3 text-xs text-neutral-500">{t.note}</p>
      </div>

      <div className="mx-auto mt-14 grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {t.plans.map((plan, i) => (
          <div
            key={plan.name}
            className={`relative rounded-2xl border p-6 ${
              i === 1
                ? "border-white/30 bg-white/[0.05]"
                : "border-white/10 bg-white/[0.02]"
            }`}
          >
            {i === 1 && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-black">
                {t.mostPopular}
              </span>
            )}
            <h3 className="font-[family-name:var(--font-display)] text-lg font-bold">
              {plan.name}
            </h3>
            <p className="mt-1 text-sm text-neutral-400">{plan.price}</p>
            <ul className="mt-5 space-y-2.5 text-left text-sm text-neutral-300">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <svg
                    className="mt-0.5 shrink-0"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
