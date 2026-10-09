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

  return (
    <div>
      <PlatformHero locale={locale} ipLabel={dict.hero.yourIp} />

      <section aria-labelledby="popular-title" className="mx-auto max-w-7xl px-4 py-18">
        <div className="mb-8 flex items-end justify-between gap-4 border-b border-white/15 pb-6">
          <div><p className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-400">01 / START HERE</p>
          <h2 id="popular-title" className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight sm:text-5xl">{dict.experience.popular}</h2></div>
          <span aria-hidden="true" className="hidden font-mono text-xs text-neutral-400 sm:block">NETWORK / INTELLIGENCE</span>
        </div>
        <div className="grid gap-px border border-white/15 bg-white/15 sm:grid-cols-3">
          {[
            { href: `/${locale}/ip-scanner`, title: "IPscans+", description: scannerApplication.description[locale] },
            { href: toolPath("ipLookup", locale), title: dict.ipLookup.title, description: dict.ipLookup.subtitle },
            { href: toolPath("speedTest", locale), title: dict.speedTest.title, description: dict.speedTest.subtitle },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="group flex min-h-56 flex-col bg-black p-7 transition-colors hover:bg-neutral-900">
              <span aria-hidden="true" className="font-mono text-xs text-neutral-400">◈ / {String(["IPscans+", dict.ipLookup.title, dict.speedTest.title].indexOf(item.title) + 1).padStart(2, "0")}</span>
              <h3 className="mt-auto pt-8 text-xl font-semibold">{item.title} <span aria-hidden="true" className="float-end text-neutral-400 transition-transform group-hover:translate-x-1 group-hover:text-white">↗</span></h3>
              <p className="mt-2 text-sm text-neutral-300">{item.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <ApplicationsSection locale={locale} dict={getPublicDictionary(locale)} />
      <BlogSection locale={locale} />

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-16 md:grid-cols-2">
        <div className="min-w-0 break-words rounded-2xl border border-white/10 bg-white/[0.03] p-8">
          <h2 className="text-2xl font-bold">{dict.experience.why}</h2>
          <p className="mt-4 leading-relaxed text-neutral-300">{platform.subtitle}</p>
          <Link href={`/${locale}/blog`} className="mt-6 inline-block text-sm underline underline-offset-4">{dict.blog.title} ↗</Link>
        </div>
        <div className="min-w-0 break-words rounded-2xl border border-white/10 bg-white/[0.03] p-8">
          <h2 className="text-2xl font-bold">{dict.experience.privacyTitle}</h2>
          <p className="mt-4 leading-relaxed text-neutral-300">{dict.experience.privacyBody}</p>
          <Link href={`/${locale}/privacy`} className="mt-6 inline-block text-sm underline underline-offset-4">{dict.footer.privacy} ↗</Link>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-3xl font-bold">{dict.experience.faqTitle}</h2>
        <div className="mt-6 grid gap-3">
          {dict.experience.faq.map((entry) => (
            <details key={entry.question} className="rounded-xl border border-white/15 bg-neutral-900/60 p-5">
              <summary className="cursor-pointer font-semibold">{entry.question}</summary>
              <p className="mt-3 text-sm leading-relaxed text-neutral-300">{entry.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] px-6 py-14 text-center">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_0%,rgba(255,255,255,0.08),transparent)]" />
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold sm:text-4xl">
              {dict.cta.title}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-neutral-400">
              {dict.cta.subtitle}
            </p>
            <Link
              href={toolPath("ipLookup", locale)}
              className="btn-primary mt-8 inline-block rounded-xl px-8 py-3 font-semibold"
            >
              {dict.cta.button}
            </Link>
        </div>
      </section>
    </div>
  );
}
