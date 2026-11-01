#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use ipscans_core::console::{escape, field, json, page, serve, Reply};
use ipscans_core::json::json_str;
use ipscans_core::network::scan_local_subnet;
use ipscans_core::protocols::discover_onvif_cameras;
use ipscans_core::sentinel::check_ollama_status;
use ipscans_core::vision_rules::{cortex_sector_packs, sector_packs_to_json, Point2D, RoiPolygon};
use std::collections::BTreeMap;
use std::sync::Arc;

struct Camera {
    name: String,
    address: String,
    vendor: String,
}

fn cameras() -> Vec<Camera> {
    let mut devices = BTreeMap::new();
    let (_, hosts) = scan_local_subnet(None);
    for host in hosts.into_iter().filter(|h| h.is_camera) {
        devices.insert(
            host.ip.clone(),
            Camera {
                name: host.hostname,
                address: host.ip,
                vendor: host.vendor,
            },
        );
    }
    for dev in discover_onvif_cameras(600) {
        devices.insert(
            dev.ip.clone(),
            Camera {
                name: dev.hardware_model,
                address: dev.xaddrs,
                vendor: dev.ip,
            },
        );
    }
    devices.into_values().collect()
}

fn roi_result(body: &str) -> Result<String, &'static str> {
    let value = |key: &str| {
        field(body, key)
            .and_then(|s| s.parse::<u16>().ok())
            .filter(|n| *n <= 100)
            .map(f64::from)
            .ok_or("Tüm koordinatlar 0–100 arasında olmalı.")
    };
    let (left, top, right, bottom) = (
        value("left")?,
        value("top")?,
        value("right")?,
        value("bottom")?,
    );
    if left >= right || top >= bottom {
        return Err("Sağ ve alt sınırlar başlangıç noktasından büyük olmalı.");
    }
    let roi = RoiPolygon {
        id: "preview".into(),
        name: "ROI".into(),
        tolerance_ratio: 0.0,
        vertices: vec![
            Point2D { x: left, y: top },
            Point2D { x: right, y: top },
            Point2D {
                x: right,
                y: bottom,
            },
            Point2D { x: left, y: bottom },
        ],
    };
    let (x, y) = (value("x")?, value("y")?);
    let on_edge = (x == left || x == right) && (top..=bottom).contains(&y)
        || (y == top || y == bottom) && (left..=right).contains(&x);
    let state = if on_edge {
        "sınır üzerinde"
    } else if roi.contains_point(Point2D { x, y }) {
        "bölge içinde"
    } else {
        "bölge dışında"
    };
    Ok(format!(
        r#"<output>Nokta ({x}, {y}) · {state}</output><svg role="img" aria-label="ROI ve test noktası" viewBox="0 0 100 100" height="160"><rect width="100" height="100" fill="var(--surface-dim)"/><rect x="{left}" y="{top}" width="{}" height="{}" fill="none" stroke="var(--signal)"/><circle cx="{x}" cy="{y}" r="2" fill="var(--ink)"/></svg>"#,
        right - left,
        bottom - top
    ))
}

fn screen(camera_info: &str, roi_info: &str) -> Reply {
    let packs =
        cortex_sector_packs()
            .into_iter()
            .map(|p| {
                format!(
        "<details><summary>{} · {} kural</summary><p>{}</p><p class=mono>{}</p></details>",
        escape(p.name_tr),p.rule_ids.len(),escape(p.description_tr),p.rule_ids.join(" · "))
            })
            .collect::<String>();
    let coords = [("Sol","left",20),("Üst","top",20),("Sağ","right",80),("Alt","bottom",80),("Nokta X","x",50),("Nokta Y","y",50)]
        .iter().map(|(s,k,v)|format!(r#"<label>{s}<input class="input mono" type="number" name="{k}" value="{v}" min="0" max="100" required></label>"#)).collect::<String>();
    page(
        "IPScans Cortex",
        "cortex",
        "Kamera keşfi ve görüntü analizi için bölge stüdyosu",
        &format!(
            r#"
      <section><div class="eyebrow">01 / KAMERA ENVANTERİ</div><h2>Ağdaki kameraları bul</h2><p>ONVIF keşif yanıtlarını ve yerel alt ağdaki kamera adaylarını listeler. Akış adresi yalnızca cihazdan alındığında gösterilir.</p>
      <form method="post" action="/discover"><button class="btn btn-signal">Yerel ağı tara</button></form>{camera_info}</section>
      <section><div class="eyebrow">02 / GEOMETRİ STÜDYOSU</div><h2>İlgi bölgesini sınayın</h2><p>Görüntü genişliği ve yüksekliğinin yüzdesiyle bir dikdörtgen tanımlayın ve test noktasını yerleştirin.</p>
      <form method="post" action="/roi">{coords}<button class="btn btn-signal">Bölgeyi test et</button></form>{roi_info}</section>
      <section><div class="eyebrow">03 / SEKTÖR KÜTÜPHANESİ</div><h2>Sektöre göre kural şablonları</h2><p>Her paketi açarak kural listesini inceleyin. Canlı video analizi ve olay kaydı bu konsola bağlı değil.</p>{packs}</section>"#
        ),
    )
}

fn main() {
    ipscans_core::win32::handle_desktop_install("IPScans-Cortex.exe");
    let args: Vec<_> = std::env::args().collect();
    if args.iter().any(|a| a == "--version" || a == "-V") {
        println!("IPScans Cortex {}", env!("CARGO_PKG_VERSION"));
        return;
    }
    if args.iter().any(|a| a == "--selftest" || a == "--self-test") {
        assert_eq!(cortex_sector_packs().len(), 8);
        assert!(roi_result("left=10&top=10&right=80&bottom=80&x=50&y=30")
            .unwrap()
            .contains("bölge içinde"));
        return;
    }
    serve(
        "ipscans-cortex",
        17944,
        Arc::new(|method, path, body| match (method, path) {
            ("GET", "/" | "/index.html") => screen("", ""),
            ("POST", "/roi") => screen(
                "",
                &roi_result(body).unwrap_or_else(|e| format!("<output>{e}</output>")),
            ),
            ("GET", "/api/packs") => json(200, sector_packs_to_json()),
            ("GET", "/api/cameras") => {
                let (_, models, _) = check_ollama_status();
                let models = models.iter().map(|m| json_str(m)).collect::<Vec<_>>();
                let items = cameras()
                    .iter()
                    .map(|c| {
                        format!(
                            r#"{{"name":{},"address":{},"rtsp":"","vendor":{}}}"#,
                            json_str(&c.name),
                            json_str(&c.address),
                            json_str(&c.vendor)
                        )
                    })
                    .collect::<Vec<_>>();
                json(
                    200,
                    format!(
                        r#"{{"ok":true,"models":[{}],"cameras":[{}]}}"#,
                        models.join(","),
                        items.join(",")
                    ),
                )
            }
            ("POST", "/discover") => {
                let cameras = cameras();
                let mut list = format!(
                    "<output>Tarama tamamlandı · {} aday</output><ul>",
                    cameras.len()
                );
                for c in cameras {
                    list.push_str(&format!(
                        "<li>{} · {} · {}</li>",
                        escape(&c.name),
                        escape(&c.address),
                        escape(&c.vendor)
                    ));
                }
                list.push_str("</ul>");
                screen(&list, "")
            }
            _ => json(404, r#"{"error":"Bulunamadı"}"#.into()),
        }),
    );
}
