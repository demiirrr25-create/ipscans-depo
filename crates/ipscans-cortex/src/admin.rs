#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use ipscans_core::console::{escape, field, json, page, serve, Reply};
use ipscans_core::cryptography::sign_license;
use ipscans_core::json::{extract_json_string, json_str};
use std::{
    env,
    sync::Arc,
    time::{SystemTime, UNIX_EPOCH},
};

fn screen(result: &str) -> Reply {
    page(
        "Cortex Admin",
        "admin",
        "Kurumsal lisans imzalama konsolu",
        &format!(
            r#"
    <section><div class="eyebrow">01 / LİSANS İŞLEMLERİ</div><h2>Yeni lisans imzala</h2>
    <p>Anahtar, müşteri adı, paket ve sona erme zamanını kapsar. İmza için bu bilgisayarda IPSCANS_LICENSE_SECRET tanımlanmalı (en az 32 bayt).</p>
    <form method="post" action="/issue"><label>Müşteri veya kurum<input class="input" required maxlength="120" name="customer"></label><label>Paket<select class="select" name="tier"><option>PRO</option><option>PLUS</option><option>ULTRA</option></select></label><label>Geçerlilik (gün)<input class="input mono" type="number" name="days" min="1" max="3650" value="365" required></label>
    <button class="btn btn-signal">İmzala</button></form>{result}</section>
    <section><div class="eyebrow">02 / SAKLAMA</div><h2>İmzalı kaydı teslim et</h2><p>Üretilen anahtarı kopyalayıp saklayın. Müşteri ve anahtar geçmişi bu ekranda depolanmaz. Kamera kotasının uygulanması için istemcinin imzayı doğrulaması gerekir.</p></section>"#
        ),
    )
}

fn main() {
    ipscans_core::win32::handle_desktop_install("CortexAdmin.exe");
    let args: Vec<_> = env::args().collect();
    if args.iter().any(|a| a == "--version" || a == "-V") {
        println!("CortexAdmin {}", env!("CARGO_PKG_VERSION"));
        return;
    }
    if args.iter().any(|a| a == "--selftest" || a == "--self-test") {
        let fixture = [42; 32];
        assert_ne!(
            sign_license(&fixture, "Müşteri", "PRO", 100).unwrap(),
            sign_license(&fixture, "Müşteri", "PRO", 101).unwrap()
        );
        return;
    }
    serve(
        "cortex-admin",
        17945,
        Arc::new(|method, path, body| match (method, path) {
            ("GET", "/" | "/index.html") => screen(""),
            ("POST", "/issue" | "/api/generate") => {
                let read = |key| {
                    if path == "/issue" {
                        field(body, key)
                    } else {
                        extract_json_string(body, key)
                    }
                };
                let customer = read("customer").unwrap_or_default();
                let tier = read("tier").unwrap_or_default();
                let days = read("days")
                    .and_then(|v| v.parse::<u64>().ok())
                    .filter(|d| (1..=3650).contains(d));
                let result = days
                    .ok_or("Geçerlilik 1–3650 gün olmalı.")
                    .and_then(|days| {
                        let now = SystemTime::now()
                            .duration_since(UNIX_EPOCH)
                            .map_err(|_| "Sistem saati geçersiz.")?
                            .as_secs();
                        let key = env::var("IPSCANS_LICENSE_SECRET")
                            .map_err(|_| "İmzalama anahtarı yapılandırılmadı.")?;
                        sign_license(key.as_bytes(), &customer, &tier, now + days * 86400)
                    });
                if path == "/api/generate" {
                    match result {
                        Ok(key) => json(
                            200,
                            format!(
                                r#"{{"ok":true,"customer":{},"tier":{},"key":{}}}"#,
                                json_str(&customer),
                                json_str(&tier),
                                json_str(&key)
                            ),
                        ),
                        Err(err) => {
                            json(400, format!(r#"{{"ok":false,"error":{}}}"#, json_str(err)))
                        }
                    }
                } else {
                    let msg = match result {
                        Ok(key) => format!("İmzalı anahtar · {}", escape(&key)),
                        Err(err) => escape(err),
                    };
                    screen(&format!("<output>{msg}</output>"))
                }
            }
            _ => json(404, r#"{"error":"Bulunamadı"}"#.into()),
        }),
    );
}
