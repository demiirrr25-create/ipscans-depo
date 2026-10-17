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
    openGraph: {
      title: `${product.title} ${ipcastRelease.version} — IPScans`,
      description: product.subtitle,
      url: `https://ipscans.com/${locale}/download/ipcast`,
    },
  };
}

export default async function IPCastDownloadPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const product = getDictionary(locale).ipcast;
  const copy = platformCopy[locale];

  return (
    <PageShell title={product.title} subtitle={product.subtitle}>
      <div className="mx-auto max-w-4xl space-y-10">
        <div className="feature-media-card">
          <div className="feature-media-card__bar">
            <span className="feature-media-card__title">
              IPCast v{ipcastRelease.version}
            </span>
            <span className="feature-media-card__tag">
              {ipcastRelease.platform} · NATIVE WIN64 · SHA-256 VERIFIED
            </span>
          </div>
          <div className="feature-media-card__viewport">
            <Image
              src="/ipcast-v25-preview.png"
              alt={`IPCast ${ipcastRelease.version}`}
              width={1440}
              height={900}
              className="feature-image"
              priority
            />
          </div>
        </div>

        <div className="agy-surface-card p-6 sm:p-10">
          <div className="flex items-center gap-4">
            <Image
              src="/ipcast-mark.svg"
              alt=""
              width={64}
              height={64}
              className="rounded-2xl border border-white/10"
            />
            <div>
              <p className="text-lg font-medium text-white">
                {product.title} {ipcastRelease.version}
              </p>
              <p className="mt-1 text-sm text-neutral-300">
                {copy.preview} · {ipcastRelease.platform}
              </p>
            </div>
          </div>
          <IPCastReleaseDetails locale={locale} />
          <div className="mt-7">
            <a
              href={ipcastRelease.installerUrl}
              className="button button-primary"
            >
              <span>{product.button} ↓</span>
            </a>
          </div>
          <p className="mt-4 text-xs text-neutral-400">{product.safe}</p>
        </div>
      </div>
    </PageShell>
  );
}
