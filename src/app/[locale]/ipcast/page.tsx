import Image from "next/image";
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
  tr: "Windows 10/11 (64 bit) · 1.1 Preview. Yeni logo ve daha okunaklı arayüz; dengeli, hız ve kalite modları; değişmeyen ekranlarda daha az veri aktarımı. Relay otomatik ayarlanır. İki bilgisayarda da yeni sürümü açın ve karşı cihazın 9 haneli kimliğiyle bağlanın. İlk bağlantıda sertifikayı doğrulayın ve karşı tarafta erişimi onaylayın. Yavaş ağlarda, ekranı paylaşılan bilgisayarda Settings → Display performance → Speed seçip yeniden bağlanın. Deneme sürümüdür; gerçek hız ağ ve cihazınıza bağlıdır.",
  en: "Windows 10/11 (64-bit) · 1.1 Preview. New logo and clearer interface; Balanced, Speed and Quality modes; less traffic on unchanged screens. Relay is automatic. Open the new version on both computers and connect with the remote 9-digit ID. Verify the certificate on first connection and approve access on the other device. On slower networks, choose Settings → Display performance → Speed on the shared computer, then reconnect. Preview release; actual performance depends on your devices and network.",
  de: "Windows 10/11 (64 Bit) · 1.1 Preview. Neues Logo, übersichtlichere Oberfläche, Balanced-, Speed- und Quality-Modi und weniger Daten bei unverändertem Bildschirm. Der Relay ist automatisch eingerichtet. Öffnen Sie die neue Version auf beiden Computern und verbinden Sie sich mit der neunstelligen Geräte-ID. Prüfen Sie das Zertifikat und bestätigen Sie den Zugriff. Bei langsamen Netzen wählen Sie am freigegebenen Computer Settings → Display performance → Speed und verbinden Sie sich erneut. Testversion; die Leistung hängt von Geräten und Netzwerk ab.",
  fr: "Windows 10/11 (64 bits) · 1.1 Preview. Nouveau logo, interface plus lisible, modes Balanced, Speed et Quality, moins de données quand l’écran reste inchangé. Relais automatique. Ouvrez cette version sur les deux ordinateurs et utilisez l’identifiant à 9 chiffres. Vérifiez le certificat et acceptez l’accès sur l’autre appareil. Sur un réseau lent, choisissez Settings → Display performance → Speed sur l’ordinateur partagé, puis reconnectez-vous. Version de test ; les performances dépendent des appareils et du réseau.",
  es: "Windows 10/11 (64 bits) · 1.1 Preview. Nuevo logo, interfaz más legible, modos Balanced, Speed y Quality y menos tráfico con pantallas sin cambios. Relay automático. Abre esta versión en ambos ordenadores y conecta con el identificador de 9 dígitos. Verifica el certificado y acepta el acceso en el otro dispositivo. En redes lentas, selecciona Settings → Display performance → Speed en el ordenador compartido y vuelve a conectar. Versión de prueba; el rendimiento depende del equipo y la red.",
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
          <Image src="/ipcast-mark.svg" alt="IPCast" width={72} height={72} className="mb-5" />
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
            href="https://github.com/demiirrr25-create/ipscans-depo/releases/download/v1.1.0-preview.1/IPCast-1.1.0-preview.1.exe"
            aria-describedby="ipcast-release-notes"
            className="btn-primary mt-8 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-semibold"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {t.button}
          </a>

          <div id="ipcast-release-notes" className="mt-5 rounded-xl border border-white/15 bg-white/5 p-4 text-sm leading-relaxed text-neutral-200">
            <p>{connectionNotes[locale]}</p>

          </div>
          <p className="mt-4 text-xs text-neutral-400">{t.note}</p>
          <p className="mt-2 text-xs text-neutral-400">{t.safe}</p>
        </div>
      </div>
    </PageShell>
  );
}
