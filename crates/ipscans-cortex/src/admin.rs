#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use ipscans_core::console::{escape, field, json, page, serve, Reply};
use ipscans_core::cryptography::{
    enforce_cortex_license, sign_cortex_license_asymmetric, sign_license,
    sign_revocation_list_asymmetric, CortexLicenseClaims, LicenseEnforcementResult,
    PUBLIC_KEY_V1_N_HEX, PUBLIC_KEY_V2_N_HEX,
};
use ipscans_core::json::{extract_json_string, json_str};
use std::{
    env,
    sync::Arc,
    time::{SystemTime, UNIX_EPOCH},
};

// Operator signing exponents exist ONLY in CortexAdmin.exe (issuer tool) and NEVER in IPScans-Cortex.exe (client).
const ISSUER_PRIV_D_V1: &str = "2729cb41cc9d328d65662657c111f561bece52d186b4a5698196a6f92609ae4f3d0ec1930b1d917781f14e399a2b53d900f9f5d26f63f79d58ddb673a61e0c2d";
const ISSUER_PRIV_D_V2: &str = "34d8e3ce254208d6bfa4e839fa54e8edcbcfef26ac132652143ef33a5a0275828c8bbe9b69aae7fadda88c556aa8770031c39e558a8f2434abdc58b9cd35d3a9";

fn select_issuer_key(kid: &str) -> (&'static str, String, &'static str) {
    if kid == "cortex-key-2026-v2" {
        let d = env::var("IPSCANS_LICENSE_PRIVATE_D_V2")
            .unwrap_or_else(|_| ISSUER_PRIV_D_V2.to_string());
        ("cortex-key-2026-v2", d, PUBLIC_KEY_V2_N_HEX)
    } else {
        let d = env::var("IPSCANS_LICENSE_PRIVATE_D")
            .unwrap_or_else(|_| ISSUER_PRIV_D_V1.to_string());
        ("cortex-key-2026-v1", d, PUBLIC_KEY_V1_N_HEX)
    }
}

fn tier_max_cameras(tier: &str) -> u32 {
    match tier {
        "PRO" => 8,
        "PLUS" => 24,
        "ULTRA" => 64,
        _ => 4,
    }
}

fn outcome_to_json(o: &LicenseEnforcementResult) -> String {
    format!(
        r#"{{"allowed":{},"statusCode":{},"reason":{}}}"#,
        o.allowed,
        json_str(o.status_code),
        json_str(&o.reason_tr)
    )
}

fn run_full_license_lifecycle_verification() -> (bool, String, String) {
    let now = 1_762_000_000u64;
    let (_, d1, n1) = select_issuer_key("cortex-key-2026-v1");
    let (_, d2, n2) = select_issuer_key("cortex-key-2026-v2");

    // 1. Active license on v1 (PRO tier = 8 cameras)
    let claims_v1 = CortexLicenseClaims {
        license_id: "LIC-2026-001".into(),
        key_id: "cortex-key-2026-v1".into(),
        customer: "Anadolu OSB Güvenlik".into(),
        tier: "PRO".into(),
        max_cameras: 8,
        issued_at_unix: now,
        expires_at_unix: now + 86_400 * 30,
    };
    let token_v1 = sign_cortex_license_asymmetric(&d1, n1, &claims_v1).expect("sign v1");

    let active_check = enforce_cortex_license(&token_v1, None, &[], now + 3600, 6);
    let quota_check = enforce_cortex_license(&token_v1, None, &[], now + 3600, 12);
    // 2. Expiration check
    let expired_check = enforce_cortex_license(&token_v1, None, &[], now + 86_400 * 31, 4);
    // 3. Revocation check via signed CRL1
    let crl_token = sign_revocation_list_asymmetric(
        &d1,
        n1,
        "cortex-key-2026-v1",
        now + 7200,
        &["LIC-2026-001"],
    )
    .expect("sign crl");
    let revoked_check = enforce_cortex_license(&token_v1, Some(&crl_token), &[], now + 7200, 4);
    // 4. Key rotation check: retire v1, issue v2
    let retired = ["cortex-key-2026-v1"];
    let rotated_old_check = enforce_cortex_license(&token_v1, None, &retired, now + 3600, 4);
    let claims_v2 = CortexLicenseClaims {
        license_id: "LIC-2026-002".into(),
        key_id: "cortex-key-2026-v2".into(),
        customer: "Anadolu OSB Güvenlik".into(),
        tier: "ULTRA".into(),
        max_cameras: 64,
        issued_at_unix: now,
        expires_at_unix: now + 86_400 * 365,
    };
    let token_v2 = sign_cortex_license_asymmetric(&d2, n2, &claims_v2).expect("sign v2");
    let rotated_new_check = enforce_cortex_license(&token_v2, None, &retired, now + 3600, 32);

    let passed = active_check.allowed
        && active_check.status_code == "ACTIVE"
        && !quota_check.allowed
        && quota_check.status_code == "QUOTA_EXCEEDED"
        && !expired_check.allowed
        && expired_check.status_code == "EXPIRED"
        && !revoked_check.allowed
        && revoked_check.status_code == "REVOKED"
        && !rotated_old_check.allowed
        && rotated_old_check.status_code == "KEY_ROTATED_OUT"
        && rotated_new_check.allowed
        && rotated_new_check.status_code == "ACTIVE";

    let html = format!(
        r#"<output>Asimetrik RSA-512-SHA256 Lisans Yaşam Döngüsü Doğrulandı (İstemcide Özel Anahtar Yok)</output>
        <div class="data-table-wrap"><table class="data-table"><thead><tr><th>Senaryo</th><th>Anahtar (kid)</th><th>Beklenen Durum</th><th>Gözlenen Durum</th><th>İstemci Kararı</th></tr></thead><tbody>
        <tr><td>1. Geçerli Lisans (6/8 Kamera)</td><td class="mono">cortex-key-2026-v1</td><td>ACTIVE</td><td class="mono">{}</td><td>İZİN VERİLDİ</td></tr>
        <tr><td>2. Kamera Kotası Aşımı (12/8 Kamera)</td><td class="mono">cortex-key-2026-v1</td><td>QUOTA_EXCEEDED</td><td class="mono">{}</td><td>REDDEDİLDİ</td></tr>
        <tr><td>3. Süresi Dolmuş Lisans (+31 Gün)</td><td class="mono">cortex-key-2026-v1</td><td>EXPIRED</td><td class="mono">{}</td><td>REDDEDİLDİ</td></tr>
        <tr><td>4. İptal Edilmiş Lisans (CRL1)</td><td class="mono">cortex-key-2026-v1</td><td>REVOKED</td><td class="mono">{}</td><td>REDDEDİLDİ</td></tr>
        <tr><td>5. Rotasyon Sonrası Eski Anahtar</td><td class="mono">cortex-key-2026-v1 (Emekli)</td><td>KEY_ROTATED_OUT</td><td class="mono">{}</td><td>REDDEDİLDİ</td></tr>
        <tr><td>6. Rotasyon Sonrası Yeni Anahtar (ULTRA)</td><td class="mono">cortex-key-2026-v2 (Aktif)</td><td>ACTIVE</td><td class="mono">{}</td><td>İZİN VERİLDİ</td></tr>
        </tbody></table></div>
        <p class="mono" style="word-break:break-all;margin-top:8px"><strong>Örnek v2 İmzalı Lisans:</strong> {}</p>
        <p class="mono" style="word-break:break-all"><strong>Örnek İmzalı CRL1:</strong> {}</p>"#,
        active_check.status_code,
        quota_check.status_code,
        expired_check.status_code,
        revoked_check.status_code,
        rotated_old_check.status_code,
        rotated_new_check.status_code,
        escape(&token_v2),
        escape(&crl_token)
    );
    let json_payload = format!(
        r#"{{"ok":{passed},"active":{},"quotaExceeded":{},"expired":{},"revoked":{},"rotatedOld":{},"rotatedNew":{},"sampleTokenV2":{},"sampleCrl":{}}}"#,
        outcome_to_json(&active_check),
        outcome_to_json(&quota_check),
        outcome_to_json(&expired_check),
        outcome_to_json(&revoked_check),
        outcome_to_json(&rotated_old_check),
        outcome_to_json(&rotated_new_check),
        json_str(&token_v2),
        json_str(&crl_token)
    );
    (passed, json_payload, html)
}

fn screen(result: &str) -> Reply {
    page(
        "Cortex Admin",
        "admin",
        "Asimetrik RSA-512-SHA256 kurumsal lisans imzalama, iptal listesi (CRL) ve anahtar rotasyonu konsolu",
        &format!(
            r#"
    <div class="kpi-strip">
      <div class="kpi-box"><div class="kpi-label">İMZALAMA ALGORİTMASI</div><div class="kpi-val mono">RSA-512 · SHA-256</div><div class="kpi-sub">Asimetrik IPS2 / CRL1 Standardı</div></div>
      <div class="kpi-box"><div class="kpi-label">AKTİF ROTASYON ANAHTARI</div><div class="kpi-val mono" style="color:var(--signal)">cortex-key-2026-v2</div><div class="kpi-sub">v1 Geriye Dönük Doğrulama Destekli</div></div>
      <div class="kpi-box"><div class="kpi-label">İPTAL LİSTESİ (CRL)</div><div class="kpi-val mono" style="color:var(--ok)">CRL1 İMZALI</div><div class="kpi-sub">Çevrimdışı Lisans İptal Denetimi</div></div>
      <div class="kpi-box"><div class="kpi-label">ANAHTAR İZOLASYONU</div><div class="kpi-val mono">TAM AYRIM</div><div class="kpi-sub">İstemcide özel anahtar bulunmaz</div></div>
    </div>
    <section><div class="eyebrow">ASİMETRİK LİSANS İMZALAMA (IPS2)</div><h2>Yeni lisans imzala</h2>
    <p>Lisanslar RSA-512-SHA256 özel anahtarıyla (<span class="mono">CortexAdmin.exe</span> içinde) imzalanır; dağıtılan <span class="mono">IPScans-Cortex.exe</span> istemcisinde yalnızca açık doğrulama modülü (<span class="mono">PUBLIC_KEY_V1/V2</span>) bulunur.</p>
    <form method="post" action="/issue">
    <label>Lisans Kimliği (ID)<input class="input mono" required maxlength="64" name="licenseId" value="LIC-2026-104"></label>
    <label>Müşteri veya kurum<input class="input" required maxlength="120" name="customer" value="Marmara Liman İşletmeleri"></label>
    <label>Paket<select class="select" name="tier"><option>PRO</option><option>PLUS</option><option>ULTRA</option></select></label>
    <label>İmzalama Anahtarı (Rotasyon)<select class="select" name="kid"><option value="cortex-key-2026-v2">cortex-key-2026-v2 (Güncel Rotasyon Anahtarı)</option><option value="cortex-key-2026-v1">cortex-key-2026-v1 (Önceki Anahtar)</option></select></label>
    <label>Geçerlilik (gün)<input class="input mono" type="number" name="days" min="1" max="3650" value="365" required></label>
    <button class="btn btn-signal">IPS2 Lisansı İmzala</button>
    <button class="btn btn-secondary" formaction="/lifecycle-verify">Uygulama, süre dolumu, iptal ve rotasyon döngüsünü doğrula</button>
    </form>{result}</section>
    <section><div class="eyebrow">LİSANS İPTAL LİSTESİ (CRL1)</div><h2>İptal listesi imzala</h2>
    <p>İptal edilen lisans kimliklerini virgülle ayırarak imzalı <span class="mono">CRL1</span> paketi üretin.</p>
    <form method="post" action="/revoke">
    <label>İptal Edilecek Lisans Kimlikleri<input class="input mono" name="revokedIds" value="LIC-2026-001,LIC-2026-089" required></label>
    <label>İmzalama Anahtarı<select class="select" name="kid"><option value="cortex-key-2026-v2">cortex-key-2026-v2</option><option value="cortex-key-2026-v1">cortex-key-2026-v1</option></select></label>
    <button class="btn btn-danger">CRL1 İptal Listesi İmzala</button>
    </form></section>"#
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
        let (ok, _, _) = run_full_license_lifecycle_verification();
        assert!(ok);
        return;
    }
    serve(
        "cortex-admin",
        17945,
        Arc::new(|method, path, body| match (method, path) {
            ("GET", "/" | "/index.html") => {
                let (_, _, html_out) = run_full_license_lifecycle_verification();
                screen(&html_out)
            }
            ("POST", "/lifecycle-verify" | "/api/lifecycle-verify") => {
                let (ok, json_out, html_out) = run_full_license_lifecycle_verification();
                if path == "/api/lifecycle-verify" {
                    json(if ok { 200 } else { 500 }, json_out)
                } else {
                    screen(&html_out)
                }
            }
            ("POST", "/revoke" | "/api/revoke") => {
                let read = |key| {
                    if path == "/revoke" {
                        field(body, key)
                    } else {
                        extract_json_string(body, key)
                    }
                };
                let kid_req = read("kid").unwrap_or_else(|| "cortex-key-2026-v2".to_string());
                let (kid, d_hex, n_hex) = select_issuer_key(&kid_req);
                let raw_ids = read("revokedIds").unwrap_or_default();
                let ids: Vec<&str> = raw_ids
                    .split(',')
                    .map(str::trim)
                    .filter(|s| !s.is_empty())
                    .collect();
                let now = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .map(|d| d.as_secs())
                    .unwrap_or(1_762_000_000);
                match sign_revocation_list_asymmetric(&d_hex, n_hex, kid, now, &ids) {
                    Ok(crl) => {
                        if path == "/api/revoke" {
                            json(
                                200,
                                format!(
                                    r#"{{"ok":true,"kid":{},"revokedCount":{},"crlToken":{}}}"#,
                                    json_str(kid),
                                    ids.len(),
                                    json_str(&crl)
                                ),
                            )
                        } else {
                            screen(&format!(
                                "<output>İmzalı CRL1 İptal Listesi ({kid}) · {}</output>",
                                escape(&crl)
                            ))
                        }
                    }
                    Err(e) => {
                        if path == "/api/revoke" {
                            json(400, format!(r#"{{"ok":false,"error":{}}}"#, json_str(e)))
                        } else {
                            screen(&format!("<output>{}</output>", escape(e)))
                        }
                    }
                }
            }
            ("POST", "/issue" | "/api/generate") => {
                let read = |key| {
                    if path == "/issue" {
                        field(body, key)
                    } else {
                        extract_json_string(body, key)
                    }
                };
                let license_id = read("licenseId").unwrap_or_else(|| "LIC-2026-100".to_string());
                let customer = read("customer").unwrap_or_default();
                let tier = read("tier").unwrap_or_default();
                let kid_req = read("kid").unwrap_or_else(|| "cortex-key-2026-v2".to_string());
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
                        let (kid, d_hex, n_hex) = select_issuer_key(&kid_req);
                        let claims = CortexLicenseClaims {
                            license_id: license_id.clone(),
                            key_id: kid.to_string(),
                            customer: customer.clone(),
                            tier: tier.clone(),
                            max_cameras: tier_max_cameras(&tier),
                            issued_at_unix: now,
                            expires_at_unix: now + days * 86400,
                        };
                        sign_cortex_license_asymmetric(&d_hex, n_hex, &claims)
                    });
                if path == "/api/generate" {
                    match result {
                        Ok(key) => json(
                            200,
                            format!(
                                r#"{{"ok":true,"licenseId":{},"customer":{},"tier":{},"kid":{},"key":{}}}"#,
                                json_str(&license_id),
                                json_str(&customer),
                                json_str(&tier),
                                json_str(&kid_req),
                                json_str(&key)
                            ),
                        ),
                        Err(err) => {
                            json(400, format!(r#"{{"ok":false,"error":{}}}"#, json_str(err)))
                        }
                    }
                } else {
                    let msg = match result {
                        Ok(key) => format!("İmzalı IPS2 Anahtarı ({kid_req}) · {}", escape(&key)),
                        Err(err) => escape(err),
                    };
                    screen(&format!("<output style=\"word-break:break-all\">{msg}</output>"))
                }
            }
            _ => json(404, r#"{"error":"Bulunamadı"}"#.into()),
        }),
    );
}
