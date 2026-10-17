import { uiText } from "@/i18n/ui";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale, locales, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { applications, platformCopy } from "@/content/applications";
import { scannerCopy } from "@/content/scanner";
import { ProductPreview } from "@/components/ProductPreview";
import { PageShell } from "@/components/PageShell";
import { localizedAlternates } from "@/lib/seo";

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

  return (
    <PageShell title={app.name} subtitle={app.description[locale]}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replaceAll("<", "\\u003c"),
        }}
      />
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
          <span>
            IPSCANS / {app.platform} / v{app.version}
          </span>
        </div>
      </div>

      <div className="agy-surface-card p-7 sm:p-10">
        <p className="body max-w-3xl text-neutral-300">{intro}</p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <a href={app.downloadUrl} className="button button-primary">
            <span>
              {copy.downloadApp} <span aria-hidden="true">↓</span>
            </span>
          </a>
          <a href={app.portableUrl} className="button button-secondary">
            <span>{install.portable} ↗</span>
          </a>
        </div>
      </div>

      {app.id === "scanner" ? (
        <div className="my-12">
          <ProductPreview locale={locale} />
        </div>
      ) : (
        <div className="my-12">
          <div className="feature-media-card">
            <div className="feature-media-card__bar">
              <span className="feature-media-card__title">
                {app.name} v{app.version}
              </span>
              <span className="feature-media-card__tag">
                {app.platform} · TLS 1.3 · SHA-256 PINNING
              </span>
            </div>
            <div className="feature-media-card__viewport">
              <Image
                src="/ipcast-v25-preview.png"
                alt={`${app.name} ${app.version}`}
                width={1440}
                height={900}
                className="feature-image"
                priority
              />
            </div>
          </div>
        </div>
      )}

      <div className="product-detail-body">
        <section className="agy-surface-card p-7 sm:p-10">
          <p className="agy-eyebrow">01 / {copy.details}</p>
          <h2 className="heading-4 mt-4">{app.name}</h2>
          <ol className="mt-8 divide-y divide-white/10">
            {features.map((feature, index) => (
              <li
                key={feature}
                className="grid grid-cols-[36px_1fr] gap-5 py-5"
              >
                <span className="font-mono text-xs text-neutral-400">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p className="leading-relaxed text-neutral-200">{feature}</p>
              </li>
            ))}
          </ol>
          {app.id !== "scanner" && (
            <div className="mt-6">
              <Link
                href={"/" + locale + app.detailPath}
                className="button button-secondary button-compact"
              >
                <span>{copy.details} ↗</span>
              </Link>
            </div>
          )}
          <p className="mt-8 border-s-2 border-white/30 ps-5 text-sm leading-relaxed text-neutral-400">
            {app.id === "scanner" ? scanner.limitations : dict.ipcast.note}
          </p>
        </section>

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
          <details className="mt-7 border-y border-white/15 py-4">
            <summary className="min-h-11 text-sm font-medium text-white">
              {copy.checksum}
            </summary>
            <p className="mt-4 break-all font-mono text-xs leading-relaxed text-neutral-300">
              {app.installerSha256}
            </p>
            {app.id === "scanner" && (
              <>
                <p className="mt-5 text-xs text-neutral-400">
                  {install.portable} ·{" "}
                  {(app.portableBytes / 1024 / 1024).toFixed(1)} MiB
                </p>
                <p className="mt-2 break-all font-mono text-xs leading-relaxed text-neutral-300">
                  {app.portableSha256}
                </p>
              </>
            )}
          </details>
          <div className="mt-6">
            <a
              href={app.releaseUrl}
              className="button button-secondary button-compact"
            >
              <span>{uiText(locale, "Release notes", "Sürüm notları")} ↗</span>
            </a>
          </div>
          <section className="mt-10 border-t border-white/15 pt-7">
            <h2 className="heading-6 text-white">{install.title}</h2>
            <p className="mt-4 text-sm leading-relaxed text-neutral-300">
              {install.instructions}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-neutral-400">
              {uiText(
                locale,
                "Your browser controls where the download is saved. Find the file in its downloads list before running the installer.",
                "İndirme konumunu tarayıcınız belirler. Kurulumu başlatmadan önce dosyayı tarayıcınızın indirmeler listesinde bulun."
              )}
            </p>
          </section>
        </aside>
      </div>

      {app.id === "scanner" && (
        <section className="py-12" aria-labelledby="map-preview-title">
          <p className="agy-eyebrow">
            IPscans+ / {uiText(locale, "Network evidence", "Ağ kanıtları")}
          </p>
          <h2 id="map-preview-title" className="heading-3 mt-4 max-w-2xl">
            {uiText(locale, "Network map", "Ağ haritası")}
          </h2>
          <p className="body mt-4 max-w-2xl text-neutral-300">
            {scanner.mapIntro}
          </p>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {[
              {
                code: uiText(locale, "01 / VERIFIED", "01 / DOĞRULANDI"),
                title: "LLDP",
                description: uiText(
                  locale,
                  "Neighbor MAC announced through authorized SNMP",
                  "Yetkili SNMP ile ilan edilmiş komşu MAC eşleşmesi"
                ),
              },
              {
                code: uiText(locale, "02 / INFERRED", "02 / ÇIKARIMSAL"),
                title: uiText(locale, "Gateway path", "Ağ geçidi yolu"),
                description: uiText(
                  locale,
                  "Shared gateway; physical switch port unknown",
                  "Ortak ağ geçidi; fiziksel anahtar portu bilinmiyor"
                ),
              },
              {
                code: uiText(locale, "03 / UNKNOWN", "03 / BİLİNMİYOR"),
                title: uiText(locale, "Unmapped", "Eşlenmemiş"),
                description: uiText(
                  locale,
                  "No connection is invented without evidence",
                  "Kanıt yoksa bağlantı uydurulmaz"
                ),
              },
            ].map((entry) => (
              <div key={entry.code} className="agy-surface-card p-7">
                <span className="agy-eyebrow">{entry.code}</span>
                <h3 className="heading-5 mt-6">{entry.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-neutral-300">
                  {entry.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </PageShell>
  );
}
