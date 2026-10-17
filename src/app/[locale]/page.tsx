import { uiText } from "@/i18n/ui";
import Link from "next/link";
import { isLocale } from "@/i18n/config";
import { getDictionary, getPublicDictionary } from "@/i18n/dictionaries";
import { PlatformHero } from "@/components/PlatformHero";
import { BlogSection } from "@/components/BlogSection";
import { ApplicationsSection } from "@/components/ApplicationsSection";
import { AntigravityParticles } from "@/components/AntigravityParticles";
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
    {
      href: `/${locale}/ip-scanner`,
      title: "IPscans+",
      description: scannerApplication.description[locale],
      tag: "WINDOWS · x64",
    },
    {
      href: toolPath("ipLookup", locale),
      title: dict.ipLookup.title,
      description: dict.ipLookup.subtitle,
      tag: "WEB · INSTANT",
    },
    {
      href: toolPath("speedTest", locale),
      title: dict.speedTest.title,
      description: dict.speedTest.subtitle,
      tag: "WEB · TELEMETRY",
    },
  ];

  return (
    <div>
      <PlatformHero locale={locale} ipLabel={dict.hero.yourIp} />

      <section aria-labelledby="popular-title" className="agy-section">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="agy-eyebrow">02 / {uiText(locale, "START HERE", "BURADAN BAŞLAYIN")}</p>
            <h2 id="popular-title" className="agy-section-title">
              {dict.experience.popular}
            </h2>
          </div>
          <span aria-hidden="true" className="hidden font-mono text-xs tracking-widest text-neutral-500 sm:block">
            {uiText(locale, "NETWORK INTELLIGENCE", "AĞ KEŞFİ")}
          </span>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {popular.map((item) => (
            <Link key={item.href} href={item.href} className="agy-surface-card group flex min-h-64 flex-col p-8">
              <span className="font-mono text-xs tracking-wider text-neutral-400">{item.tag}</span>
              <h3 className="mt-auto pt-10 text-2xl font-medium tracking-tight text-white">
                {item.title}
              </h3>
              <p className="mt-2.5 text-sm leading-relaxed text-neutral-400">{item.description}</p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-white">
                {platform.details}{" "}
                <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
                  →
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <ApplicationsSection locale={locale} dict={getPublicDictionary(locale)} />
      <BlogSection locale={locale} />

      <section className="agy-section grid gap-5 md:grid-cols-2">
        <div className="agy-surface-card min-w-0 break-words p-8 sm:p-10">
          <p className="agy-eyebrow">04 / {uiText(locale, "PLATFORM", "PLATFORM")}</p>
          <h2 className="mt-5 text-2xl font-medium tracking-tight text-white sm:text-3xl">
            {dict.experience.why}
          </h2>
          <p className="mt-4 leading-relaxed text-neutral-400">{platform.subtitle}</p>
          <Link href={`/${locale}/blog`} className="btn-ghost mt-7 inline-flex min-h-11 items-center gap-2 px-5 text-sm font-medium">
            {dict.blog.title} <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="agy-surface-card min-w-0 break-words p-8 sm:p-10">
          <p className="agy-eyebrow">05 / {uiText(locale, "PRIVACY", "GİZLİLİK")}</p>
          <h2 className="mt-5 text-2xl font-medium tracking-tight text-white sm:text-3xl">
            {dict.experience.privacyTitle}
          </h2>
          <p className="mt-4 leading-relaxed text-neutral-400">{dict.experience.privacyBody}</p>
          <Link href={`/${locale}/privacy`} className="btn-ghost mt-7 inline-flex min-h-11 items-center gap-2 px-5 text-sm font-medium">
            {dict.footer.privacy} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <section className="agy-section grid gap-10 lg:grid-cols-[1fr_1.6fr]">
        <div>
          <p className="agy-eyebrow">06 / FAQ</p>
          <h2 className="agy-section-title">{dict.experience.faqTitle}</h2>
        </div>
        <div className="grid gap-3">
          {dict.experience.faq.map((entry) => (
            <details key={entry.question} className="agy-surface-card p-6">
              <summary className="cursor-pointer font-medium text-white">{entry.question}</summary>
              <p className="mt-3 text-sm leading-relaxed text-neutral-400">{entry.answer}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Antigravity .download-section-container with 36px rounded particle backdrop */}
      <section className="agy-download-section-container">
        <div className="agy-download-section">
          <div className="agy-download-backdrop">
            <AntigravityParticles density={85} />
          </div>
          <div className="agy-download-content">
            <p className="agy-eyebrow">IPscans+ v{scannerApplication.version}</p>
            <h2 className="agy-download-header">{dict.cta.title}</h2>
            <p className="agy-download-sub">{dict.cta.subtitle}</p>
            <div className="agy-download-cta">
              <a href={scannerApplication.downloadUrl} className="btn-primary agy-btn-lg">
                <span>{platform.downloadApp} IPscans+</span>
                <span aria-hidden="true">↓</span>
              </a>
              <Link href={toolPath("ipLookup", locale)} className="btn-ghost agy-btn-lg">
                <span>{dict.cta.button}</span>
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
