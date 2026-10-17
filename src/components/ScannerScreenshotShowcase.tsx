"use client";

import { useState } from "react";
import Image from "next/image";
import type { Locale } from "@/i18n/config";
import { uiText } from "@/i18n/ui";

type ViewMode = "table" | "map";

export function ScannerScreenshotShowcase({ locale }: { locale: Locale }) {
  const [activeView, setActiveView] = useState<ViewMode>("table");

  const views = {
    table: {
      title: uiText(locale, "Live Device Discovery & Network Table", "Canlı Cihaz Keşfi ve Ağ Tablosu"),
      tabLabel: uiText(locale, "01 / Device Table", "01 / Cihaz Tablosu"),
      src: "/scanner-v43-preview.png",
      alt: uiText(locale, "IPscans+ v4.3.0 device discovery table view", "IPscans+ v4.3.0 cihaz keşfi tablo görünümü"),
      windowSubtitle: "IPscans+ v4.3.0 — [192.168.1.0/24 · Realtek PCIe GbE · ARP & ICMP Sweep]",
      features: [
        {
          badge: "ARP / ICMP",
          title: uiText(locale, "Sub-2s Subnet Sweep", "2 Saniye Altı Subnet Taraması"),
          desc: uiText(
            locale,
            "Asynchronous raw socket probes sweep a /24 subnet in under 2 seconds, displaying live ping latency for each responding host.",
            "Asenkron soket taraması /24 ağ aralığını 2 saniyenin altında tarayarak yanıt veren her cihazın anlık ping gecikmesini gösterir."
          ),
        },
        {
          badge: "ONVIF · mDNS",
          title: uiText(locale, "Deep Device Fingerprinting", "Derin Cihaz Kimliklendirme"),
          desc: uiText(
            locale,
            "Automatic recognition of IP cameras, smart hubs, printers, NAS units, and managed switches via mDNS, SSDP, and ONVIF headers.",
            "mDNS, SSDP ve ONVIF servisleri üzerinden IP kameraları, akıllı ev hub'larını, yazıcıları ve ağ anahtarlarını anında tanır."
          ),
        },
        {
          badge: "DOUBLE-CLICK",
          title: uiText(locale, "Instant Web Console Access", "Tek Çift Tıklamayla Web Paneli"),
          desc: uiText(
            locale,
            "Double-clicking any device row opens its HTTP/HTTPS administration panel directly inside your default web browser.",
            "Listelenen herhangi bir cihaza çift tıklandığında, varsayılan tarayıcınızda cihazın yönetim arayüzü anında açılır."
          ),
        },
        {
          badge: "SYNTAX FILTER",
          title: uiText(locale, "Real-Time Query Syntax", "Anlık Arama ve Filtreleme"),
          desc: uiText(
            locale,
            "Filter thousands of records instantly using syntax like 'port:443', 'vendor:Apple', or '-type:Unknown'.",
            "'port:443', 'vendor:Apple' veya '-type:Unknown' gibi filtreleme ifadeleriyle binlerce cihaz arasında milisaniyede arama yapın."
          ),
        },
      ],
    },
    map: {
      title: uiText(locale, "Hierarchical Evidence-Based Network Map", "Kanıta Dayalı Hiyerarşik Ağ Haritası"),
      tabLabel: uiText(locale, "02 / Network Map", "02 / Ağ Haritası"),
      src: "/scanner-v43-map.png",
      alt: uiText(locale, "IPscans+ v4.3.0 evidence-based topology map view", "IPscans+ v4.3.0 kanıta dayalı topoloji haritası görünümü"),
      windowSubtitle: "IPscans+ v4.3.0 — [Topology Engine · LLDP / CDP Verified Hierarchy]",
      features: [
        {
          badge: "LLDP / CDP",
          title: uiText(locale, "Verified Switch Adjacency", "Doğrulanmış Anahtar Komşuluğu"),
          desc: uiText(
            locale,
            "Physical connections verified through SNMP/LLDP appear as solid vectors. No connections are invented without cryptographic evidence.",
            "SNMP ve LLDP ile kanıtlanan fiziksel bağlantılar düz çizgilerle haritalanır. Kanıtı olmayan hiçbir bağlantı uydurulmaz."
          ),
        },
        {
          badge: "GATEWAY PATH",
          title: uiText(locale, "Inferred Forwarding Tree", "Çıkarımsal Yönlendirme Yolu"),
          desc: uiText(
            locale,
            "Shared gateway paths are rendered with dashed vectors, maintaining strict architectural distinction between physical and logical layers.",
            "Ortak ağ geçidi rotaları kesikli çizgilerle ayrıştırılarak fiziksel anahtar katmanı ile mantıksal yönlendirme birbirinden ayrılır."
          ),
        },
        {
          badge: "TAG & RENAME",
          title: uiText(locale, "Custom Device Labels", "Özel Cihaz İsimlendirme"),
          desc: uiText(
            locale,
            "Right-click any node to assign persistent local custom names, tags, and location notes that persist across reboots.",
            "Haritadaki herhangi bir cihaza sağ tıklayarak kalıcı özel adlar, etiketler ve oda bilgileri tanımlayabilirsiniz."
          ),
        },
        {
          badge: "EXPORT",
          title: uiText(locale, "Vector SVG & PDF Reports", "Vektörel SVG ve PDF Çıktısı"),
          desc: uiText(
            locale,
            "Export the full network canvas to infinite-resolution SVG, PNG, or incorporate it directly into timestamped PDF audit documentation.",
            "Ağ topolojisini tek tıkla sonsuz çözünürlüklü SVG, PNG veya kriptografik zaman damgalı PDF denetim raporu olarak dışa aktarın."
          ),
        },
      ],
    },
  };

  const current = views[activeView];

  return (
    <section className="scanner-showcase-stage" aria-label={uiText(locale, "IPscans+ Interface Showcase", "IPscans+ Arayüz İncelemesi")}>
      {/* View Switcher Pills */}
      <div className="scanner-showcase-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeView === "table"}
          onClick={() => setActiveView("table")}
          className={`newsletter-topic-pill ${activeView === "table" ? "selected" : ""}`}
        >
          <span>{views.table.tabLabel}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeView === "map"}
          onClick={() => setActiveView("map")}
          className={`newsletter-topic-pill ${activeView === "map" ? "selected" : ""}`}
        >
          <span>{views.map.tabLabel}</span>
        </button>
      </div>

      {/* Main High-Tech Window Mockup */}
      <div className="scanner-mockup-frame">
        {/* Titlebar Chrome */}
        <div className="scanner-mockup-titlebar">
          <div className="scanner-mockup-dots" aria-hidden="true">
            <span className="dot dot-close" />
            <span className="dot dot-minimize" />
            <span className="dot dot-maximize" />
          </div>
          <div className="scanner-mockup-title">
            <span>{current.windowSubtitle}</span>
          </div>
          <div className="scanner-mockup-badges">
            <span className="scanner-badge-pill">OFFLINE NATIVE</span>
          </div>
        </div>

        {/* Screenshot Viewport */}
        <div className="scanner-mockup-viewport">
          <Image
            key={current.src}
            src={current.src}
            alt={current.alt}
            width={1440}
            height={900}
            sizes="(max-width: 1280px) 100vw, 1440px"
            className="scanner-mockup-image"
            priority
          />
        </div>
      </div>

      {/* Real In-App Capability Hotspots */}
      <div className="scanner-showcase-features-grid">
        {current.features.map((feat) => (
          <div key={feat.title} className="agy-surface-card p-6 transition-all hover:border-white/20">
            <div className="flex items-center justify-between gap-2">
              <span className="agy-eyebrow text-[#00f0ff]">{feat.badge}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#00f0ff]" aria-hidden="true" />
            </div>
            <h3 className="heading-6 mt-3 text-white">{feat.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-300">{feat.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
