import Image from "next/image";
import type { Locale } from "@/i18n/config";
import { platformCopy } from "@/content/applications";
import apps from "../../../public/desktop/apps.json";

export function ProductShowcase({ locale }: { locale: Locale }) {
  const lang = locale === "tr" ? "tr" : "en";
  return (
    <section id="lineup" className="ds-section border-y border-line bg-surface-dim">
      <div className="ds-container">
        <p className="ds-eyebrow">Windows x64 · Rust · {apps[0].version}</p>
        <h2 className="ds-h2 mt-2 text-ink">{platformCopy[locale].applications}</h2>
        <p className="ds-lead mt-4 text-ink-2">
          {lang === "tr" ? "Sekiz masaüstü aracının ön sürümünü ve arayüzlerini inceleyin." : "Explore the preview release and interfaces of all eight desktop tools."}
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {apps.map((app) => (
            <a key={app.id} href={`/desktop/${lang}.html#${app.id}`} className="ds-card flex flex-col gap-3 p-6 text-ink hover:border-line-3">
              <Image src={`/brand/${app.id}-logo.png`} width={44} height={44} alt="" />
              <h3 className="text-lg font-semibold">{app.name}</h3>
              <p className="text-sm text-ink-2">{app[lang]}</p>
              {app.preview && <Image src={app.preview} width={480} height={300} className="mt-auto h-auto w-full rounded-md" alt="" />}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
