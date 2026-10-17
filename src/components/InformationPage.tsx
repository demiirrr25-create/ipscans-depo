import Link from "next/link";
import { PageShell } from "./PageShell";
import { getDictionary } from "@/i18n/dictionaries";
import { applications } from "@/content/applications";

export const informationTitles = {
  tr: {
    about: "Ağı anlamakla başlar.",
    support: "Bir sonraki adım, net.",
    contact: "İletişimde kalalım.",
  },
  en: {
    about: "It starts with understanding.",
    support: "A clear next step.",
    contact: "Stay connected.",
  },
};

export function InformationPage({
  locale,
  page,
}: {
  locale: "tr" | "en";
  page: "about" | "support" | "contact";
}) {
  const tr = locale === "tr";
  const dict = getDictionary(locale);
  return (
    <PageShell
      title={informationTitles[locale][page]}
      subtitle={
        tr
          ? "IPScans / Ağ araçları, ürün bilgileri ve yardım"
          : "IPScans / Network tools, product information and help"
      }
    >
      <nav className="article-breadcrumb">
        <Link href={`/${locale}`}>IPScans</Link>
        <span>/</span>
        <span>{page}</span>
      </nav>

      {page === "about" && (
        <div className="grid gap-8 md:grid-cols-2">
          <div className="agy-surface-card prose-ipscans p-7 sm:p-10">
            <h2>
              {tr
                ? "Görünürlük. Bağlam. Kontrol."
                : "Visibility. Context. Control."}
            </h2>
            <p>
              {tr
                ? "IPScans; IP sorgulama, DNS, WHOIS, port kontrolü ve bağlantı ölçümünü masaüstü ağ araçlarıyla bir araya getirir. Bir sorgunun sonucunu görmek kadar, o sonucun nasıl elde edildiğini anlamak da önemlidir."
                : "IPScans brings IP lookup, DNS, WHOIS, port checks and connection measurements together with desktop network tools. Understanding how a result was obtained matters as much as seeing the result."}
            </p>
            <p>
              {tr
                ? "IPscans+ yerel ağ keşfi için Windows üzerinde çalışır. IPCast cihaz kimliği ve erişim onayıyla uzak masaüstü bağlantısı sunar. LPR Pro, yerel plaka tanıma ve kayıt inceleme için bir değerlendirme sürümüdür. Her ürünün yetenekleri ve sınırlamaları kendi sayfasında açıklanır."
                : "IPscans+ runs on Windows for local network discovery. IPCast provides remote desktop connections with device identity and access approval. LPR Pro is an evaluation release for local plate recognition and record review. Each product documents its capabilities and limitations on its own page."}
            </p>
          </div>
          <div className="agy-surface-card p-7 sm:p-10">
            <p className="agy-eyebrow">DESKTOP / WEB</p>
            <h2 className="heading-4 mt-5">
              {tr
                ? "Sonuçların sınırlarını bilin."
                : "Know the limits of a result."}
            </h2>
            <p className="body mt-5 text-neutral-300">
              {tr
                ? "Tarayıcı yerel ağı doğrudan tarayamaz. IP konumu kesin bir fiziksel adres değildir. Hız testi o anda tarayıcı ile test uç noktası arasındaki aktarımı ölçer. Ürün kararlarını bu bağlamla verin."
                : "A browser cannot directly scan your LAN. IP geolocation is not a precise street address. A speed test measures the current transfer between your browser and the test endpoint. Make decisions with that context."}
            </p>
            <div className="mt-8">
              <Link
                className="button button-primary"
                href={`/${locale}/download`}
              >
                <span>
                  {tr ? "Ürünleri keşfet" : "Explore products"} ↗
                </span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {page === "support" && (
        <>
          <div className="grid gap-6 md:grid-cols-3">
            {applications.map((app) => (
              <Link
                key={app.id}
                href={`/${locale}/applications/${app.id}`}
                className="agy-surface-card p-7 transition-colors hover:border-white/25 hover:bg-[#17191f]"
              >
                <p className="agy-eyebrow">WINDOWS / {app.version}</p>
                <h2 className="heading-5 mt-5">{app.name} ↗</h2>
                <p className="mt-3 text-sm text-neutral-400">
                  {app.description[locale]}
                </p>
              </Link>
            ))}
            <Link
              href={`/${locale}/blog`}
              className="agy-surface-card p-7 transition-colors hover:border-white/25 hover:bg-[#17191f]"
            >
              <p className="agy-eyebrow">FIELD NOTES</p>
              <h2 className="heading-5 mt-5">{dict.blog.title} ↗</h2>
              <p className="mt-3 text-sm text-neutral-400">
                {dict.blog.subtitle}
              </p>
            </Link>
          </div>
          <div className="agy-surface-card mt-10 p-7 sm:p-10">
            {dict.experience.faq.map((entry) => (
              <details
                key={entry.question}
                className="border-b border-white/10 py-5 last:border-0"
              >
                <summary className="min-h-11 cursor-pointer text-lg font-medium text-white">
                  {entry.question}
                </summary>
                <p className="mt-3 leading-8 text-neutral-300">
                  {entry.answer}
                </p>
              </details>
            ))}
          </div>
          <div className="agy-surface-card prose-ipscans mt-10 p-7 sm:p-10">
            <h2>
              {tr ? "Kurulum ve indirme" : "Installation and downloads"}
            </h2>
            <ol>
              <li>
                {tr
                  ? "Ürün sayfasından işletim sisteminize uygun dosyayı seçin."
                  : "Select the appropriate file for your operating system on the product page."}
              </li>
              <li>
                {tr
                  ? "Dosyanın kaydedileceği yeri tarayıcınız yönetir; indirmeler listesinden dosyayı bulun."
                  : "Your browser controls the save location; find the file in its downloads list."}
              </li>
              <li>
                {tr
                  ? "Varsa SHA-256 değerini ürün sayfasındaki değerle karşılaştırın; ardından kurulum yönergelerini izleyin."
                  : "Compare the SHA-256 checksum with the product page when available, then follow the installation instructions."}
              </li>
            </ol>
          </div>
        </>
      )}

      {page === "contact" && (
        <div className="grid gap-8 md:grid-cols-2">
          <div className="agy-surface-card prose-ipscans p-7 sm:p-10">
            <h2>
              {tr
                ? "Teknik sorun veya ürün geri bildirimi"
                : "Technical issue or product feedback"}
            </h2>
            <p>
              {tr
                ? "Mevcut GitHub deposundaki Issues alanını kullanabilirsiniz. Ürün adı, sürüm, işletim sistemi, sorunun tekrar adımları ve beklenen davranışı ekleyin."
                : "Use the Issues area of the existing GitHub repository. Include the product name, version, operating system, steps to reproduce and expected behavior."}
            </p>
            <p>
              {tr
                ? "Herkese açık kayıtlara parola, erişim anahtarı, özel IP envanteri veya müşteri görüntüsü eklemeyin. Hassas bilgileri ekran görüntülerinden kaldırın."
                : "Do not include passwords, access keys, private inventories or customer footage in public reports. Remove sensitive information from screenshots."}
            </p>
            <div className="mt-6">
              <a
                className="button button-primary no-underline"
                href="https://github.com/demiirrr25-create/ipscans-depo/issues"
              >
                <span>
                  {tr ? "GitHub Issues alanını aç" : "Open GitHub Issues"} ↗
                </span>
              </a>
            </div>
          </div>
          <div className="agy-surface-card prose-ipscans p-7 sm:p-10">
            <h2>{tr ? "Gizlilik soruları" : "Privacy questions"}</h2>
            <p>
              {tr
                ? "Mevcut gizlilik politikasında belirtilen iletişim adresi:"
                : "Contact address listed in the existing privacy policy:"}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                className="button button-secondary no-underline"
                href="mailto:privacy@ipscans.com"
              >
                <span>privacy@ipscans.com ↗</span>
              </a>
              <Link
                className="button button-secondary no-underline"
                href={`/${locale}/privacy`}
              >
                <span>{dict.footer.privacy}</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
