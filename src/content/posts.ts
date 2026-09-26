import type { Locale } from "@/i18n/config";

export type Post = {
  slug: string;
  date: string;
  title: Record<Locale, string>;
  excerpt: Record<Locale, string>;
  body: Record<Locale, string>;
};

export const posts: Post[] = [
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
      tr: "IP adresi, internete bağlı her cihaza atanan benzersiz bir tanımlayıcıdır. IPv4 adresleri 32 bit uzunluğundadır ve 192.168.1.1 gibi yazılır. IPv6 ise 128 bit uzunluğunda olup çok daha fazla adres alanı sunar. Bir web sitesine bağlandığında, cihazın IP adresi üzerinden veri paketleri gönderilir ve alınır. Genel (public) IP adresin internete açık kimliğindir; yerel (private) IP adresin ise ev ağındaki cihazları ayırt eder.",
      en: "An IP address is a unique identifier assigned to every device connected to the internet. IPv4 addresses are 32 bits long and written like 192.168.1.1. IPv6 is 128 bits long and offers a much larger address space. When you connect to a website, data packets are sent and received through your device's IP address. Your public IP is your identity on the internet, while your private IP distinguishes devices on your home network.",
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
      tr: "Yavaş internet birçok faktörden kaynaklanabilir. 1) Yönlendiricini merkezi ve yüksek bir konuma yerleştir. 2) 5 GHz Wi-Fi bandını kullan. 3) DNS sunucunu 1.1.1.1 veya 8.8.8.8 olarak değiştir. 4) Arka planda çalışan güncellemeleri kapat. 5) Kablolu bağlantı (Ethernet) tercih et. 6) Yönlendirici donanım yazılımını güncel tut. 7) Düzenli olarak hız testi yaparak sağlayıcının vaat ettiği hızı aldığını doğrula.",
      en: "Slow internet can stem from many factors. 1) Place your router in a central, elevated spot. 2) Use the 5 GHz Wi-Fi band. 3) Change your DNS to 1.1.1.1 or 8.8.8.8. 4) Disable background updates. 5) Prefer a wired (Ethernet) connection. 6) Keep router firmware up to date. 7) Run regular speed tests to confirm you get the speed your provider promises.",
    },
  },
];

export function getPost(slug: string): Post | undefined {
  return posts.find((p) => p.slug === slug);
}
