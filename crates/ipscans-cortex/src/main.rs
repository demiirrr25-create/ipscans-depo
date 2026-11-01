#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use ipscans_core::console::{escape, field, json, page, serve, Reply};
use ipscans_core::cryptography::{
    enforce_cortex_license, LicenseEnforcementResult, PUBLIC_KEY_V1_N_HEX, PUBLIC_KEY_V2_N_HEX,
};
use ipscans_core::json::{extract_json_string, json_str};
use ipscans_core::network::scan_local_subnet;
use ipscans_core::protocols::discover_onvif_cameras;
use ipscans_core::sentinel::check_ollama_status;
use ipscans_core::vision_rules::{
    analyze_recorded_video_stream, cortex_sector_packs, generate_recorded_intrusion_sequence,
    sector_packs_to_json, verify_forensic_event_chain, Point2D, RoiPolygon,
};
use ipscans_core::win32::app_data_dir;
use std::collections::BTreeMap;
use std::fs;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

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

fn default_intrusion_roi() -> RoiPolygon {
    RoiPolygon {
        id: "ROI-GATE-01".into(),
        name: "Güvenli Nizamiye Koridoru".into(),
        tolerance_ratio: 0.05,
        vertices: vec![
            Point2D { x: 30.0, y: 25.0 },
            Point2D { x: 75.0, y: 25.0 },
            Point2D { x: 75.0, y: 75.0 },
            Point2D { x: 30.0, y: 75.0 },
        ],
    }
}

fn run_stream_decode_and_event_pipeline() -> (bool, String, String) {
    let frames = generate_recorded_intrusion_sequence();
    let roi = default_intrusion_roi();
    let report = analyze_recorded_video_stream("CAM-NIZAMIYE-01", &frames, &roi)
        .expect("analyze recorded video stream");
    let chain_ok = verify_forensic_event_chain(&report.events);
    let passed = report.decoded_frames == 6
        && report.false_alarms == 0
        && report.events.len() == 2
        && chain_ok;
    let mut html = format!(
        "<output>Kayıtlı Akış Analizi Tamamlandı · Çözülen Kare: {} ({}x{}) · Bölge Dışı Hareket: {} · Üretilen Olay: {} · Yanlış Alarm: {} · Adli SHA-256 Zincir Doğrulaması: {}</output><div class=\"data-table-wrap\"><table class=\"data-table\"><thead><tr><th>Olay ID</th><th>Kare</th><th>Kural</th><th>Kamera</th><th>Ağırlık Merkezi</th><th>Değişim Oranı</th><th>Adli SHA-256 Özeti</th></tr></thead><tbody>",
        report.decoded_frames,
        report.resolution.0,
        report.resolution.1,
        report.non_roi_motion_frames,
        report.events.len(),
        report.false_alarms,
        if chain_ok { "GEÇERLİ" } else { "BOZUK" }
    );
    for ev in &report.events {
        html.push_str(&format!(
            "<tr><td class=mono>{}</td><td>#{}</td><td class=mono>{}</td><td>{}</td><td class=mono>({:.1}, {:.1})</td><td>%{:.2}</td><td class=mono>{}…</td></tr>",
            escape(&ev.event_id),
            ev.frame_index,
            escape(&ev.rule_id),
            escape(&ev.camera_id),
            ev.centroid_pct.x,
            ev.centroid_pct.y,
            ev.motion_ratio * 100.0,
            &ev.ledger_hash[..16.min(ev.ledger_hash.len())]
        ));
    }
    html.push_str("</tbody></table></div>");
    let events_json = report
        .events
        .iter()
        .map(|e| e.to_json())
        .collect::<Vec<_>>()
        .join(",");
    let json_out = format!(
        r#"{{"ok":{passed},"cameraId":{},"decodedFrames":{},"nonRoiMotionFrames":{},"falseAlarms":{},"chainVerified":{chain_ok},"events":[{}]}}"#,
        json_str(&report.camera_id),
        report.decoded_frames,
        report.non_roi_motion_frames,
        report.false_alarms,
        events_json
    );
    (passed, json_out, html)
}

fn outcome_to_json(o: &LicenseEnforcementResult) -> String {
    format!(
        r#"{{"allowed":{},"statusCode":{},"reason":{}}}"#,
        o.allowed,
        json_str(o.status_code),
        json_str(&o.reason_tr)
    )
}

fn verify_client_license(
    token: &str,
    crl_token: Option<&str>,
    retired_kids_csv: &str,
    requested_cameras: u32,
    now_override: Option<u64>,
) -> LicenseEnforcementResult {
    let now = now_override.unwrap_or_else(|| {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(1_762_000_000)
    });
    let retired: Vec<&str> = retired_kids_csv
        .split(',')
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .collect();
    let outcome = enforce_cortex_license(
        token.trim(),
        crl_token.map(str::trim).filter(|s| !s.is_empty()),
        &retired,
        now,
        requested_cameras,
    );
    let dir = app_data_dir("cortex");
    let _ = fs::write(dir.join("license-state.json"), outcome_to_json(&outcome));
    outcome
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

fn screen(camera_info: &str, roi_info: &str, stream_info: &str, license_info: &str) -> Reply {
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
        "Kamera keşfi, kayıtlı video akışı çözme, olay üretimi ve açık anahtarlı lisans doğrulama",
        &format!(
            r#"
      <section><div class="eyebrow">01 / KAMERA ENVANTERİ</div><h2>Ağdaki kameraları bul</h2><p>ONVIF keşif yanıtlarını ve yerel alt ağdaki kamera adaylarını listeler. Akış adresi yalnızca cihazdan alındığında gösterilir.</p>
      <form method="post" action="/discover"><button class="btn btn-signal">Yerel ağı tara</button></form>{camera_info}</section>
      <section><div class="eyebrow">02 / GEOMETRİ STÜDYOSU</div><h2>İlgi bölgesini sınayın</h2><p>Görüntü genişliği ve yüksekliğinin yüzdesiyle bir dikdörtgen tanımlayın ve test noktasını yerleştirin.</p>
      <form method="post" action="/roi">{coords}<button class="btn btn-signal">Bölgeyi test et</button></form>{roi_info}</section>
      <section><div class="eyebrow">03 / VİDEO ÇÖZME VE OLAY ÜRETİMİ</div><h2>Kayıtlı kamera akışında hareket ve ROI ihlal analizi</h2><p>6 karelik PGM/BMP güvenlik kamerası akışını çözer; arka plan farkı, ROI dışındaki hareketin yanlış alarm üretmemesi ve ROI içine giren hedefin SHA-256 adli zincirli olay üretmesini doğrular.</p>
      <form method="post" action="/stream-test"><button class="btn btn-signal">Kayıtlı kamera akışını çöz ve olayları üret</button></form>{stream_info}</section>
      <section><div class="eyebrow">04 / LİSANS DOĞRULAMA (YALNIZCA AÇIK ANAHTAR)</div><h2>Asimetrik RSA-512-SHA256 lisans, süre sonu, iptal (CRL) ve anahtar rotasyonu</h2><p>Bu istemci ikilisinde (<span class="mono">IPScans-Cortex.exe</span>) özel imzalama sırrı bulunmaz; yalnızca <span class="mono">cortex-key-2026-v1</span> (<span class="mono">{}…</span>) ve <span class="mono">cortex-key-2026-v2</span> (<span class="mono">{}…</span>) açık modülleriyle doğrulama yapılır.</p>
      <form method="post" action="/license"><label>IPS2 Lisans Anahtarı<input class="input mono" name="token" placeholder="IPS2.cortex-key-2026-v2..." required></label><label>CRL1 İptal Listesi (isteğe bağlı)<input class="input mono" name="crl" placeholder="CRL1.cortex-key-2026-v2..."></label><label>Emekli Edilen Anahtar Kimlikleri (virgülle)<input class="input mono" name="retiredKids" placeholder="cortex-key-2026-v1"></label><label>İstenen Kamera Sayısı<input class="input mono" type="number" name="cameras" value="4" min="1" max="512" required></label><button class="btn btn-signal">Lisansı doğrula ve uygula</button></form>{license_info}</section>
      <section><div class="eyebrow">05 / SEKTÖR KÜTÜPHANESİ</div><h2>Sektöre göre kural şablonları</h2><p>Her paketi açarak kural listesini inceleyin.</p>{packs}</section>"#,
            &PUBLIC_KEY_V1_N_HEX[..16],
            &PUBLIC_KEY_V2_N_HEX[..16]
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
        let (stream_ok, _, _) = run_stream_decode_and_event_pipeline();
        assert!(stream_ok);
        return;
    }
    serve(
        "ipscans-cortex",
        17944,
        Arc::new(|method, path, body| match (method, path) {
            ("GET", "/" | "/index.html") => screen("", "", "", ""),
            ("POST", "/roi") => screen(
                "",
                &roi_result(body).unwrap_or_else(|e| format!("<output>{e}</output>")),
                "",
                "",
            ),
            ("POST", "/stream-test" | "/api/stream-analyze") => {
                let (ok, json_out, html_out) = run_stream_decode_and_event_pipeline();
                if path == "/api/stream-analyze" {
                    json(if ok { 200 } else { 500 }, json_out)
                } else {
                    screen("", "", &html_out, "")
                }
            }
            ("POST", "/license" | "/api/license/verify") => {
                let read = |k| {
                    if path.starts_with("/api/") {
                        extract_json_string(body, k)
                    } else {
                        field(body, k)
                    }
                };
                let token = read("token").unwrap_or_default();
                let crl = read("crl");
                let retired = read("retiredKids").unwrap_or_default();
                let cams = read("cameras")
                    .and_then(|v| v.parse::<u32>().ok())
                    .unwrap_or(1);
                let now_override = read("nowUnix").and_then(|v| v.parse::<u64>().ok());
                let outcome =
                    verify_client_license(&token, crl.as_deref(), &retired, cams, now_override);
                if path == "/api/license/verify" {
                    json(
                        if outcome.allowed { 200 } else { 403 },
                        outcome_to_json(&outcome),
                    )
                } else {
                    let msg = format!(
                        "<output>Durum: {} · İzin: {} · Mesaj: {}</output>",
                        outcome.status_code,
                        if outcome.allowed { "AÇIK" } else { "ENGELLENDİ" },
                        escape(&outcome.reason_tr)
                    );
                    screen("", "", "", &msg)
                }
            }
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
                screen(&list, "", "", "")
            }
            _ => json(404, r#"{"error":"Bulunamadı"}"#.into()),
        }),
    );
}
