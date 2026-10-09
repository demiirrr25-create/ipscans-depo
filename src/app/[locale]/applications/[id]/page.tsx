import { uiText } from '@/i18n/ui';
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale, locales, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { applications, platformCopy } from "@/content/applications";
import { scannerCopy } from "@/content/scanner";
import { ScannerV4 } from "@/components/ScannerV4";
import { localizedAlternates } from "@/lib/seo";

type Params = { params: Promise<{ locale: string; id: string }> };

const installCopy: Record<Locale, { title: string; instructions: string; portable: string }> = {
  en: { title: "Install & launch", instructions: "Run the Windows installer. Leave Create Desktop Shortcut selected (or turn it off). Open the application from your desktop after installation.", portable: "Portable EXE · no installation" },
  tr: { title: "Kurulum ve başlatma", instructions: "Windows kurulum dosyasını çalıştırın. Masaüstü Kısayolu Oluştur seçeneğini açık bırakın (isterseniz kapatın). Kurulumdan sonra uygulamayı masaüstünden açın.", portable: "Taşınabilir EXE · kurulum gerekmez" },
  de: { title: "Installieren und starten", instructions: "Windows-Installer starten. Die Desktopverknüpfung ist vorausgewählt und kann abgewählt werden. Danach die App vom Desktop öffnen.", portable: "Portable EXE · ohne Installation" },
  fr: { title: "Installer et démarrer", instructions: "Lancez l'installateur Windows. Le raccourci sur le bureau est sélectionné par défaut ; vous pouvez le désactiver. Ouvrez ensuite l'application depuis le bureau.", portable: "EXE portable · sans installation" },
  es: { title: "Instalar y abrir", instructions: "Ejecuta el instalador de Windows. El acceso directo del escritorio está activado por defecto y se puede desactivar. Después abre la aplicación desde el escritorio.", portable: "EXE portátil · sin instalación" },
  it: { title: "Installa e avvia", instructions: "Esegui l'installer Windows. Il collegamento sul desktop è preselezionato e può essere disattivato. Dopo l'installazione apri l'app dal desktop.", portable: "EXE portatile · senza installazione" },
  pt: { title: "Instalar e iniciar", instructions: "Execute o instalador do Windows. O atalho no ambiente de trabalho vem selecionado e pode ser desativado. Depois abra a aplicação pelo atalho.", portable: "EXE portátil · sem instalação" },
  nl: { title: "Installeren en openen", instructions: "Start het Windows-installatieprogramma. De snelkoppeling op het bureaublad is standaard geselecteerd en kan worden uitgeschakeld. Open daarna de app via het bureaublad.", portable: "Draagbare EXE · geen installatie" },
  pl: { title: "Instalacja i uruchomienie", instructions: "Uruchom instalator Windows. Skrót na pulpicie jest domyślnie włączony; możesz go wyłączyć. Po instalacji otwórz aplikację z pulpitu.", portable: "Przenośny EXE · bez instalacji" },
  ru: { title: "Установка и запуск", instructions: "Запустите установщик Windows. Ярлык на рабочем столе включён по умолчанию; его можно отключить. После установки откройте приложение с рабочего стола.", portable: "Портативный EXE · без установки" },
  ar: { title: "التثبيت والتشغيل", instructions: "شغّل مثبّت Windows. اختصار سطح المكتب محدد افتراضيًا ويمكنك إلغاء تحديده. بعد التثبيت افتح التطبيق من سطح المكتب.", portable: "ملف EXE محمول · بلا تثبيت" },
  ja: { title: "インストールと起動", instructions: "Windows インストーラーを実行します。デスクトップショートカットは初期設定でオンですが、オフにもできます。インストール後はデスクトップから起動できます。", portable: "ポータブル EXE · インストール不要" },
  ko: { title: "설치 및 실행", instructions: "Windows 설치 프로그램을 실행하세요. 바탕 화면 바로 가기는 기본으로 선택되며 해제할 수 있습니다. 설치 후 바탕 화면에서 앱을 실행하세요.", portable: "포터블 EXE · 설치 불필요" },
  zh: { title: "安装与启动", instructions: "运行 Windows 安装程序。桌面快捷方式默认选中，也可以取消。安装后从桌面启动应用。", portable: "便携版 EXE · 无需安装" },
};

export function generateStaticParams() {
  return locales.flatMap((locale) => applications.map((app) => ({ locale, id: app.id })));
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
  const features = app.id === "ipcast" ? dict.ipcast.features
    : scanner.features;
  const intro = app.id === "ipcast" ? dict.ipcast.subtitle
    : scanner.intro;
  const ProductHeading = app.id === "scanner" ? "h2" : "h1";
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:py-20">
      <Link href={`/${locale}/download`} className="text-sm text-neutral-300 underline underline-offset-4 hover:text-white">← {copy.applications}</Link>
      {app.id === 'scanner' && <ScannerV4 locale={locale} primary />}
      <div className="mt-10 grid gap-10 border-y border-white/15 py-12 lg:grid-cols-[1.3fr_1fr] lg:gap-20 lg:py-20">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-neutral-400">IPScans / {app.name} / Windows</p>
          <Image src={app.icon} alt="" width={96} height={96} className="mt-8 rounded-2xl" />
          <ProductHeading className="mt-8 font-[family-name:var(--font-display)] text-[clamp(3.5rem,8vw,7rem)] leading-none font-semibold tracking-[-0.07em]">{app.name}<span className="text-neutral-500">.</span></ProductHeading>
          <p className="mt-7 max-w-xl text-xl leading-relaxed text-neutral-300">{app.description[locale]}</p>
          <p className="mt-5 max-w-xl leading-relaxed text-neutral-400">{intro}</p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <a href={app.downloadUrl} className="btn-primary inline-flex min-h-12 items-center rounded-lg px-6 text-sm font-semibold">{copy.downloadApp} ↓</a>
            {app.id !== "scanner" && <Link href={`/${locale}${app.detailPath}`} className="btn-ghost inline-flex min-h-12 items-center rounded-lg px-6 text-sm">{copy.details} ↗</Link>}
          </div>
          <section className="mt-12 max-w-xl border-t border-white/15 pt-7">
            <h2 className="text-lg font-semibold">{install.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-neutral-300">{install.instructions}</p>
            <a href={app.portableUrl} className="mt-5 inline-flex min-h-11 items-center text-sm text-neutral-300 underline underline-offset-4 hover:text-white">{install.portable} ↗</a>
          </section>
        </div>
        <aside className="border-t border-white/15 pt-8 lg:border-s lg:border-t-0 lg:ps-10 lg:pt-0">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">{app.name} / {copy.details}</h2>
          <ul className="mt-7 space-y-4">
            {features.map((feature) => <li key={feature} className="flex gap-4 border-b border-white/10 pb-4 text-sm leading-relaxed text-neutral-300"><span aria-hidden="true" className="text-white">↗</span>{feature}</li>)}
          </ul>
          <dl className="mt-8 grid grid-cols-2 gap-5 font-mono text-xs">
            <div><dt className="text-neutral-400">{copy.platform}</dt><dd className="mt-2">{app.platform}</dd></div>
            <div><dt className="text-neutral-400">{copy.version}</dt><dd className="mt-2">{app.version}</dd></div>
            <div><dt className="text-neutral-400">{copy.size}</dt><dd className="mt-2">{(app.installerBytes / 1024 / 1024).toFixed(1)} MiB</dd></div>
          </dl>
          <dl className="mt-6 font-mono text-xs"><dt className="text-neutral-400">{copy.checksum} · {uiText(locale, "Windows installer", "Windows kurulum paketi")}</dt><dd className="mt-2 break-all select-all text-neutral-200">{app.installerSha256}</dd></dl>
          {app.id === "scanner" && <>
            <dl className="mt-6 font-mono text-xs">
              <dt className="text-neutral-400">{copy.size} · {uiText(locale, "Portable EXE", "Taşınabilir EXE")}</dt>
              <dd className="mt-2">{(app.portableBytes / 1024 / 1024).toFixed(1)} MiB</dd>
              <dt className="mt-4 text-neutral-400">{copy.checksum} · {uiText(locale, "Portable EXE", "Taşınabilir EXE")}</dt>
              <dd className="mt-2 break-all select-all text-neutral-200">{app.portableSha256}</dd>
            </dl>
            <a href={app.releaseUrl} className="mt-6 inline-flex min-h-11 items-center text-sm text-neutral-300 underline underline-offset-4 hover:text-white">{scanner.releaseNotes} ↗</a>
          </>}
          <p className="mt-8 text-sm leading-relaxed text-neutral-400">{app.id === "scanner" ? scanner.limitations
            : dict.ipcast.note}</p>
        </aside>
      </div>
      {app.id === "scanner" && <section className="py-16 sm:py-24" aria-labelledby="map-preview-title">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-neutral-400">IPscans+ / {uiText(locale, "Network evidence", "Ağ kanıtları")}</p>
        <h2 id="map-preview-title" className="mt-4 max-w-2xl font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight sm:text-5xl">{uiText(locale, "Network map", "Ağ haritası")}<span className="text-neutral-500">.</span></h2>
        <p className="mt-5 max-w-2xl leading-relaxed text-neutral-300">{scanner.mapIntro}</p>
        <div className="mt-10 grid gap-px border border-white/15 bg-white/15 md:grid-cols-3">
          {[
            { code: uiText(locale, "01 / VERIFIED", "01 / DOĞRULANDI"), title: "LLDP", description: uiText(locale, "Neighbor MAC announced through authorized SNMP", "Yetkili SNMP ile ilan edilmiş komşu MAC eşleşmesi") },
            { code: uiText(locale, "02 / INFERRED", "02 / ÇIKARIMSAL"), title: uiText(locale, "Gateway path", "Ağ geçidi yolu"), description: uiText(locale, "Shared gateway; physical switch port unknown", "Ortak ağ geçidi; fiziksel anahtar portu bilinmiyor") },
            { code: uiText(locale, "03 / UNKNOWN", "03 / BİLİNMİYOR"), title: uiText(locale, "Unmapped", "Eşlenmemiş"), description: uiText(locale, "No connection is invented without evidence", "Kanıt yoksa bağlantı uydurulmaz") },
          ].map((entry) => <div key={entry.code} className="bg-black p-7">
            <span className="font-mono text-xs tracking-widest text-neutral-400">{entry.code}</span>
            <h3 className="mt-8 text-2xl font-semibold">{entry.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-300">{entry.description}</p>
          </div>)}
        </div>
      </section>}
    </div>
  );
}
