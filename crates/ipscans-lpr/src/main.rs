#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use ipscans_core::console::{escape, field, json, page, serve, Reply};
use ipscans_core::lpr_engine::parse_and_validate_plate;
use ipscans_core::win32::app_data_dir;
use std::{fs, io, path::Path, sync::Arc};

fn plate_id(raw: &str) -> Result<String, &'static str> {
    if !raw
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == ' ' || c == '-')
    {
        return Err("Plakada yalnızca harf, rakam, boşluk ve tire kullanın.");
    }
    parse_and_validate_plate(raw)
        .map(|(plate, _)| plate)
        .ok_or("5–10 harf veya rakam içeren plaka girin.")
}

fn register(dir: &Path, plate: &str, unit: &str, owner: &str) -> Result<(), String> {
    if [owner, unit]
        .iter()
        .any(|s| s.trim().is_empty() || s.len() > 160 || s.chars().any(char::is_control))
    {
        return Err("Daire ve araç sahibi alanlarını doldurun (en fazla 160 bayt).".into());
    }
    // The target only becomes visible after the complete record has been written.
    let path = dir.join(format!("plate-{plate}.txt"));
    let tmp = dir.join(format!("stage-{}-{}", std::process::id(), plate));
    let data = format!("{plate}\t{}\t{}", unit.trim(), owner.trim());
    fs::write(&tmp, data).map_err(|e| e.to_string())?;
    let result = fs::hard_link(&tmp, path);
    let _ = fs::remove_file(tmp);
    match result {
        Ok(()) => Ok(()),
        Err(e) if e.kind() == io::ErrorKind::AlreadyExists => Err("Plaka zaten kütükte.".into()),
        Err(e) => Err(e.to_string()),
    }
}

fn screen(dir: &Path, message: &str) -> Reply {
    let mut rows = Vec::new();
    let mut status = message.to_owned();
    match fs::read_dir(dir) {
        Ok(entries) => {
            for entry in entries
                .flatten()
                .filter(|e| e.file_name().to_string_lossy().starts_with("plate-"))
            {
                match fs::read_to_string(entry.path()) {
                    Ok(record) => {
                        let cells: Vec<_> = record.split('\t').map(escape).collect();
                        if let [plate, unit, owner] = &cells[..] {
                            rows.push(format!("<tr><td class=mono>{plate}</td><td>{unit}</td><td>{owner}</td></tr>"));
                        }
                    }
                    Err(e) => status = format!("Kayıt okunamadı. {e}"),
                }
            }
        }
        Err(e) => status = format!("Kütük okunamadı. {e}"),
    }
    rows.sort();
    let count = rows.len();
    if count == 0 {
        rows.push("<tr><td colspan=3>Henüz kayıtlı araç yok.</td></tr>".into());
    }
    let status = if status.is_empty() {
        String::new()
    } else {
        format!("<output>{}</output>", escape(&status))
    };
    page(
        "IPScans LPR Pro",
        "lpr",
        "Araç kütüğü ve manuel geçiş kontrolü",
        &format!(
            r#"
        <section><div class="eyebrow">01 / GEÇİŞ KONTROLÜ</div><h2>Plaka sorgula</h2>
        <p>Plakayı girerek bu bilgisayardaki araç kütüğüyle karşılaştırın. Kamera OCR ve fiziksel bariyer rölesi bağlı değil.</p>
        <form method="post" action="/lookup"><label>Plaka<input class="input mono" name="plate" required maxlength="16" placeholder="34 ABC 123"></label><button class="btn btn-signal">Kütükte sorgula</button></form>{status}</section>
        <section><div class="eyebrow">02 / ARAÇ KÜTÜĞÜ · {count} KAYIT</div><h2>Yetkili araç ekle</h2>
        <form method="post" action="/register"><label>Plaka<input class="input mono" name="plate" required maxlength="16"></label><label>Blok / Daire<input class="input" name="unit" required maxlength="80"></label><label>Araç sahibi<input class="input" name="owner" required maxlength="80"></label><button class="btn btn-signal">Kaydet</button></form>
        <div class="data-table-wrap"><table class="data-table"><thead><tr><th>Plaka</th><th>Blok / Daire</th><th>Araç sahibi</th></tr></thead><tbody>{}</tbody></table></div></section>"#,
            rows.join("")
        ),
    )
}

fn main() {
    ipscans_core::win32::handle_desktop_install("IPScans-LPR-Pro.exe");
    let args: Vec<_> = std::env::args().collect();
    if args.iter().any(|a| a == "--version" || a == "-V") {
        println!("IPScans LPR Pro {}", env!("CARGO_PKG_VERSION"));
        return;
    }
    if args.iter().any(|a| a == "--selftest" || a == "--self-test") {
        assert_eq!(plate_id("34abc123"), Ok("34 ABC 123".into()));
        return;
    }
    let dir = app_data_dir("lpr-registry");
    let writes = std::sync::Mutex::new(());
    serve(
        "ipscans-lpr",
        17943,
        Arc::new(move |method, path, body| match (method, path) {
            ("GET", "/" | "/index.html") => screen(&dir, ""),
            ("POST", "/register" | "/lookup") => {
                let msg = match plate_id(&field(body, "plate").unwrap_or_default()) {
                    Err(err) => err.to_owned(),
                    Ok(plate) if path == "/register" => {
                        let _guard = writes.lock().unwrap_or_else(|e| e.into_inner());
                        match register(
                            &dir,
                            &plate,
                            &field(body, "unit").unwrap_or_default(),
                            &field(body, "owner").unwrap_or_default(),
                        ) {
                            Ok(()) => format!("{plate} kütüğe kaydedildi."),
                            Err(err) => err,
                        }
                    }
                    Ok(plate) => match fs::metadata(dir.join(format!("plate-{plate}.txt"))) {
                        Ok(_) => format!("{plate} · Yetkili araç."),
                        Err(e) if e.kind() == io::ErrorKind::NotFound => {
                            format!("{plate} · Kütükte bulunamadı.")
                        }
                        Err(e) => format!("Kütük okunamadı. {e}"),
                    },
                };
                screen(&dir, &msg)
            }
            _ => json(404, r#"{"error":"Bulunamadı"}"#.into()),
        }),
    );
}
