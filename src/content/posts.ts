import type { Locale } from "@/i18n/config";
import { networkGuides } from './network-guides';

export type Post = {
  slug: string;
  date: string;
  category?: string;
  // Only tr/en are fully translated today; other locales fall back to English.
  title: Partial<Record<Locale, string>>;
  excerpt: Partial<Record<Locale, string>>;
  /** Static, code-authored HTML — never derived from user input. */
  body: Partial<Record<Locale, string>>;
};

export function localizedPostText(
  field: Partial<Record<Locale, string>>,
  locale: Locale
): string {
  return field[locale] ?? field.en ?? Object.values(field)[0] ?? "";
}

export const posts: Post[] = [
  ...networkGuides,
  {
    slug: "ip-adresi-nedir",
    date: "2026-09-15",
    title: {
      tr: "IP Adresi Nedir ve Nasıl Çalışır?",
      en: "What Is an IP Address and How Does It Work?",
    },
    excerpt: {
      tr: "IP adreslerinin temelleri, IPv4 ve IPv6 arasındaki farklar ve internetin nasıl adresleme yaptığı.",
      en: "The basics of IP addresses, the difference between IPv4 and IPv6, and how the internet handles addressing.",
    },
    body: {
      tr: `
        <p>IP adresi, bir ağ arayüzünün belirli bir ağ kapsamındaki sayısal adresidir. Bir cihazın birden fazla IP adresi olabilir; özel adresler farklı ağlarda tekrar kullanılabilir. Bir mektubun üzerindeki adres gibi düşünebilirsin: veri paketlerinin doğru cihaza ulaşması için gereklidir.</p>
        <h2>IPv4 ve IPv6 arasındaki fark nedir?</h2>
        <p><strong>IPv4</strong> adresleri 32 bit uzunluğundadır ve <code>192.168.1.1</code> gibi dört bölümden oluşur. Toplam adres alanı yaklaşık 4,3 milyar adresle sınırlıdır; genel adres tahsisindeki kıtlık NAT gibi yöntemlerin yaygınlaşmasına yol açmıştır. <strong>IPv6</strong> ise 128 bit uzunluğunda olup <code>2001:0db8:85a3::8a2e:0370:7334</code> gibi yazılır ve pratik olarak tükenmeyecek kadar geniş bir adres alanı sunar.</p>
        <h2>Genel (public) ve yerel (private) IP farkı</h2>
        <ul>
          <li><strong>Genel IP:</strong> İnternet servis sağlayıcın tarafından sana atanan, internette görünen adres.</li>
          <li><strong>Yerel IP:</strong> Ev veya ofis ağındaki cihazları birbirinden ayıran, yönlendiricinin dağıttığı adres (örn. 192.168.x.x).</li>
        </ul>
        <p>Bir web sitesine bağlandığında tarayıcın, hedef sunucunun IP adresini DNS üzerinden çözer, ardından veri paketleri bu adres üzerinden gidip gelir. IP adresini öğrenmek istersen <a href="/tr/ip-sorgulama">IP sorgulama aracımızı</a> kullanabilirsin.</p>
        <h2>IP adresin neden önemli?</h2>
        <p>Yaklaşık konumunu, internet servis sağlayıcını ve bazı durumlarda organizasyonunu ortaya çıkarabilir. Bu yüzden VPN kullanımı, gizlilik odaklı kullanıcılar arasında yaygınlaşmıştır.</p>
      `,
      en: `
        <p>An IP address identifies a network interface within an addressing scope. A device may have several addresses, and private addresses can be reused across separate networks. Think of it like the address on an envelope — it's how data packets know where to go.</p>
        <h2>What's the difference between IPv4 and IPv6?</h2>
        <p><strong>IPv4</strong> addresses are 32 bits long, written as four segments like <code>192.168.1.1</code>. The total address space is about 4.3 billion; scarcity of public allocations has encouraged extensive use of NAT. <strong>IPv6</strong> is 128 bits long, written like <code>2001:0db8:85a3::8a2e:0370:7334</code>, and offers a practically inexhaustible address space.</p>
        <h2>Public vs. private IP</h2>
        <ul>
          <li><strong>Public IP:</strong> The address your ISP assigns you that's visible on the internet.</li>
          <li><strong>Private IP:</strong> The address your router hands out to distinguish devices on your home or office network (e.g. 192.168.x.x).</li>
        </ul>
        <p>When you connect to a website, your browser resolves the destination server's IP via DNS, then data packets travel back and forth over that address. Want to check your own? Try our <a href="/en/ip-lookup">IP lookup tool</a>.</p>
        <h2>Why does your IP matter?</h2>
        <p>It can reveal your approximate location, ISP, and sometimes your organization — which is why privacy-conscious users increasingly rely on VPNs.</p>
      `,
    },
  },
  {
    slug: "internet-hizini-artirma",
    date: "2026-09-10",
    title: {
      tr: "İnternet Hızını Artırmanın 7 Yolu",
      en: "7 Ways to Improve Your Internet Speed",
    },
    excerpt: {
      tr: "Yavaş internetten kurtulmak için pratik ipuçları: yönlendirici yerleşimi, DNS ayarları ve daha fazlası.",
      en: "Practical tips to fix slow internet: router placement, DNS settings and more.",
    },
    body: {
      tr: `
        <p>Yavaş internet birçok farklı sebepten kaynaklanabilir. Aşağıdaki yedi adım, çoğu ev ve ofis ağında gözle görülür bir fark yaratır.</p>
        <ol>
          <li><strong>Yönlendiriciyi doğru yerleştir:</strong> Merkezi, açık ve yüksek bir konum, sinyal kaybını azaltır.</li>
          <li><strong>5 GHz bandını kullan:</strong> 2.4 GHz'e göre daha hızlıdır, ancak menzili biraz daha kısadır.</li>
          <li><strong>DNS sunucunu değiştir:</strong> <code>1.1.1.1</code> (Cloudflare) veya <code>8.8.8.8</code> (Google) gibi seçenekleri mevcut çözümleyicinle ölçerek karşılaştır. DNS değişikliği indirme bant genişliğini doğrudan artırmaz; kurumsal iç adları etkileyebilir.</li>
          <li><strong>Arka plan trafiğini kapat:</strong> Otomatik güncellemeler ve bulut senkronizasyonu bant genişliğini sessizce tüketir.</li>
          <li><strong>Kablolu bağlantıyı tercih et:</strong> Ethernet, Wi-Fi'nin çoğu zaman ulaşamayacağı stabiliteyi sağlar.</li>
          <li><strong>Yönlendirici yazılımını güncel tut:</strong> Üretici güncellemeleri performans ve güvenlik düzeltmeleri içerir.</li>
          <li><strong>Düzenli test yap:</strong> <a href="/tr/hiz-testi">Hız testi aracımızla</a> sağlayıcının vaat ettiği hızı gerçekten alıp almadığını doğrula.</li>
        </ol>
        <h2>Ne zaman ISS'ni aramalısın?</h2>
        <p>Kablolu bağlantıda bile testler vaat edilen hızın belirgin şekilde altında kalıyorsa, test saati, cihaz, Ethernet bağlantı hızı ve arka plan trafiğiyle birlikte ISS'ne ölçümleri ilet. Sonuç tek başına arızanın yerini kanıtlamaz.</p>
      `,
      en: `
        <p>Slow internet can stem from many different factors. The seven steps below make a noticeable difference in most home and office networks.</p>
        <ol>
          <li><strong>Place your router correctly:</strong> a central, open, elevated spot reduces signal loss.</li>
          <li><strong>Use the 5 GHz band:</strong> faster than 2.4 GHz, though with slightly shorter range.</li>
          <li><strong>Switch your DNS:</strong> <code>1.1.1.1</code> (Cloudflare) or <code>8.8.8.8</code> (Google) can be compared with your current resolver. Changing DNS does not directly increase download bandwidth and can affect internal name resolution.</li>
          <li><strong>Disable background traffic:</strong> automatic updates and cloud sync quietly eat bandwidth.</li>
          <li><strong>Prefer a wired connection:</strong> Ethernet delivers stability Wi-Fi often can't match.</li>
          <li><strong>Keep your router's firmware current:</strong> vendor updates include performance and security fixes.</li>
          <li><strong>Test regularly:</strong> use our <a href="/en/speed-test">speed test tool</a> to confirm you're actually getting the speed you're paying for.</li>
        </ol>
        <h2>When should you call your ISP?</h2>
        <p>If tests stay significantly below the promised speed even over a wired connection, record the device, link speed, time and background traffic before contacting your ISP. This result alone does not locate the fault.</p>
      `,
    },
  },
  {
    slug: "vpn-nedir",
    date: "2026-09-20",
    title: {
      tr: "VPN Nedir, Nasıl Çalışır ve Gerçekten Gerekli mi?",
      en: "What Is a VPN, How Does It Work, and Do You Really Need One?",
    },
    excerpt: {
      tr: "VPN'lerin trafiğini nasıl şifrelediğini, gizliliği nasıl etkilediğini ve ne zaman işe yaradığını anlaşılır şekilde açıklıyoruz.",
      en: "A clear look at how VPNs encrypt your traffic, how they affect your privacy, and when they actually help.",
    },
    body: {
      tr: `
        <p>VPN (Virtual Private Network), cihazın ile bir VPN sunucusu arasında şifreli bir "tünel" oluşturur. Bu tünel sayesinde internet servis sağlayıcın ve aynı ağdaki diğer kişiler trafiğinin içeriğini göremez.</p>
        <h2>VPN kullanınca IP adresin ne olur?</h2>
        <p>İnternete VPN sunucusunun IP adresi üzerinden çıkarsın. Ziyaret ettiğin siteler senin gerçek IP'ni değil, VPN sağlayıcının IP'sini görür. Bunu <a href="/tr/ip-sorgulama">IP sorgulama aracımızla</a> VPN açıp kapatarak test edebilirsin.</p>
        <h2>VPN neyi çözer, neyi çözmez?</h2>
        <ul>
          <li><strong>Yardımcı olabilir:</strong> Tünele yönlenen trafiği yerel ağdan gizlemeye ve uzak ağa erişmeye. Bölünmüş tünel, DNS yapılandırması ve sağlayıcı politikaları kapsamı değiştirir; tam anonimlik veya kısıtlamaları aşma garantisi vermez.</li>
          <li><strong>Çözmez:</strong> Giriş yaptığın hesaplar üzerinden seni tanımlanabilir kılan çerezleri, tarayıcı parmak izini veya kötü amaçlı yazılımları.</li>
        </ul>
        <h2>Nasıl bir VPN seçmeli?</h2>
        <p>"Log tutmuyoruz" iddiası bağımsız denetimle desteklenmiyorsa temkinli yaklaş. Ücretsiz VPN'lerin bir kısmı, gelirini kullanıcı verisini satarak elde eder — bu da amacın tam tersidir.</p>
      `,
      en: `
        <p>A VPN (Virtual Private Network) creates an encrypted "tunnel" between your device and a VPN server. Inside that tunnel, your ISP and anyone else on the same network can't see the contents of your traffic.</p>
        <h2>What happens to your IP when you use a VPN?</h2>
        <p>You appear to browse the internet from the VPN server's IP address. Sites you visit see the VPN provider's IP, not your real one. You can verify this yourself with our <a href="/en/ip-lookup">IP lookup tool</a> — check before and after connecting.</p>
        <h2>What a VPN fixes — and what it doesn't</h2>
        <ul>
          <li><strong>Can help:</strong> protect traffic routed through the tunnel from local observers and provide remote access. Split tunneling, DNS configuration and provider policies affect coverage; anonymity is not guaranteed.</li>
          <li><strong>Doesn't fix:</strong> being identified through logged-in accounts, browser fingerprinting, or malware.</li>
        </ul>
        <h2>How to choose a VPN</h2>
        <p>Be cautious of "no-logs" claims that aren't backed by an independent audit. Some free VPNs fund themselves by selling user data — which defeats the whole purpose.</p>
      `,
    },
  },
  {
    slug: "yaygin-port-numaralari-rehberi",
    date: "2026-09-05",
    title: {
      tr: "Yaygın Port Numaraları Rehberi: Sık Kullanılan Hizmetler",
      en: "A Guide to Common Port Numbers: Frequently Used Services",
    },
    excerpt: {
      tr: "80, 443, 22, 3389... Bu port numaraları ne anlama geliyor? Ağ ve güvenlik temelli bir rehber.",
      en: "80, 443, 22, 3389... what do these port numbers actually mean? A network and security primer.",
    },
    body: {
      tr: `
        <p>Bir port, bir sunucu üzerinde çalışan belirli bir servise yönlendiren sayısal bir kapı gibi düşünülebilir. IP adresi seni doğru cihaza, port numarası ise o cihazdaki doğru uygulamaya götürür.</p>
        <h2>En sık karşılaşılan portlar</h2>
        <ul>
          <li><strong>20/21 — FTP:</strong> Dosya transfer protokolü.</li>
          <li><strong>22 — SSH:</strong> Sunuculara güvenli uzaktan erişim.</li>
          <li><strong>25 — SMTP:</strong> E-posta gönderimi.</li>
          <li><strong>53 — DNS:</strong> Alan adı çözümleme.</li>
          <li><strong>80 — HTTP:</strong> Şifresiz web trafiği.</li>
          <li><strong>110 — POP3 / 143 — IMAP:</strong> E-posta alma protokolleri.</li>
          <li><strong>443 — HTTPS:</strong> Şifreli web trafiği; günümüzde web sitelerinin standardı.</li>
          <li><strong>3306 — MySQL:</strong> Veritabanı bağlantıları.</li>
          <li><strong>3389 — RDP:</strong> Windows uzak masaüstü bağlantısı.</li>
          <li><strong>8080 — HTTP-alt:</strong> Genellikle geliştirme ortamlarında veya proxy'lerde kullanılır.</li>
        </ul>
        <h2>Açık bir port ne zaman risk oluşturur?</h2>
        <p>Bir portun açık olması tek başına güvenlik açığı demek değildir; ancak gereksiz yere dışa açık bırakılmış yönetim portları (ör. 3389, 22) saldırganlar için ilk hedeftir. <a href="/tr/port-kontrol">Port kontrol aracımızla</a> hangi portların dışa açık olduğunu hızlıca görebilirsin.</p>
        <h2>Pratik öneri</h2>
        <p>Yönetim amaçlı portları mümkünse VPN arkasında tut, güçlü kimlik doğrulama kullan ve kullanılmayan servisleri kapat.</p>
      `,
      en: `
        <p>A port is like a numbered doorway that routes traffic to a specific service running on a server. The IP address gets you to the right device; the port number gets you to the right application on it.</p>
        <h2>The most common ports</h2>
        <ul>
          <li><strong>20/21 — FTP:</strong> file transfer protocol.</li>
          <li><strong>22 — SSH:</strong> secure remote access to servers.</li>
          <li><strong>25 — SMTP:</strong> sending email.</li>
          <li><strong>53 — DNS:</strong> domain name resolution.</li>
          <li><strong>80 — HTTP:</strong> unencrypted web traffic.</li>
          <li><strong>110 — POP3 / 143 — IMAP:</strong> email retrieval protocols.</li>
          <li><strong>443 — HTTPS:</strong> encrypted web traffic — the modern standard.</li>
          <li><strong>3306 — MySQL:</strong> database connections.</li>
          <li><strong>3389 — RDP:</strong> Windows remote desktop.</li>
          <li><strong>8080 — HTTP-alt:</strong> commonly used in dev environments or proxies.</li>
        </ul>
        <h2>When is an open port a risk?</h2>
        <p>An open port alone isn't a vulnerability — but unnecessarily exposed management ports (like 3389 or 22) are a top target for attackers. Use our <a href="/en/port-check">port check tool</a> to quickly see what's exposed on a host.</p>
        <h2>A practical tip</h2>
        <p>Keep management ports behind a VPN where possible, enforce strong authentication, and shut down services you're not using.</p>
      `,
    },
  },
];

export function getPost(slug: string): Post | undefined {
  return posts.find((p) => p.slug === slug);
}

export function readingMinutes(post: Post, locale: Locale): number {
  const text = localizedPostText(post.body, locale).replace(/<[^>]*>/g, ' ');
  return Math.max(1, Math.ceil(text.trim().split(/\s+/).length / 180));
}
