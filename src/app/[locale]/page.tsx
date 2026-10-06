import Link from "next/link";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { LiveIp } from "@/components/LiveIp";
import { NetworkCanvas } from "@/components/NetworkCanvas";
import { ApplicationsSection } from "@/components/ApplicationsSection";
import { toolPath } from "@/lib/tool-routes";
import { notFound } from "next/navigation";
import { platformCopy } from "@/content/applications";

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
      <section className="hero-stage relative overflow-hidden border-b border-white/15">
        <div className="pointer-events-none absolute inset-0 opacity-50">
          <NetworkCanvas />
        </div>
        <div className="hero-grid pointer-events-none absolute inset-0" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 pb-14 pt-16 sm:pt-24 lg:min-h-[720px] lg:grid-cols-[1.4fr_0.6fr] lg:items-end lg:pb-24">
          <div>
            <p className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.2em] text-neutral-300"><span className="h-2 w-2 rounded-full bg-white" /> {platform.eyebrow} <span aria-hidden="true" className="text-neutral-500">/ 001</span></p>

            <h1 className="mt-10 max-w-5xl font-[family-name:var(--font-display)] text-[clamp(3.6rem,9vw,9rem)] font-semibold leading-[0.94] tracking-[-0.075em]">
              {platform.title}
            </h1>

            <p className="mt-10 max-w-xl text-lg leading-relaxed text-neutral-300">
              {platform.subtitle}
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link
                href={`/${locale}/ip-scanner`}
                className="btn-primary inline-flex min-h-12 items-center rounded-lg px-6 font-semibold"
              >
                IP Scanner <span aria-hidden="true" className="ms-8">↗</span>
              </Link>
              <Link href="#applications" className="btn-ghost inline-flex min-h-12 items-center rounded-lg px-6 font-semibold">
                {platform.explore} <span aria-hidden="true" className="ms-5">↓</span>
              </Link>
            </div>
          </div>
          <div className="hero-terminal self-end border border-white/20 bg-black/80 p-5 backdrop-blur-md sm:p-7">
            <div className="flex items-center justify-between border-b border-white/15 pb-4 font-mono text-[11px] uppercase tracking-widest text-neutral-400"><span>IPSCANS / LIVE</span><span className="text-white">● ONLINE</span></div>
            <div className="py-9"><LiveIp label={dict.hero.yourIp} /></div>
            <div className="grid grid-cols-2 gap-3 border-t border-white/15 pt-5 font-mono text-xs">
              <Link href={toolPath("ipLookup", locale)} className="text-neutral-300 hover:text-white">01 / {dict.nav.ipLookup} ↗</Link>
              <Link href={toolPath("dns", locale)} className="text-neutral-300 hover:text-white">02 / {dict.nav.dns} ↗</Link>
              <Link href={toolPath("ports", locale)} className="text-neutral-300 hover:text-white">03 / {dict.nav.ports} ↗</Link>
              <Link href={toolPath("speedTest", locale)} className="text-neutral-300 hover:text-white">04 / {dict.nav.speedTest} ↗</Link>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="popular-title" className="mx-auto max-w-7xl px-4 py-18">
        <div className="mb-8 flex items-end justify-between gap-4 border-b border-white/15 pb-6">
          <div><p className="font-mono text-xs uppercase tracking-[0.2em] text-neutral-400">01 / START HERE</p>
          <h2 id="popular-title" className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight sm:text-5xl">{dict.experience.popular}</h2></div>
          <span aria-hidden="true" className="hidden font-mono text-xs text-neutral-500 sm:block">NETWORK / INTELLIGENCE</span>
        </div>
        <div className="grid gap-px border border-white/15 bg-white/15 sm:grid-cols-3">
          {[
            { href: `/${locale}/ip-scanner`, title: "IP Scanner", description: dict.experience.scanner.intro },
            { href: toolPath("ipLookup", locale), title: dict.ipLookup.title, description: dict.ipLookup.subtitle },
            { href: toolPath("speedTest", locale), title: dict.speedTest.title, description: dict.speedTest.subtitle },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="group flex min-h-56 flex-col bg-black p-7 transition-colors hover:bg-neutral-900">
              <span aria-hidden="true" className="font-mono text-xs text-neutral-400">◈ / {String(["IP Scanner", dict.ipLookup.title, dict.speedTest.title].indexOf(item.title) + 1).padStart(2, "0")}</span>
              <h3 className="mt-auto pt-8 text-xl font-semibold">{item.title} <span aria-hidden="true" className="float-end text-neutral-400 transition-transform group-hover:translate-x-1 group-hover:text-white">↗</span></h3>
              <p className="mt-2 text-sm text-neutral-300">{item.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <ApplicationsSection locale={locale} dict={dict} />

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-16 md:grid-cols-2">
        <div className="min-w-0 break-words rounded-2xl border border-white/10 bg-white/[0.03] p-8">
          <h2 className="text-2xl font-bold">{dict.experience.why}</h2>
          <p className="mt-4 leading-relaxed text-neutral-300">{platform.subtitle}</p>
          <Link href={`/${locale}/scan`} className="mt-6 inline-block text-sm underline underline-offset-4">{dict.experience.networkTools} ↗</Link>
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
