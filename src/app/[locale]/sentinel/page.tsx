import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/ds/Icon";
import { Reveal } from "@/components/ds/Reveal";
import { SignalField } from "@/components/ds/SignalField";
import { SplitHeading } from "@/components/ds/SplitHeading";
import {
  DownloadStage,
  FeatureGrid,
  ReleaseDetails,
  ScreenshotFrame,
  SectionHeader,
} from "@/components/ds/product";
import { SentinelInteractiveConsole } from "@/components/sentinel/SentinelInteractiveConsole";
import { isLocale } from "@/i18n/config";
import { localizedAlternates } from "@/lib/seo";

const sentinelRelease = {
  version: "3.0.0",
  platform: "Windows 10/11 · x64 (Rust Native)",
  url: "https://github.com/demiirrr25-create/ipscans-depo/releases/tag/sentinel-v3.0.0",
  sha256: "ac2256725a586f3a676ebd26b4d9eafbc77ee49d9b6ea44ea750db3f9a8cf16b",
} as const;

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const isTr = locale === "tr";
  const title = isTr ? "IPScans Sentinel · Yerel olay incelemesi" : "IPScans Sentinel · Local incident review";
  const description = isTr ? "Yerel cihazları keşfedin, olay bulgularını inceleyin ve müdahaleyi yetkili Windows bilgisayarından yönetin." : "Discover local devices, inspect incident evidence and manage the response from an authorized Windows computer.";

  return {
    title,
    description,
    alternates: localizedAlternates(locale, "/sentinel"),
  };
}

export default async function SentinelPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const isTr = locale === "tr";

  const preview = `/desktop/${isTr ? "tr" : "en"}.html#sentinel`;
  const features = [
    { icon: "network" as const, title: isTr ? "Ağ keşfi" : "Network discovery", body: isTr ? "Yerel ağ geçidini ve erişilebilir cihazları inceleyin." : "Inspect the local gateway and reachable devices." },
    { icon: "shield" as const, title: isTr ? "Olay incelemesi" : "Incident review", body: isTr ? "Bulguları doğrulayın ve izinli müdahale adımlarını değerlendirin." : "Review evidence before choosing an authorized response." },
    { icon: "cpu" as const, title: isTr ? "Yerel çalışma" : "Local workspace", body: isTr ? "Windows bilgisayarındaki tanılama araçlarını kullanın." : "Use the diagnostic tools on your Windows workstation." },
  ];

  return (
    <div className="relative">
      <section className="relative isolate overflow-hidden border-b border-line pt-[calc(var(--header-h)+48px)] pb-20 sm:pt-[calc(var(--header-h)+72px)] sm:pb-28">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 opacity-60 [mask-image:radial-gradient(70%_70%_at_65%_20%,#000_20%,transparent_75%)]"
        >
          <SignalField variant="ambient" />
        </div>

        <div className="ds-container">
          <Reveal>
            <Link
              href={`/${locale}/download`}
              className="inline-flex items-center gap-2 text-sm font-medium text-ink-2 transition-colors hover:text-ink"
            >
              <Icon name="arrowRight" size={15} className="rotate-180 rtl:rotate-0" />
              <span>{isTr ? "Tüm uygulamalar" : "All applications"}</span>
            </Link>

            <div className="mt-8 flex items-center gap-3.5">
              <span className="grid size-12 place-items-center overflow-hidden rounded-[14px] border border-line bg-surface shadow-xs">
                <Image
                  src="/brand/sentinel-logo.png"
                  alt="IPScans Sentinel"
                  width={48}
                  height={48}
                  className="size-12 object-cover"
                />
              </span>
              <div>
                <p className="ds-eyebrow">
                  {isTr
                    ? "Windows · Yerel olay incelemesi"
                    : "Windows · Local incident review"}
                </p>
                <p className="text-base font-semibold tracking-tight text-ink">
                  IPScans Sentinel
                </p>
              </div>
            </div>
          </Reveal>

          <div className="mt-8 max-w-[880px]">
            <SplitHeading
              as="h1"
              text={
                isTr
                  ? "Yerel ağdaki olayları inceleyin."
                  : "Investigate incidents on your local network."
              }
              className="ds-display text-ink"
            />
            <Reveal delay={120}>
              <p className="ds-lead mt-6 max-w-[680px]">
                {isTr
                  ? "Yerel cihazları keşfedin, olay bulgularını inceleyin ve müdahaleyi yetkili Windows bilgisayarından yönetin."
                  : "Discover local devices, inspect incident evidence and manage the response from an authorized Windows computer."}
              </p>
            </Reveal>

            <Reveal delay={180} className="mt-9 flex flex-wrap items-center gap-3">
              <a href={preview} className="btn btn-primary">
                <Icon name="download" size={16} />
                <span>{isTr ? "Denetlenen ön sürümü incele" : "Review the audited preview"}</span>
              </a>
              <a href="#live-console" className="btn btn-secondary">
                <span>{isTr ? "Olay inceleme adımları" : "Local review steps"}</span>
                <Icon name="arrowDown" size={16} />
              </a>
            </Reveal>
          </div>

          <Reveal delay={200} className="mt-14">
            <ScreenshotFrame
              src="/desktop-previews/sentinel.png"
              alt={isTr ? "IPScans Sentinel ön sürümünün olay inceleme ekranı" : "Incident review in the IPScans Sentinel preview"}
              width={1440}
              height={900}
              priority
            />
          </Reveal>

          <Reveal delay={240} className="mt-14" id="live-console">
            <SentinelInteractiveConsole isTr={isTr} />
          </Reveal>
        </div>
      </section>

      <section className="ds-section border-b border-line">
        <div className="ds-container">
          <SectionHeader
            eyebrow={isTr ? "Temel yetenekler" : "Core capabilities"}
            title={
              isTr
                ? "Yerel inceleme araçları"
                : "Local investigation tools"
            }
          />
          <div className="mt-12">
            <FeatureGrid features={features} columns={3} />
          </div>
        </div>
      </section>

      <section className="ds-section">
        <div className="ds-container">
          <ReleaseDetails
            title={isTr ? "Sürüm ve Doğrulama Bilgileri" : "Release & Verification Details"}
            rows={[
              { label: isTr ? "Sürüm" : "Version", value: sentinelRelease.version },
              { label: "Platform", value: sentinelRelease.platform },
              { label: "SHA-256 · 3.0.0", value: sentinelRelease.sha256 },
            ]}
            files={[]}
            releaseNotes={{ href: sentinelRelease.url, label: isTr ? "3.0.0 arşiv kaydı" : "Archived 3.0.0 release record" }}
            copyLabel={isTr ? "SHA-256 Kopyala" : "Copy SHA-256"}
            copiedLabel={isTr ? "Kopyalandı" : "Copied"}
            downloadLabel={isTr ? "İndir" : "Download"}
          />
        </div>
      </section>

      <section className="ds-container pb-24">
        <DownloadStage
          title={
            isTr
              ? "Windows için IPScans Sentinel 3.0"
              : "IPScans Sentinel 3.0 for Windows"
          }
          lead={
            isTr
              ? "Yerel tanılama araçlarını kullanmak için Windows sürümünü indirin."
              : "Download the standalone Windows executable to use the local diagnostics."
          }
        >
          <a href={preview} className="btn btn-inverse">
            <Icon name="download" size={16} />
            <span>{isTr ? "Ön sürüm kataloğu" : "Prerelease catalog"}</span>
          </a>
        </DownloadStage>
      </section>
    </div>
  );
}
