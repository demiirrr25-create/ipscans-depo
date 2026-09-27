import Link from "next/link";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { LiveIp } from "@/components/LiveIp";
import { NetworkCanvas } from "@/components/NetworkCanvas";
import { Reveal } from "@/components/Reveal";
import { toolPath } from "@/lib/tool-routes";
import { notFound } from "next/navigation";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <NetworkCanvas />
        </div>
        <div className="mx-auto max-w-6xl px-4 py-24 text-center sm:py-32">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium text-neutral-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
              {dict.hero.badge}
            </span>
          </Reveal>

          <Reveal index={1}>
            <h1 className="mx-auto mt-6 max-w-4xl font-[family-name:var(--font-display)] text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl">
              <span className="text-gradient text-depth">{dict.hero.title}</span>
            </h1>
          </Reveal>

          <Reveal index={2}>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-neutral-400">
              {dict.hero.subtitle}
            </p>
          </Reveal>

          <Reveal index={3}>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={toolPath("ipLookup", locale)}
                className="btn-primary rounded-xl px-6 py-3 font-semibold"
              >
                {dict.hero.ctaPrimary}
              </Link>
              <Link
                href={toolPath("speedTest", locale)}
                className="btn-ghost rounded-xl px-6 py-3 font-semibold"
              >
                {dict.hero.ctaSecondary}
              </Link>
              <Link
                href={`/${locale}/download`}
                className="btn-ghost rounded-xl px-6 py-3 font-semibold"
              >
                {dict.hero.ctaDownload}
              </Link>
            </div>
          </Reveal>

          <Reveal index={4}>
            <div className="mt-12 flex justify-center">
              <LiveIp label={dict.hero.yourIp} />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Stats */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {dict.stats.items.map((s, i) => (
            <Reveal key={s.label} index={i}>
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-6 text-center">
                <div className="font-[family-name:var(--font-display)] text-3xl font-bold text-white">
                  {s.value}
                </div>
                <div className="mt-1 text-sm text-neutral-500">{s.label}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <Reveal>
          <div className="text-center">
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold sm:text-4xl">
              {dict.features.title}
            </h2>
            <p className="mt-3 text-neutral-400">{dict.features.subtitle}</p>
          </div>
        </Reveal>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {dict.features.items.map((item, i) => (
            <Reveal key={item.href} index={i}>
              <Link
                href={`/${locale}${item.href}`}
                className="group relative block h-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-6 transition hover:border-white/25 hover:bg-white/[0.04]"
              >
                <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-white">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-neutral-400">{item.desc}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm text-white opacity-0 transition group-hover:opacity-100">
                  →
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-24">
        <Reveal>
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
        </Reveal>
      </section>
    </div>
  );
}
