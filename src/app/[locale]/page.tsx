import { uiText } from '@/i18n/ui';
import Link from "next/link";
import { isLocale } from "@/i18n/config";
import { getDictionary, getPublicDictionary } from "@/i18n/dictionaries";
import { PlatformHero } from "@/components/PlatformHero";
import { BlogSection } from "@/components/BlogSection";
import { ApplicationsSection } from "@/components/ApplicationsSection";
import { toolPath } from "@/lib/tool-routes";
import { notFound } from "next/navigation";
import { platformCopy, scannerApplication } from "@/content/applications";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const platform = platformCopy[locale];
  const popular = [
    { href: `/${locale}/ip-scanner`, title: "IPscans+", description: scannerApplication.description[locale], icon: "◎" },
    { href: toolPath("ipLookup", locale), title: dict.ipLookup.title, description: dict.ipLookup.subtitle, icon: "⌖" },
    { href: toolPath("speedTest", locale), title: dict.speedTest.title, description: dict.speedTest.subtitle, icon: "⚡︎" },
  ];

  return (
    <div>
      <PlatformHero locale={locale} ipLabel={dict.hero.yourIp} />

      <section aria-labelledby="popular-title" className="aurora-section">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="aurora-eyebrow">{uiText(locale, "START HERE", "BURADAN BAŞLAYIN")}</p>
            <h2 id="popular-title" className="aurora-title">{dict.experience.popular}</h2>
          </div>
          <span aria-hidden="true" className="hidden font-mono text-xs tracking-[.18em] text-neutral-500 sm:block">{uiText(locale, "NETWORK INTELLIGENCE", "AĞ KEŞFİ")}</span>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {popular.map((item) => (
            <Link key={item.href} href={item.href} className="aurora-card group flex min-h-64 flex-col p-7">
              <span aria-hidden="true" className="aurora-icon">{item.icon}</span>
              <h3 className="mt-auto pt-10 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-400">{item.description}</p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300">
                {platform.details} <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <ApplicationsSection locale={locale} dict={getPublicDictionary(locale)} />
      <BlogSection locale={locale} />

      <section className="aurora-section grid gap-5 md:grid-cols-2">
        <div className="aurora-card min-w-0 break-words p-8 sm:p-10">
          <span aria-hidden="true" className="aurora-icon">✦</span>
          <h2 className="mt-6 font-[family-name:var(--font-display)] text-2xl font-semibold sm:text-3xl">{dict.experience.why}</h2>
          <p className="mt-4 leading-relaxed text-neutral-300">{platform.subtitle}</p>
          <Link href={`/${locale}/blog`} className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-cyan-300">{dict.blog.title} <span aria-hidden="true">→</span></Link>
        </div>
        <div className="aurora-card min-w-0 break-words p-8 sm:p-10">
          <span aria-hidden="true" className="aurora-icon">⛨</span>
          <h2 className="mt-6 font-[family-name:var(--font-display)] text-2xl font-semibold sm:text-3xl">{dict.experience.privacyTitle}</h2>
          <p className="mt-4 leading-relaxed text-neutral-300">{dict.experience.privacyBody}</p>
          <Link href={`/${locale}/privacy`} className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-cyan-300">{dict.footer.privacy} <span aria-hidden="true">→</span></Link>
        </div>
      </section>

      <section className="aurora-section grid gap-10 lg:grid-cols-[1fr_1.6fr]">
        <div>
          <p className="aurora-eyebrow">FAQ</p>
          <h2 className="aurora-title">{dict.experience.faqTitle}</h2>
        </div>
        <div className="grid gap-3">
          {dict.experience.faq.map((entry) => (
            <details key={entry.question} className="rounded-2xl border border-white/10 bg-neutral-900/60 p-6">
              <summary className="cursor-pointer font-semibold">{entry.question}</summary>
              <p className="mt-3 text-sm leading-relaxed text-neutral-300">{entry.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1320px] px-5 pb-28 sm:px-6">
        <div className="aurora-cta">
          <h2 className="mx-auto max-w-3xl font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight sm:text-5xl">
            {dict.cta.title}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-neutral-300">
            {dict.cta.subtitle}
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link href={toolPath("ipLookup", locale)} className="btn-primary inline-flex min-h-12 items-center px-8 font-semibold">
              {dict.cta.button}
            </Link>
            <a href={scannerApplication.downloadUrl} className="btn-ghost inline-flex min-h-12 items-center px-8 font-semibold">
              {platform.downloadApp} IPscans+ <span aria-hidden="true" className="ms-2">↓</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
