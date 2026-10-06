import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { platformCopy, ipcastRelease } from "@/content/applications";
import { IPCastReleaseDetails } from "@/components/IPCastReleaseDetails";
import { PageShell } from "@/components/PageShell";
import { localizedAlternates } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const product = getDictionary(locale).ipcast;
  return {
    title: `${product.title} ${ipcastRelease.version}`,
    description: product.subtitle,
    alternates: localizedAlternates(locale, "/download/ipcast"),
    openGraph: { title: `${product.title} ${ipcastRelease.version} — IPScans`, description: product.subtitle, url: `https://ipscans.com/${locale}/download/ipcast` },
  };
}

export default async function IPCastDownloadPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const product = getDictionary(locale).ipcast;
  const copy = platformCopy[locale];

  return (
    <PageShell title={product.title} subtitle={product.subtitle}>
      <div className="mx-auto max-w-xl rounded-3xl border border-white/15 bg-neutral-900/70 p-6 sm:p-8">
        <Image src="/ipcast-mark.svg" alt="" width={72} height={72} />
        <p className="mt-4 text-sm text-neutral-300">{copy.preview} · {ipcastRelease.platform}</p>
        <IPCastReleaseDetails locale={locale} />
        <a href={ipcastRelease.installerUrl} className="btn-primary mt-7 flex min-h-12 items-center justify-center rounded-xl px-6 font-semibold">
          {product.button}
        </a>
        <p className="mt-4 text-xs text-neutral-400">{product.safe}</p>
      </div>
    </PageShell>
  );
}
