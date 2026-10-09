import translations from './legal-locales.json';
import type { Locale } from "@/i18n/config";

/** Static, code-authored HTML — never derived from user input. */
type LocalizedHtml = Partial<Record<Locale, string>>;

export function localizedLegalText(field: LocalizedHtml, locale: Locale): string {
  return field[locale] ?? field.en ?? Object.values(field)[0] ?? "";
}

export const privacyPolicy: LocalizedHtml = {
  tr: `
    <p><em>Son güncelleme: 2026-09-27</em></p>
    <p>ipscans ("biz", "site"), ipscans.com üzerinden sunduğumuz IP sorgulama, DNS/WHOIS sorgulama, port kontrol ve hız testi araçlarını kullanırken gizliliğinizi önemsiyoruz. Bu politika, hangi verileri neden işlediğimizi açıklar.</p>
    <h2>Hesap ve kayıt gerekmez</h2>
    <p>Araçlarımızı kullanmak için hesap oluşturmanız veya kişisel bilgi girmeniz gerekmez.</p>
    <h2>Topladığımız veriler</h2>
    <ul>
      <li><strong>Sorgu girdileri:</strong> Girdiğiniz IP adresi, alan adı veya port bilgisi, sonucu göstermek için ilgili servislere (DNS, WHOIS, coğrafi konum veritabanları) iletilir. Bu girdileri kalıcı olarak saklamayız.</li>
      <li><strong>Otomatik IP tespiti:</strong> "Senin IP adresin" gibi özellikler, isteğinizi işlemek için sunucu tarafında bağlantı IP adresinizi kullanır.</li>
      <li><strong>Kullanım/analitik veriler:</strong> Vercel Analytics ve (etkinleştirildiğinde) Google Analytics aracılığıyla anonimleştirilmiş kullanım istatistikleri (sayfa görüntüleme, cihaz/tarayıcı türü, yaklaşık konum) toplanabilir.</li>
      <li><strong>Çerezler ve reklam:</strong> Reklam ortağımız Google (AdSense) etkinleştirildiğinde, kişiselleştirilmiş veya kişiselleştirilmemiş reklam sunmak için çerez kullanabilir. Çerez tercihinizi site üzerindeki onay bandından yönetebilirsiniz.</li>
    </ul>
    <h2>Verilerin kullanım amacı</h2>
    <p>Topladığımız sınırlı veriler yalnızca; araçların çalışmasını sağlamak, siteyi geliştirmek, kötüye kullanımı önlemek ve (izniniz varsa) reklam sunmak için kullanılır.</p>
    <h2>Üçüncü taraf hizmetler</h2>
    <p>Vercel (barındırma/analitik), Google (Analytics, AdSense, arama motoru), ve IP/DNS/WHOIS veri sağlayıcıları ile çalışıyoruz. Bu hizmetlerin kendi gizlilik politikaları geçerlidir.</p>
    <h2>Haklarınız</h2>
    <p>KVKK ve GDPR kapsamında, işlenen kişisel verileriniz hakkında bilgi talep etme, düzeltme veya silinmesini isteme hakkına sahipsiniz. Talepleriniz için bize ulaşabilirsiniz.</p>
    <h2>Çocukların gizliliği</h2>
    <p>Hizmetlerimiz 13 yaş altı çocuklara yönelik değildir ve bilerek onlardan veri toplamayız.</p>
    <h2>Değişiklikler</h2>
    <p>Bu politikayı zaman zaman güncelleyebiliriz; önemli değişiklikler bu sayfada yayınlanır.</p>
    <h2>İletişim</h2>
    <p>Sorularınız için: privacy@ipscans.com</p>
  `,
  en: `
    <p><em>Last updated: 2026-09-27</em></p>
    <p>ipscans ("we", "the site") cares about your privacy while you use our IP lookup, DNS/WHOIS lookup, port checking, and speed test tools at ipscans.com. This policy explains what data we process and why.</p>
    <h2>No account required</h2>
    <p>You don't need to create an account or provide personal information to use our tools.</p>
    <h2>What we collect</h2>
    <ul>
      <li><strong>Query inputs:</strong> The IP address, domain name, or port you enter is forwarded to the relevant lookup services (DNS, WHOIS, geolocation databases) to produce a result. We don't permanently store these inputs.</li>
      <li><strong>Automatic IP detection:</strong> Features like "Your IP address" use your connection's IP address server-side to process the request.</li>
      <li><strong>Usage/analytics data:</strong> Vercel Analytics and, where enabled, Google Analytics may collect anonymized usage statistics (page views, device/browser type, approximate location).</li>
      <li><strong>Cookies and advertising:</strong> When enabled, our advertising partner Google (AdSense) may use cookies to serve personalized or non-personalized ads. You can manage your cookie preference via the consent banner on the site.</li>
    </ul>
    <h2>How we use data</h2>
    <p>The limited data we collect is used only to operate the tools, improve the site, prevent abuse, and (with your consent) serve advertising.</p>
    <h2>Third-party services</h2>
    <p>We work with Vercel (hosting/analytics), Google (Analytics, AdSense, Search), and IP/DNS/WHOIS data providers. Their own privacy policies apply to their processing.</p>
    <h2>Your rights</h2>
    <p>Depending on your jurisdiction (e.g. GDPR, KVKK), you may have the right to request access to, correction of, or deletion of your personal data. Contact us to exercise these rights.</p>
    <h2>Children's privacy</h2>
    <p>Our services are not directed at children under 13, and we do not knowingly collect data from them.</p>
    <h2>Changes</h2>
    <p>We may update this policy from time to time; material changes will be posted on this page.</p>
    <h2>Contact</h2>
    <p>Questions? Reach us at privacy@ipscans.com</p>
  `,
};

export const termsOfService: LocalizedHtml = {
  tr: `
    <p><em>Son güncelleme: 2026-09-27</em></p>
    <h2>Hizmetin kabulü</h2>
    <p>ipscans.com'u kullanarak bu kullanım koşullarını kabul etmiş sayılırsınız. Kabul etmiyorsanız siteyi kullanmayınız.</p>
    <h2>Hizmet tanımı</h2>
    <p>ipscans; IP sorgulama, DNS/WHOIS sorgulama, port kontrol ve internet hız testi gibi araçları ücretsiz olarak sunar. Araçlar "olduğu gibi" ve herhangi bir garanti verilmeksizin sağlanır.</p>
    <h2>Kabul edilebilir kullanım</h2>
    <ul>
      <li>Araçları yalnızca yasal amaçlarla kullanmayı kabul edersiniz.</li>
      <li>Port kontrol aracını yalnızca sahibi olduğunuz veya izin aldığınız sistemler üzerinde kullanmalısınız. İzinsiz tarama, yerel yasalara aykırı olabilir.</li>
      <li>Servislerimizi otomatikleştirilmiş, aşırı yük bindiren veya kötüye kullanım amaçlı sorgularla (örneğin DDoS, spam) kullanmak yasaktır.</li>
    </ul>
    <h2>Sorumluluk sınırlaması</h2>
    <p>Sonuçların doğruluğu üçüncü taraf veri kaynaklarına bağlıdır; eksiksizlik veya kesintisiz erişim garanti edilmez. ipscans, hizmetin kullanımından doğabilecek doğrudan veya dolaylı zararlardan sorumlu tutulamaz.</p>
    <h2>Fikri mülkiyet</h2>
    <p>Site tasarımı, logosu ve içerikleri ipscans'e aittir; izinsiz kopyalanamaz veya ticari amaçla yeniden dağıtılamaz.</p>
    <h2>Değişiklikler ve sonlandırma</h2>
    <p>Hizmeti veya bu koşulları önceden bildirmeksizin değiştirme veya durdurma hakkını saklı tutarız.</p>
    <h2>İletişim</h2>
    <p>Sorularınız için: legal@ipscans.com</p>
  `,
  en: `
    <p><em>Last updated: 2026-09-27</em></p>
    <h2>Acceptance of terms</h2>
    <p>By using ipscans.com you agree to these terms. If you do not agree, please do not use the site.</p>
    <h2>Description of service</h2>
    <p>ipscans provides free tools including IP lookup, DNS/WHOIS lookup, port checking, and internet speed testing. Tools are provided "as is" without warranties of any kind.</p>
    <h2>Acceptable use</h2>
    <ul>
      <li>You agree to use the tools only for lawful purposes.</li>
      <li>The port-checking tool should only be used against systems you own or are authorized to test. Unauthorized scanning may violate local laws.</li>
      <li>Automated, abusive, or excessive use of our services (e.g. DDoS, spamming queries) is prohibited.</li>
    </ul>
    <h2>Limitation of liability</h2>
    <p>Result accuracy depends on third-party data sources; completeness or uninterrupted access is not guaranteed. ipscans is not liable for direct or indirect damages arising from use of the service.</p>
    <h2>Intellectual property</h2>
    <p>The site's design, logo, and content belong to ipscans and may not be copied or redistributed for commercial purposes without permission.</p>
    <h2>Changes and termination</h2>
    <p>We reserve the right to modify or discontinue the service or these terms without prior notice.</p>
    <h2>Contact</h2>
    <p>Questions? Reach us at legal@ipscans.com</p>
  `,
};

for(const [key,value] of Object.entries(translations)) {
  const locale=key as Locale;
  privacyPolicy[locale]=value.privacy;
  termsOfService[locale]=value.terms;
}
