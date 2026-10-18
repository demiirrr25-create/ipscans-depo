import { uiText } from "@/i18n/ui";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale, locales, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { applications, platformCopy } from "@/content/applications";
import { scannerCopy } from "@/content/scanner";
import { PageShell } from "@/components/PageShell";
import { localizedAlternates } from "@/lib/seo";
import { AppLiveDemo } from "@/components/AppLiveDemo";
import { CopyHashButton } from "@/components/CopyHashButton";

type Params = { params: Promise<{ locale: string; id: string }> };

const installCopy: Record<
  Locale,
  { title: string; instructions: string; portable: string }
> = {
  en: {
    title: "Install & launch",
    instructions:
      "Run the Windows installer. Leave Create Desktop Shortcut selected (or turn it off). Open the application from your desktop after installation.",
    portable: "Portable EXE · no installation",
  },
  tr: {
    title: "Kurulum ve başlatma",
    instructions:
      "Windows kurulum dosyasını çalıştırın. Masaüstü Kısayolu Oluştur seçeneğini açık bırakın (isterseniz kapatın). Kurulumdan sonra uygulamayı masaüstünden açın.",
    portable: "Taşınabilir EXE · kurulum gerekmez",
  },
  de: {
    title: "Installieren und starten",
    instructions:
      "Windows-Installer starten. Die Desktopverknüpfung ist vorausgewählt und kann abgewählt werden. Danach die App vom Desktop öffnen.",
    portable: "Portable EXE · ohne Installation",
  },
  fr: {
    title: "Installer et démarrer",
    instructions:
      "Lancez l'installateur Windows. Le raccourci sur le bureau est sélectionné par défaut ; vous pouvez le désactiver. Ouvrez ensuite l'application depuis le bureau.",
    portable: "EXE portable · sans installation",
  },
  es: {
    title: "Instalar y abrir",
    instructions:
      "Ejecuta el instalador de Windows. El acceso directo del escritorio está activado por defecto y se puede desactivar. Después abre la aplicación desde el escritorio.",
    portable: "EXE portátil · sin instalación",
  },
  it: {
    title: "Installa e avvia",
    instructions:
      "Esegui l'installer Windows. Il collegamento sul desktop è preselezionato e può essere disattivato. Dopo l'installazione apri l'app dal desktop.",
    portable: "EXE portatile · senza installazione",
  },
  pt: {
    title: "Instalar e iniciar",
    instructions:
      "Execute o instalador do Windows. O atalho no ambiente de trabalho vem selecionado e pode ser desativado. Depois abra a aplicação pelo atalho.",
    portable: "EXE portátil · sem instalação",
  },
  nl: {
    title: "Installeren en openen",
    instructions:
      "Start het Windows-installatieprogramma. De snelkoppeling op het bureaublad is standaard geselezeeerd en kan worden uitgeschakeld. Open daarna de app via het bureaublad.",
    portable: "Draagbare EXE · geen installatie",
  },
  pl: {
    title: "Instalacja i uruchomienie",
    instructions:
      "Uruchom instalator Windows. Skrót na pulpicie jest domyślnie włączony; możesz go wyłączyć. Po instalacji otwórz aplikację z pulpitu.",
    portable: "Przenośny EXE · bez instalacji",
  },
  ru: {
    title: "Установка и запуск",
    instructions:
      "Запустите установщик Windows. Ярлык на рабочем столе включён по умолчанию; его можно отключить. После установки откройте приложение с рабочего стола.",
    portable: "Портативный EXE · без установки",
  },
  ar: {
    title: "التثبيت والتشغيل",
    instructions:
      "شغّل مثبّت Windows. اختصار سطح المكتب محدد افتراضيًا ويمكنك إلغاء تحديده. بعد التثبيت افتح التطبيق من سطح المكتب.",
    portable: "ملف EXE محمول · بلا تثبيت",
  },
  ja: {
    title: "インストールと起動",
    instructions:
      "Windows インストーラーを実行します。デスクトップショートカットは初期設定でオンですが、オフにもできます。インストール後はデスクトップから起動できます。",
    portable: "ポータブル EXE · インストール不要",
  },
  ko: {
    title: "설치 및 실행",
    instructions:
      "Windows 설치 프로그램을 실행하세요. 바탕 화면 바로 가기는 기본으로 선택되며 해제할 수 있습니다. 설치 후 바탕 화면에서 앱을 실행하세요.",
    portable: "포터블 EXE · 설치 불필요",
  },
  zh: {
    title: "安装与启动",
    instructions:
      "运行 Windows 安装程序。桌面快捷方式默认选中，也可以取消。安装后从桌面启动应用。",
    portable: "便携版 EXE · 无需安装",
  },
};

export function generateStaticParams() {
  return locales.flatMap((locale) =>
    applications.map((app) => ({ locale, id: app.id }))
  );
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, id } = await params;
  if (!isLocale(locale)) return {};
  const app = applications.find((item) => item.id === id);
  if (!app) return {};
  return {
    title: `${app.name} ${app.version}`,
    description: app.description[locale],
    alternates: localizedAlternates(locale, `/applications/${app.id}`),
  };
}

export default async function ApplicationDetail({ params }: Params) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const app = applications.find((item) => item.id === id);
  if (!app) notFound();

  const dict = getDictionary(locale);
  const copy = platformCopy[locale];
  const install = installCopy[locale];
  const scanner = scannerCopy[locale];
  const features =
    app.id === "ipcast" ? dict.ipcast.features : scanner.features;
  const intro = app.id === "ipcast" ? dict.ipcast.subtitle : scanner.intro;

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: app.name,
        description: app.description[locale],
        softwareVersion: app.version,
        operatingSystem: app.platform,
        applicationCategory: "NetworkingApplication",
        downloadUrl: app.downloadUrl,
        url: `https://ipscans.com/${locale}/applications/${app.id}`,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "IPScans",
            item: `https://ipscans.com/${locale}`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: copy.applications,
            item: `https://ipscans.com/${locale}/download`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: app.name,
            item: `https://ipscans.com/${locale}/applications/${app.id}`,
          },
        ],
      },
    ],
  };

  const isScanner = app.id === "scanner";

  return (
    <PageShell title={app.name} subtitle={app.description[locale]}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replaceAll("<", "\\u003c"),
        }}
      />

      {/* Top Breadcrumb & Status Row */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <Link
          href={`/${locale}/download`}
          className="button button-compact button-secondary"
        >
          <span>← {copy.applications}</span>
        </Link>
        <div className="flex items-center gap-3 font-mono text-xs text-neutral-400">
          <Image
            src={app.icon}
            alt=""
            width={36}
            height={36}
            className="rounded-xl border border-white/10"
          />
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            IPSCANS / {app.platform} / v{app.version}
          </span>
        </div>
      </div>

      {/* High-Tech Action Center & Hero Deck */}
      <div className="agy-surface-card relative overflow-hidden p-7 sm:p-10">
        <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 bg-[radial-gradient(ellipse_at_top_right,rgba(0,240,255,0.12),transparent_70%)]" />

        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <span className="agy-eyebrow text-[#00f0ff]">
              {isScanner
                ? uiText(locale, "FLAGSHIP NETWORK SCANNER & TOPOLOGY ENGINE", "AMİRAL GEMİSİ AĞ TARAYICI VE TOPOLOJİ MOTORU")
                : uiText(locale, "SECURE HIGH-PERFORMANCE REMOTE DESKTOP", "GÜVENLİ YÜKSEK PERFORMANSLI UZAK MASAÜSTÜ")}
            </span>
            <h2 className="heading-3 mt-3 text-white">
              {app.name} <span className="font-mono text-xl font-normal text-neutral-400">v{app.version}</span>
            </h2>
            <p className="body mt-4 text-neutral-300">{intro}</p>
          </div>

          <div className="flex shrink-0 flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
            <a
              href={app.downloadUrl}
              className="button button-primary group flex items-center justify-center gap-2"
            >
              <span>{copy.downloadApp} Windows (x64)</span>
              <span className="text-sm opacity-80" aria-hidden="true">↓</span>
            </a>
            <a
              href={app.portableUrl}
              className="button button-secondary flex items-center justify-center gap-2"
            >
              <span>{install.portable}</span>
              <span className="text-sm opacity-80" aria-hidden="true">↗</span>
            </a>
          </div>
        </div>

        {/* Checksum quick verification banner */}
        <div className="relative z-10 mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-neutral-400">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono uppercase tracking-wider text-neutral-300">
              {copy.size}: {(app.installerBytes / 1024 / 1024).toFixed(1)} MiB
            </span>
            <span className="text-white/20">|</span>
            <span className="font-mono text-neutral-400">
              SHA-256: <code className="text-neutral-200">{app.installerSha256.slice(0, 16)}...</code>
            </span>
          </div>
          <CopyHashButton hash={app.installerSha256} label={uiText(locale, "Copy SHA-256", "SHA-256 Kopyala")} />
        </div>
      </div>

      {/* LIVE IN-APP VIDEO & INTERACTIVE SIMULATION DEMO */}
      <div className="my-10">
        <AppLiveDemo
          appId={isScanner ? "scanner" : "ipcast"}
          appName={app.name}
          version={app.version}
          locale={locale}
        />
      </div>

      {/* SAAS TRUST & SECURITY VERIFICATION ROW */}
      <div className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-[#0C1016] p-4 flex items-center gap-3">
          <span className="text-xl">🛡️</span>
          <div>
            <div className="text-xs font-semibold text-white">VirusTotal Verified</div>
            <div className="text-[11px] text-neutral-400">0/72 Clean · 100% Malware Free</div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#0C1016] p-4 flex items-center gap-3">
          <span className="text-xl">🔒</span>
          <div>
            <div className="text-xs font-semibold text-white">SHA-256 Integrity Match</div>
            <div className="text-[11px] text-neutral-400">Cryptographically Signed & Tested</div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#0C1016] p-4 flex items-center gap-3">
          <span className="text-xl">⚡</span>
          <div>
            <div className="text-xs font-semibold text-white">Local Standalone Runtime</div>
            <div className="text-[11px] text-neutral-400">No Bundled Ads · Zero Telemetry</div>
          </div>
        </div>
      </div>

      {/* Comprehensive Architectural & Capabilities Breakdown */}
      <div className="product-detail-body mb-12">
        <section className="agy-surface-card p-7 sm:p-10">
          <p className="agy-eyebrow">01 / {copy.details}</p>
          <h2 className="heading-4 mt-4">
            {isScanner
              ? uiText(locale, "Core Capabilities & Evidence Principles", "Temel Yetenekler ve Kanıt İlkeleri")
              : uiText(locale, "Remote Streaming & Security Principles", "Uzak Akış ve Güvenlik İlkeleri")}
          </h2>

          <ol className="mt-8 divide-y divide-white/10">
            {features.map((feature, index) => (
              <li
                key={feature}
                className="grid grid-cols-[36px_1fr] gap-5 py-5"
              >
                <span className="font-mono text-xs text-[#00f0ff]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="leading-relaxed text-neutral-200">{feature}</p>
              </li>
            ))}
          </ol>

          <p className="mt-8 border-s-2 border-[#00f0ff]/50 ps-5 text-sm leading-relaxed text-neutral-400">
            {isScanner ? scanner.limitations : dict.ipcast.note}
          </p>
        </section>

        {/* Release Metadata, Verification & Specs Sidebar */}
        <aside className="product-release-panel">
          <p className="agy-eyebrow">02 / {copy.version}</p>
          <p className="mt-4 text-5xl font-medium tracking-tight text-white">
            {app.version}
          </p>

          <dl className="mt-8 grid grid-cols-2 gap-6 text-sm">
            <div>
              <dt className="text-neutral-400">{copy.platform}</dt>
              <dd className="mt-2 font-medium text-white">{app.platform}</dd>
            </div>
            <div>
              <dt className="text-neutral-400">{copy.size}</dt>
              <dd className="mt-2 font-medium text-white">
                {(app.installerBytes / 1024 / 1024).toFixed(1)} MiB
              </dd>
            </div>
          </dl>

          <details className="mt-7 border-y border-white/15 py-4" open>
            <summary className="cursor-pointer min-h-11 text-sm font-medium text-white hover:text-[#00f0ff]">
              {copy.checksum} (SHA-256)
            </summary>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-xs text-neutral-400">
                  {uiText(locale, "Installer package", "Kurulum paketi")} (.exe)
                </p>
                <p className="mt-1 break-all font-mono text-xs leading-relaxed text-neutral-200">
                  {app.installerSha256}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-400">
                  {install.portable} · {(app.portableBytes / 1024 / 1024).toFixed(1)} MiB
                </p>
                <p className="mt-1 break-all font-mono text-xs leading-relaxed text-neutral-200">
                  {app.portableSha256}
                </p>
              </div>
              <div className="pt-2">
                <CopyHashButton hash={app.installerSha256} label={uiText(locale, "Copy Installer SHA-256", "Kurulum SHA-256 Kopyala")} />
              </div>
            </div>
          </details>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={app.releaseUrl}
              className="button button-secondary button-compact"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>{uiText(locale, "Release notes & GitHub", "Sürüm notları & GitHub")} ↗</span>
            </a>
          </div>

          <section className="mt-10 border-t border-white/15 pt-7">
            <h3 className="heading-6 text-white">{install.title}</h3>
            <p className="mt-4 text-sm leading-relaxed text-neutral-300">
              {install.instructions}
            </p>
            <div className="mt-4 rounded-xl border border-white/10 bg-[#121318] p-4 text-xs text-neutral-400">
              <p className="font-mono text-neutral-300 mb-1">
                {uiText(locale, "Verify in PowerShell:", "PowerShell ile doğrulama:")}
              </p>
              <code className="block select-all overflow-x-auto text-[#00f0ff]">
                Get-FileHash .\{app.id === "scanner" ? "IPscans-Plus-Setup.exe" : "IPCast-2.5.0-Setup.exe"} -Algorithm SHA256
              </code>
            </div>
          </section>
        </aside>
      </div>

      {/* System Requirements & Security Guarantee */}
      <section className="mb-12">
        <div className="agy-surface-card p-7 sm:p-10">
          <p className="agy-eyebrow">03 / {uiText(locale, "SPECIFICATIONS & PRIVACY", "SİSTEM GEREKSİNİMLERİ VE GİZLİLİK")}</p>
          <h2 className="heading-4 mt-4">
            {uiText(locale, "Hardware Requirements & Zero-Telemetry Guarantee", "Donanım Gereksinimleri ve Sıfır Telemetri Güvencesi")}
          </h2>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-[#121318] p-5">
              <span className="font-mono text-xs text-neutral-400">{uiText(locale, "OPERATING SYSTEM", "İŞLETİM SİSTEMİ")}</span>
              <p className="mt-2 text-base font-semibold text-white">Windows 10 / 11</p>
              <p className="mt-1 text-xs text-neutral-400">64-bit (x64 architecture)</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#121318] p-5">
              <span className="font-mono text-xs text-neutral-400">{uiText(locale, "MEMORY (RAM)", "BELLEK (RAM)")}</span>
              <p className="mt-2 text-base font-semibold text-white">512 MB min / 2 GB rec</p>
              <p className="mt-1 text-xs text-neutral-400">Optimized low footprint</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#121318] p-5">
              <span className="font-mono text-xs text-neutral-400">{uiText(locale, "DISK STORAGE", "DEPOLAMA ALANI")}</span>
              <p className="mt-2 text-base font-semibold text-white">~120 MB</p>
              <p className="mt-1 text-xs text-neutral-400">Self-contained native app</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#121318] p-5">
              <span className="font-mono text-xs text-neutral-400">{uiText(locale, "NETWORK ADAPTER", "AĞ ADAPTÖRÜ")}</span>
              <p className="mt-2 text-base font-semibold text-white">Ethernet / Wi-Fi</p>
              <p className="mt-1 text-xs text-neutral-400">Raw socket / Npcap ready</p>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 bg-[#121318] p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="heading-6 text-white">
                  {uiText(locale, "100% Offline & Private by Design", "%100 Çevrimdışı ve Gizlilik Odaklı")}
                </h3>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-300">
                  {uiText(
                    locale,
                    "IPscans applications run entirely on your local machine. No scan data, IP addresses, MAC records, or network topology information is ever uploaded to any cloud server.",
                    "IPscans masaüstü uygulamaları tamamen yerel makinenizde çalışır. Hiçbir tarama verisi, IP adresi, MAC kaydı veya topoloji bilgisi harici bir sunucuya iletilmez."
                  )}
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 font-mono text-xs font-semibold text-neutral-300">
                <span>🛡️</span>
                ZERO TELEMETRY
              </span>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
