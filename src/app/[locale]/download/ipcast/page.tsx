import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { platformCopy, ipcastRelease } from "@/content/applications";
import { IPCastReleaseDetails } from "@/components/IPCastReleaseDetails";
import { PageShell } from "@/components/PageShell";
import { localizedAlternates } from "@/lib/seo";
import { AppStoreCarousel } from "@/components/AppStoreCarousel";

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
        <AppStoreCarousel
          appId="ipcast"
          appName="IPCast"
          locale={locale}
          intervalMs={5000}
          screenshots={[
            {
              id: "ipcast-console",
              label: locale === "tr" ? "9 Haneli Konsol" : "9-Digit Console",
              title: locale === "tr" ? "Doğrudan STUN/UDP P2P Bağlantı Konsolu" : "Direct STUN/UDP P2P Connection Console",
              tag: "P2P CONSOLE",
              image: "/ipcast-v25-preview.png",
            },
            {
              id: "ipcast-stream",
              label: locale === "tr" ? "60 FPS Canlı Akış" : "60 FPS Stream",
              title: locale === "tr" ? "D3D11 Donanım Hızlandırmalı Uzak Masaüstü" : "D3D11 GPU Accelerated Remote Desktop",
              tag: "GPU STREAM",
              renderType: "ipcast-stream",
            },
            {
              id: "ipcast-files",
              label: locale === "tr" ? "Dosya Aktarımı" : "File Relay",
              title: locale === "tr" ? "AES-256-GCM Şifreli P2P Dosya Aktarım Tüneli" : "AES-256-GCM Encrypted P2P File Pipeline",
              tag: "SECURE RELAY",
              renderType: "ipcast-files",
            },
          ]}
        />

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
