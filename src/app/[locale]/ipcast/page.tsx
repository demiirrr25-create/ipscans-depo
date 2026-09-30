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
  tr: "Windows 10/11 (64 bit) · 1.0.1 Preview 2. Relay otomatik olarak ayarlanır; adres veya relay kodu girmeniz gerekmez. Eski IPCast pencerelerini kapatıp iki bilgisayarda da bu sürümü açın. Karşı bilgisayarın 9 haneli cihaz kimliğini girin ve karşı tarafta bağlantıyı onaylayın. İlk bağlantıda sertifika parmak izini karşı cihazla doğrulayın. İki fiziksel bilgisayarda kabul testi henüz tamamlanmadı.",
  en: "Windows 10/11 (64-bit) · 1.0.1 Preview 2. Relay is configured automatically; no relay address or setup code is needed. Close older IPCast windows and open this version on both computers. Enter the other computer’s 9-digit device ID and accept the connection there. Verify the certificate fingerprint with the other device on first connection. Acceptance testing on two physical computers is still pending.",
  de: "Windows 10/11 (64 Bit) · 1.0.1 Preview 2. Der Relay wird automatisch eingerichtet; keine Relay-Adresse oder Einrichtungscodes erforderlich. Schließen Sie ältere IPCast-Fenster und öffnen Sie diese Version auf beiden Computern. Geben Sie die neunstellige Geräte-ID des anderen Computers ein und bestätigen Sie dort die Verbindung. Prüfen Sie beim ersten Verbinden den Zertifikatsfingerabdruck. Der Abnahmetest mit zwei physischen Computern steht noch aus.",
  fr: "Windows 10/11 (64 bits) · 1.0.1 Preview 2. Le relais est configuré automatiquement, sans adresse ni code de configuration. Fermez les anciennes fenêtres IPCast et ouvrez cette version sur les deux ordinateurs. Saisissez l’identifiant à 9 chiffres de l’autre appareil et acceptez la connexion sur celui-ci. Vérifiez l’empreinte du certificat lors de la première connexion. La validation sur deux ordinateurs physiques reste à effectuer.",
  es: "Windows 10/11 (64 bits) · 1.0.1 Preview 2. El relay se configura automáticamente; no requiere dirección ni código de configuración. Cierra las ventanas antiguas de IPCast y abre esta versión en ambos ordenadores. Introduce el identificador de 9 dígitos del otro dispositivo y acepta la conexión allí. Verifica la huella del certificado en la primera conexión. La prueba de aceptación en dos ordenadores físicos sigue pendiente.",
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
            href="https://github.com/demiirrr25-create/ipscans-depo/releases/download/v1.0.1-preview.2/IPCast-1.0.1-preview.2.exe"
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
