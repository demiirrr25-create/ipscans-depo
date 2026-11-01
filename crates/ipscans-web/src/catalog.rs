//! One catalog for the local Rust web server and the public, static download pages.
use std::{fmt::Write, fs, io, path::Path};

pub const TAG: &str = "desktop-audit-2026.11.01-r2";
pub const PREVIOUS_TAG: &str = "desktop-audit-2026.11.01";
const RELEASES: &str = "https://github.com/demiirrr25-create/ipscans-depo/releases";
// Enable downloads only after verifying the public release and all eight assets.
pub const PUBLISHED: bool = true;

pub struct App {
    pub key: &'static str,
    pub name: &'static str,
    pub file: &'static str,
    pub tr: &'static str,
    pub en: &'static str,
}

pub const APPS: &[App] = &[
    App {
        key: "scanner",
        name: "IPscans+",
        file: "IPscans-Plus.exe",
        tr: "Çoklu adaptör, IPv4 aralık/CIDR, sınırlı IPv6 (/120–/128), SNMPv2c/LLDP/CDP topolojisi, ONVIF keşfi ve tarama iptali ile yerel ağı tarayın; CSV, JSON veya HTML olarak dışa aktarın.",
        en: "Scan across multiple adapters, IPv4 ranges/CIDR, bounded IPv6 (/120–/128), SNMPv2c/LLDP/CDP topology, ONVIF discovery and instant cancellation; export as CSV, JSON or HTML.",
    },
    App {
        key: "health",
        name: "Network Health Pro",
        file: "ipscans-network-health-pro.exe",
        tr: "Ağ geçidi ICMP ve WAN TCP gecikmesini örnekleyin; bağlantı kesintilerini, adaptör geçişlerini ve uzun süreli JSONL telemetri geçmişini izleyin.",
        en: "Sample gateway ICMP and WAN TCP latency; track connection outages, adapter transitions and long-duration JSONL telemetry history.",
    },
    App {
        key: "sentinel",
        name: "IPScans Sentinel",
        file: "IPScans-Sentinel.exe",
        tr: "Yerel ağ durumunu ve olay bulgularını inceleyin; hedefe özel güvenlik duvarı kuralı ekleme, doğrulama ve işlemsel geri almayı yürütün.",
        en: "Review local network conditions and incident evidence; execute target-specific firewall rule addition, verification and transactional rollback.",
    },
    App {
        key: "ipcast",
        name: "IPCast",
        file: "IPCast.exe",
        tr: "Yerel istasyonları keşfedin, bağlantı öncesi ITU-T X.224 RDP el sıkışmasını doğrulayın ve otomatik yeniden bağlanma (.rdp) profiliyle Windows Uzak Masaüstü istemcisini başlatın.",
        en: "Discover local stations, verify pre-flight ITU-T X.224 RDP negotiation and launch Windows Remote Desktop with an auto-reconnecting (.rdp) profile.",
    },
    App {
        key: "lpr",
        name: "IPScans LPR Pro",
        file: "IPScans-LPR-Pro.exe",
        tr: "PGM/BMP plaka görüntülerinden piksel matrisli OCR çözümlemesi yapın, 24 plakalık etiketli veri setiyle doğruluğu ölçün ve kapalı çevrim bariyer röle onayını (OPEN_CONFIRMED) denetleyin.",
        en: "Run pixel-matrix OCR on PGM/BMP plate images, benchmark accuracy on the 24-plate labeled dataset and verify closed-loop barrier relay feedback (OPEN_CONFIRMED).",
    },
    App {
        key: "cortex",
        name: "IPScans Cortex",
        file: "IPScans-Cortex.exe",
        tr: "ONVIF kameralarını keşfedin, kayıtlı PGM/BMP video akışlarını çözerek SHA-256 adli zincirli ROI ihlal olayları üretin ve açık anahtarlı RSA-512 lisans/CRL/rotasyon kurallarını uygulayın.",
        en: "Discover ONVIF cameras, decode recorded PGM/BMP video streams into SHA-256 forensically chained ROI intrusion events and enforce public-key RSA-512 license/CRL/rotation rules.",
    },
    App {
        key: "admin",
        name: "Cortex Admin",
        file: "CortexAdmin.exe",
        tr: "İstemciye özel anahtar sızdırmadan asimetrik RSA-512-SHA256 (IPS2) lisansları, CRL1 iptal listelerini ve anahtar rotasyonlarını (v1/v2) imzalayın ve yaşam döngüsünü doğrulayın.",
        en: "Sign asymmetric RSA-512-SHA256 (IPS2) licenses, CRL1 revocation lists and key rotations (v1/v2) without leaking private keys to the client, and verify the full lifecycle.",
    },
    App {
        key: "cli",
        name: "IPScans CLI",
        file: "ipscans-network-scanner.exe",
        tr: "Terminalden 1/16/254 hedefli keşif kıyaslaması (--benchmark), çoklu adaptör listesi (--adapters), SNMPv2c sorgusu (--snmp), port, DNS ve WHOIS sorguları çalıştırın.",
        en: "Run 1/16/254-target discovery benchmarks (--benchmark), multi-adapter enumeration (--adapters), SNMPv2c queries (--snmp), port, DNS and WHOIS checks from your terminal.",
    },
];

pub fn render(tr: bool, published: bool, public_dir: Option<&Path>) -> String {
    let pick = |turkish, english| if tr { turkish } else { english };
    let lang = pick("tr", "en");
    let title = pick("Windows uygulamaları", "Windows applications");
    let other = pick("en", "tr");
    let other_name = pick("English", "Türkçe");
    let home = format!("https://ipscans.com/{lang}");
    let mut html = format!(
        r#"<!doctype html><html lang="{lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title} · IPScans</title><link rel="stylesheet" href="/desktop/catalog.css"></head><body>
<header><nav><a class="brand" href="{home}">IPScans</a><a href="/desktop/{other}.html" lang="{other}" hreflang="{other}">{other_name}</a></nav></header>
<main><section class="intro"><p class="kicker">WINDOWS x64</p><h1>{title}</h1><p>{}</p></section><div class="grid">"#,
        pick(
            "Ağ keşfi, kamera işletimi ve yerel yönetim için sekiz taşınabilir masaüstü uygulaması. Aracınızı seçin ve doğrudan çalıştırın.",
            "Eight portable desktop applications for network discovery, camera operations and local administration. Choose your application and launch directly."
        )
    );
    for app in APPS {
        let App {
            key,
            name,
            file,
            tr: desc_tr,
            en: desc_en,
        } = app;
        let desc = pick(desc_tr, desc_en);
        let icon = if public_dir.is_some() {
            format!("/brand/{key}-logo.png")
        } else {
            format!("/brand/{key}.png")
        };
        write!(
            html,
            r#"<article id="{key}"><div class="identity"><img alt="" width="52" height="52" src="{icon}"><h2>{name}</h2></div><p>{desc}</p>"#
        )
        .unwrap();
        if public_dir.is_some_and(|dir| {
            dir.join("desktop-previews")
                .join(format!("{key}.png"))
                .is_file()
        }) {
            let alt = pick("Uygulama görünümü", "Application view");
            write!(
                html,
                r#"<a class="preview" href="/desktop-previews/{key}.png"><img loading="lazy" src="/desktop-previews/{key}.png" alt="{name} — {alt}"></a>"#
            )
            .unwrap();
        }
        write!(html, r#"<div class="file"><code>{file}</code>"#).unwrap();
        if published {
            write!(
                html,
                r#"<a class="download" href="{RELEASES}/download/{TAG}/{file}" aria-label="{name} — {}">{} <span aria-hidden="true">↓</span></a>"#,
                pick("Uygulamayı indir", "Download application"),
                pick("İndir", "Download")
            )
            .unwrap();
        } else {
            write!(
                html,
                "<span>{}</span>",
                pick("Yayın bekleniyor", "Awaiting release")
            )
            .unwrap();
        }
        html.push_str("</div></article>");
    }
    let notes = if published {
        format!("{RELEASES}/tag/{TAG}")
    } else {
        RELEASES.into()
    };
    write!(
        html,
        r#"</div><aside><h2>{}</h2><p>{}</p><a href="{notes}">{}</a></aside></main></body></html>"#,
        pick("İndirdikten sonra", "After downloading"),
        pick(
            "EXE dosyasını Windows’un İndirilenler klasöründe çalıştırdığınızda uygulama kendisini Masaüstüne kopyalar. Başka bir klasörden kopyalamak için PowerShell’de EXE’yi --install-desktop seçeneğiyle çalıştırın. Komut satırı aracını PowerShell’den kullanın.",
            "Launch the EXE from your Windows Downloads folder to create a desktop copy. From another folder, run the EXE in PowerShell with --install-desktop. Use PowerShell for the command-line scanner."
        ),
        pick("GitHub sürüm kayıtları ↗", "GitHub release notes ↗")
    )
    .unwrap();
    html
}

pub fn apps_json(public_dir: Option<&Path>, published: bool) -> String {
    use ipscans_core::json::json_str;
    let rows = APPS
        .iter()
        .map(|app| {
            let preview = format!("/desktop-previews/{}.png", app.key);
            let preview = if public_dir.is_none_or(|d| d.join(&preview[1..]).is_file()) {
                preview
            } else {
                String::new()
            };
            let download = if published {
                format!("{RELEASES}/download/{TAG}/{}", app.file)
            } else {
                String::new()
            };
            format!(
                r#"  {{"id":{}, "name":{}, "tr":{}, "en":{}, "version":{}, "preview":{}, "download":{}}}"#,
                json_str(app.key),
                json_str(app.name),
                json_str(app.tr),
                json_str(app.en),
                json_str(env!("CARGO_PKG_VERSION")),
                json_str(&preview),
                json_str(&download)
            )
        })
        .collect::<Vec<_>>();
    format!("[\n{}\n]\n", rows.join(",\n"))
}

/// Check in the output so the existing Vercel build can serve it without a Rust toolchain.
pub fn export(public_dir: &Path, published: bool) -> io::Result<()> {
    let out = public_dir.join("desktop");
    fs::create_dir_all(&out)?;
    for (lang, tr) in [("tr", true), ("en", false)] {
        fs::write(
            out.join(format!("{lang}.html")),
            render(tr, published, Some(public_dir)),
        )?;
    }
    fs::write(out.join("apps.json"), apps_json(Some(public_dir), published))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn public_pages_match_the_current_desktop_suite() {
        let public = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../public");
        for (lang, tr) in [("tr", true), ("en", false)] {
            let checked_in =
                fs::read_to_string(public.join(format!("desktop/{lang}.html"))).unwrap();
            assert_eq!(
                checked_in.replace("\r\n", "\n"),
                render(tr, PUBLISHED, Some(&public))
            );
        }
        for app in APPS {
            let png = fs::read(public.join(format!("brand/{}-logo.png", app.key))).unwrap();
            assert!(png.starts_with(b"\x89PNG\r\n\x1a\n"));
        }
    }

    #[test]
    fn download_links_are_unique_and_require_a_published_release() {
        let pending = render(false, false, None);
        let published = render(false, true, None);
        assert!(!pending.contains("/releases/download/"));
        assert_eq!(published.matches("/releases/download/").count(), APPS.len());
        for app in APPS {
            let href = format!("href=\"{RELEASES}/download/{TAG}/{}\"", app.file);
            assert_eq!(published.matches(&href).count(), 1);
        }
    }
}
