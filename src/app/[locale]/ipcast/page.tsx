import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { PageShell } from "@/components/PageShell";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale).ipcast;
  return { title: t.title, description: t.subtitle, alternates: { canonical: `/${locale}/ipcast` } };
}

const connectionNotes = {
  tr: "Windows 10/11 (64 bit). Yerel bağlantıda iki cihazda da IPCast açık olmalıdır. Farklı internet ağları arasında bağlantı için iki cihazda aynı çalışan relay sunucusunu yapılandırın. Henüz herkese açık bir IPCast relay hizmeti sunulmuyor.",
  en: "Windows 10/11 (64-bit). Keep IPCast open on both devices. Connections across different networks require the same running relay server configured on both devices. A public IPCast relay service is not yet available.",
  de: "Windows 10/11 (64 Bit). IPCast muss auf beiden Geräten geöffnet sein. Für verschiedene Netzwerke muss auf beiden Geräten derselbe laufende Relay-Server eingerichtet sein. Ein öffentlicher IPCast-Relay-Dienst ist noch nicht verfügbar.",
  fr: "Windows 10/11 (64 bits). Ouvrez IPCast sur les deux appareils. Entre réseaux différents, configurez le même serveur relais actif sur les deux appareils. Aucun service relais public IPCast n’est encore disponible.",
  es: "Windows 10/11 (64 bits). Mantén IPCast abierto en ambos dispositivos. Entre redes diferentes, configura el mismo servidor relay activo en ambos dispositivos. Todavía no hay un servicio relay público de IPCast.",
};

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
      <div className="mx-auto max-w-xl">
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-5 sm:p-8">
          <span className="inline-block rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-neutral-300">
            {t.badge}
          </span>

          <ul className="mt-6 space-y-3">
            {t.features.map((f) => (
              <li key={f} className="flex items-start gap-3 text-sm text-neutral-200">
                <svg
                  className="mt-0.5 shrink-0 text-blue-400"
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

          <a
            href="https://github.com/demiirrr25-create/ipscans-depo/releases/download/ipcast-latest/IPCast.exe"
            className="btn-primary mt-8 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-semibold"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {t.button}
          </a>

          <p className="mt-5 rounded-xl border border-white/15 bg-white/5 p-4 text-sm leading-relaxed text-neutral-200">{connectionNotes[locale]}</p>
          <p className="mt-4 text-xs text-neutral-400">{t.note}</p>
          <p className="mt-2 text-xs text-neutral-400">{t.safe}</p>
        </div>
      </div>
    </PageShell>
  );
}
