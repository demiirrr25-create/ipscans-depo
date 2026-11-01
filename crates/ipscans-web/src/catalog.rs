//! One catalog for the local Rust web server and the public, static download pages.
use std::{fmt::Write, fs, io, path::Path};

const TAG: &str = "desktop-audit-2026.11.01";
const RELEASES: &str = "https://github.com/demiirrr25-create/ipscans-depo/releases";
// Enable downloads only after verifying the public release and all eight assets.
pub const PUBLISHED: bool = false;

struct App {
    key: &'static str,
    name: &'static str,
    file: &'static str,
    tr: &'static str,
    en: &'static str,
}

const APPS: &[App] = &[
    App { key: "scanner", name: "IPscans+", file: "IPscans-Plus.exe",
        tr: "Yerel ağınızı veya bir IPv4 CIDR aralığını tarayın. Bulguları IP, port veya üreticiye göre filtreleyip envanteri CSV, JSON ya da HTML olarak kaydedin.",
        en: "Scan the local network or an IPv4 CIDR range. Filter by address, port or vendor and export the inventory as CSV, JSON or HTML." },
    App { key: "health", name: "Network Health Pro", file: "ipscans-network-health-pro.exe",
        tr: "Ağ geçidinin yanıt süresini örnekleyin ve ölçümler arasındaki değişimi izleyin.",
        en: "Sample gateway response times and examine how latency changes between measurements." },
    App { key: "sentinel", name: "IPScans Sentinel", file: "IPScans-Sentinel.exe",
        tr: "Yerel ağ durumunu ve olay bulgularını inceleyin. Yönetim işlemleri ayrı yetki gerektirebilir.",
        en: "Review local network conditions and incident evidence. Administrative actions may require elevation." },
    App { key: "ipcast", name: "IPCast", file: "IPCast.exe",
        tr: "Yerel istasyonları keşfedin, RDP portuna erişimi sınayın ve Windows Uzak Masaüstü istemcisini açın. Özel dosya aktarımı geliştirme aşamasında.",
        en: "Discover local stations, test RDP port reachability and launch Windows Remote Desktop. Custom file transfer is under development." },
    App { key: "lpr", name: "IPScans LPR Pro", file: "IPScans-LPR-Pro.exe",
        tr: "Elle girilen plakaları standart biçime dönüştürün ve yerel araç sicilinde arayın. Kamera OCR ve fiziksel bariyer desteği geliştirme aşamasında.",
        en: "Normalize manually entered plates and search the local vehicle registry. Camera OCR and physical barrier control are under development." },
    App { key: "cortex", name: "IPScans Cortex", file: "IPScans-Cortex.exe",
        tr: "ONVIF kameralarını keşfedin, ilgi alanları çizin ve sekiz sektör paketini inceleyin. Canlı video analizi geliştirme aşamasında.",
        en: "Discover ONVIF cameras, draw regions of interest and inspect eight sector packs. Live video analytics are under development." },
    App { key: "admin", name: "Cortex Admin", file: "CortexAdmin.exe",
        tr: "Yönetici tarafından yapılandırılan anahtarla yerel lisans kayıtlarını imzalayın. Uygulama içinde lisans kotası uygulama desteği geliştirme aşamasında.",
        en: "Sign local license records with an operator-configured key. In-app enforcement of license limits is under development." },
    App { key: "cli", name: "IPScans CLI", file: "ipscans-network-scanner.exe",
        tr: "Terminalden ağ keşfi, port, DNS ve WHOIS sorguları çalıştırın. Sonuçları JSON olarak işleyin.",
        en: "Run discovery, port, DNS and WHOIS queries in your terminal and process the JSON results." },
];

pub fn render(tr: bool, published: bool, public_dir: Option<&Path>) -> String {
    let pick = |turkish, english| if tr { turkish } else { english };
    let lang = pick("tr", "en");
    let title = pick("Windows uygulamaları", "Windows applications");
    let other = pick("en", "tr");
    let other_name = pick("English", "Türkçe");
    let home = format!("https://ipscans.com/{lang}");
    let mut html = format!(r#"<!doctype html><html lang="{lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title} · IPScans</title><link rel="stylesheet" href="/desktop/catalog.css"></head><body>
<header><nav><a class="brand" href="{home}">IPScans</a><a href="/desktop/{other}.html" lang="{other}" hreflang="{other}">{other_name}</a></nav></header>
<main><section class="intro"><p class="kicker">WINDOWS x64 &nbsp;/&nbsp; RUST</p><h1>{title}</h1><p>{}</p><small>{} · <code>{TAG}</code></small></section><div class="grid">"#,
        pick("Ağ keşfi, kamera işletimi ve yerel yönetim için sekiz taşınabilir araç. Aracınızı seçin, dosya adını kontrol edin ve ilgili ön sürümü inceleyin.",
             "Eight portable tools for network discovery, camera operations and local administration. Find your tool, check the filename and inspect the preview build."),
        &format!("{} {}", pick("Ön sürüm", "Prerelease"), env!("CARGO_PKG_VERSION")));
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
        write!(html, r#"<article id="{key}"><div class="identity"><img alt="" width="52" height="52" src="{icon}"><h2>{name}</h2></div><p>{desc}</p>"#).unwrap();
        if public_dir.is_some_and(|dir| {
            dir.join("desktop-previews")
                .join(format!("{key}.png"))
                .is_file()
        }) {
            let alt = pick("Uygulama görünümü", "Application view");
            write!(html, r#"<a class="preview" href="/desktop-previews/{key}.png"><img loading="lazy" src="/desktop-previews/{key}.png" alt="{name} — {alt}"></a>"#).unwrap();
        }
        write!(html, r#"<div class="file"><code>{file}</code>"#).unwrap();
        if published {
            write!(html, r#"<a class="download" href="{RELEASES}/download/{TAG}/{file}" aria-label="{name} — {}">{} <span aria-hidden="true">↓</span></a>"#,
                pick("Ön sürümü indir", "Download prerelease"), pick("İndir", "Download")).unwrap();
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
    write!(html, r#"</div><aside><h2>{}</h2><p>{}</p><a href="{notes}">{}</a></aside></main></body></html>"#,
        pick("İndirdikten sonra", "After downloading"),
        pick("EXE dosyasını Windows’un İndirilenler klasöründe çalıştırdığınızda uygulama kendisini Masaüstüne kopyalar. Başka bir klasörden kopyalamak için PowerShell’de EXE’yi --install-desktop seçeneğiyle çalıştırın. Komut satırı aracını PowerShell’den kullanın.",
             "Launch the EXE from your Windows Downloads folder to create a desktop copy. From another folder, run the EXE in PowerShell with --install-desktop. Use PowerShell for the command-line scanner."),
        pick("GitHub sürüm kayıtları ↗", "GitHub release notes ↗")).unwrap();
    html
}

/// Check in the output so the existing Vercel build can serve it without a Rust toolchain.
pub fn export(public_dir: &Path, published: bool) -> io::Result<()> {
    use ipscans_core::json::json_str;
    let out = public_dir.join("desktop");
    fs::create_dir_all(&out)?;
    for (lang, tr) in [("tr", true), ("en", false)] {
        fs::write(
            out.join(format!("{lang}.html")),
            render(tr, published, Some(public_dir)),
        )?;
    }
    let rows = APPS.iter().map(|app| {
        let preview = format!("/desktop-previews/{}.png", app.key);
        let preview = if public_dir.join(&preview[1..]).is_file() { preview } else { String::new() };
        let download = if published { format!("{RELEASES}/download/{TAG}/{}", app.file) } else { String::new() };
        format!(r#"  {{"id":{}, "name":{}, "tr":{}, "en":{}, "version":{}, "preview":{}, "download":{}}}"#,
            json_str(app.key), json_str(app.name), json_str(app.tr), json_str(app.en),
            json_str(env!("CARGO_PKG_VERSION")), json_str(&preview), json_str(&download))
    }).collect::<Vec<_>>();
    fs::write(
        out.join("apps.json"),
        format!("[\n{}\n]\n", rows.join(",\n")),
    )
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
