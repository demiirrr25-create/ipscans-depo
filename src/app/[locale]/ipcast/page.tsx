import Image from "next/image";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { PageShell } from "@/components/PageShell";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { localizedAlternates } from "@/lib/seo";
import Link from "next/link";
import { IPCastReleaseDetails } from "@/components/IPCastReleaseDetails";
import { ipcastRelease } from "@/content/applications";
import { ipcastProductCopy } from "@/content/ipcast-product";
import { IPCastProductSections } from "@/components/IPCastProductSections";
import { AppStoreCarousel } from "@/components/AppStoreCarousel";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale).ipcast;
  return {
    title: t.title,
    description: t.subtitle,
    alternates: localizedAlternates(locale, "/ipcast"),
    openGraph: {
      title: `${t.title} — IPScans`,
      description: t.subtitle,
      url: `https://ipscans.com/${locale}/ipcast`,
    },
  };
}

export default async function IpCastPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const t = dict.ipcast;

  return (
    <PageShell title={t.title} subtitle={t.subtitle}>
      <div className="mx-auto max-w-5xl">
        <div className="my-8">
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
        </div>

        <div className="agy-surface-card p-6 sm:p-10">
          <div className="flex flex-wrap items-center gap-4">
            <Image
              src="/ipcast-mark.svg"
              alt="IPCast"
              width={64}
              height={64}
              className="rounded-2xl border border-white/10"
            />
            <span className="inline-block rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-medium text-neutral-200">
              {t.badge}
            </span>
          </div>

          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {t.features.map((f) => (
              <li
                key={f}
                className="flex items-start gap-3 rounded-2xl border border-white/10 bg-[#18191e] p-4 text-sm text-neutral-200"
              >
                <svg
                  className="mt-0.5 shrink-0 text-white"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {f}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href={ipcastRelease.installerUrl}
              aria-describedby="ipcast-release-notes"
              className="button button-primary"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>{t.button}</span>
            </a>
            <Link
              href={`/${locale}/download/ipcast`}
              className="button button-secondary"
            >
              <span>{ipcastRelease.fileName}</span>
            </Link>
          </div>

          <IPCastReleaseDetails locale={locale} />

          <div
            id="ipcast-release-notes"
            className="mt-5 rounded-2xl border border-white/15 bg-[#18191e] p-5 text-sm leading-relaxed text-neutral-200"
          >
            <p>{ipcastProductCopy[locale]?.connection ?? t.subtitle}</p>
          </div>
          <p className="mt-4 text-xs text-neutral-400">{t.note}</p>
          <p className="mt-2 text-xs text-neutral-400">{t.safe}</p>
        </div>
      </div>
      <IPCastProductSections locale={locale} />
    </PageShell>
  );
}
