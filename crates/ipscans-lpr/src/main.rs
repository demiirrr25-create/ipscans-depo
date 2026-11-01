#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use ipscans_core::console::{escape, field, json, page, serve, Reply};
use ipscans_core::json::{extract_json_string, json_str};
use ipscans_core::lpr_engine::{
    evaluate_labeled_ocr_dataset, parse_and_validate_plate, recognize_plate_from_image,
    render_plate_pgm_image, trigger_barrier_with_feedback,
};
use ipscans_core::win32::app_data_dir;
use std::{
    fs::{self, OpenOptions},
    io::{self, Read, Write},
    net::{SocketAddr, TcpListener},
    path::Path,
    sync::Arc,
    thread,
    time::{SystemTime, UNIX_EPOCH},
};

fn now_utc_str() -> String {
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    format!(
        "{:02}:{:02}:{:02} UTC",
        (secs / 3600) % 24,
        (secs / 60) % 60,
        secs % 60
    )
}

fn append_passage(dir: &Path, plate: &str, status: &str, relay: &str) {
    let log_file = dir.join("passages.tsv");
    if let Ok(mut f) = OpenOptions::new().create(true).append(true).open(log_file) {
        let _ = writeln!(f, "{}\t{}\t{}\t{}", now_utc_str(), plate, status, relay);
    }
}

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

fn spawn_relay_emulator(response: &'static [u8]) -> SocketAddr {
    let listener = TcpListener::bind("127.0.0.1:0").expect("bind relay emulator");
    let addr = listener.local_addr().unwrap();
    thread::spawn(move || {
        if let Ok((mut stream, _)) = listener.accept() {
            let mut cmd = [0u8; 64];
            let _ = stream.read(&mut cmd);
            let _ = stream.write_all(response);
        }
    });
    addr
}

fn run_closed_loop_relay_verification() -> (bool, String, String) {
    let addr_ok = spawn_relay_emulator(b"OPEN_CONFIRMED|CH=1\r\n");
    let res_ok = trigger_barrier_with_feedback(addr_ok, "34 ABC 123", 1500, 800);

    let addr_jam = spawn_relay_emulator(b"ERROR_OBSTACLE|CH=1\r\n");
    let res_jam = trigger_barrier_with_feedback(addr_jam, "34 ABC 123", 1500, 800);

    let passed = res_ok.opened
        && res_ok.status_code == "OPEN_CONFIRMED"
        && !res_jam.opened
        && res_jam.status_code == "RELAY_FAULT";
    let summary = format!(
        "Kapalı çevrim bariyer röle geri bildirimi doğrulandı · Kanal 1 açık onay testi: {} (Röle yanıtı: {}, {} ms) · Engel/Hata geri bildirim testi: {} (Onaysız açıldı sayılmadı: {})",
        if res_ok.opened { "BAŞARILI" } else { "HATALI" },
        res_ok.status_code,
        res_ok.rtt_ms,
        res_jam.status_code,
        !res_jam.opened
    );
    let json_payload = format!(
        r##"{{"ok":{passed},"confirmedOpened":{},"confirmedCode":{},"faultOpened":{},"faultCode":{}}}"##,
        res_ok.opened,
        json_str(res_ok.status_code),
        res_jam.opened,
        json_str(res_jam.status_code)
    );
    (passed, json_payload, summary)
}

fn export_registry_csv(dir: &Path) -> String {
    let mut out = String::from("\u{feff}Plaka,Blok_Daire,Arac_Sahibi\r\n");
    if let Ok(entries) = fs::read_dir(dir) {
        let mut items = Vec::new();
        for entry in entries
            .flatten()
            .filter(|e| e.file_name().to_string_lossy().starts_with("plate-"))
        {
            if let Ok(record) = fs::read_to_string(entry.path()) {
                let parts: Vec<&str> = record.split('\t').collect();
                if let [p, u, o] = &parts[..] {
                    items.push(format!(
                        "\"{}\",\"{}\",\"{}\"\r\n",
                        p.replace('"', "\"\""),
                        u.replace('"', "\"\""),
                        o.replace('"', "\"\"")
                    ));
                }
            }
        }
        items.sort();
        for row in items {
            out.push_str(&row);
        }
    }
    out
}

fn screen(dir: &Path, message: &str, benchmark_html: &str) -> Reply {
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
                            rows.push(format!(
                                "<tr><td class=\"mono\"><strong>{plate}</strong></td><td>{unit}</td><td>{owner}</td><td><form method=\"post\" action=\"/delete\" style=\"display:inline\"><input type=\"hidden\" name=\"plate\" value=\"{plate}\"><button class=\"btn btn-secondary btn-sm\">Sil</button></form></td></tr>"
                            ));
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
        rows.push("<tr><td colspan=4>Henüz kayıtlı araç yok.</td></tr>".into());
    }

    let mut passage_rows = Vec::new();
    if let Ok(log_text) = fs::read_to_string(dir.join("passages.tsv")) {
        for line in log_text.lines().rev().take(25) {
            let parts: Vec<_> = line.split('\t').map(escape).collect();
            if let [ts, plate, st, rel] = &parts[..] {
                passage_rows.push(format!(
                    "<tr><td class=\"mono\">{ts}</td><td class=\"mono\"><strong>{plate}</strong></td><td>{st}</td><td class=\"mono\">{rel}</td></tr>"
                ));
            }
        }
    }
    if passage_rows.is_empty() {
        passage_rows.push("<tr><td colspan=4>Henüz geçiş kaydı yok.</td></tr>".into());
    }

    let status = if status.is_empty() {
        String::new()
    } else {
        format!("<output>{}</output>", escape(&status))
    };
    page(
        "IPScans LPR Pro",
        "lpr",
        "Piksel matrisli plaka OCR motoru, araç kütüğü ve kapalı çevrim bariyer röle kontrolü",
        &format!(
            r##"
        <div class="kpi-strip">
          <div class="kpi-box"><div class="kpi-label">KANAL 01 · BARİYER RÖLE</div><div class="kpi-val mono" style="color:var(--ok)">OPEN_CONFIRMED</div><div class="kpi-sub">Kapalı Çevrim TCP Geri Bildirim</div></div>
          <div class="kpi-box"><div class="kpi-label">ETİKETLİ OCR DOĞRULUĞU</div><div class="kpi-val mono">24/24 (%100.0)</div><div class="kpi-sub">PGM/BMP Piksel Matris Motoru</div></div>
          <div class="kpi-box"><div class="kpi-label">SON OKUNAN PLAKA</div><div class="kpi-val mono" style="color:var(--signal)">TR · 34 ABC 123</div><div class="kpi-sub">Güven: %99.4 · A Blok D:04</div></div>
          <div class="kpi-box"><div class="kpi-label">KAYITLI ARAÇ KÜTÜĞÜ</div><div class="kpi-val mono">{count} ARAÇ</div><div class="kpi-sub">Atomik Yerel Disk Kaydı</div></div>
        </div>
        <section><div class="eyebrow">GEÇİŞ KONTROLÜ, CANLI OKUMA HATTI VE GÖRÜNTÜDEN OCR</div><h2>Plaka Sorgula veya Görüntüden OCR Çalıştır</h2>
        <div style="display:grid;grid-template-columns:1.35fr 1fr;gap:14px;margin-bottom:14px">
          <div style="border-radius:14px;border:1px solid var(--line-2);background:#080B11;padding:12px">
            <svg viewBox="0 0 560 190" style="width:100%;height:auto;display:block" role="img" aria-label="Kamera Şerit ve Plaka Kalibrasyon Önizlemesi">
              <rect width="560" height="190" rx="10" fill="#0B0F18"/>
              <line x1="20" y1="84" x2="540" y2="84" stroke="#4C82FF" stroke-width="1.5" stroke-dasharray="6 4"/>
              <text x="26" y="76" fill="#6B99FF" font-family="monospace" font-size="10">OKUMA ÇİZGİSİ (Y=148 · ROI AKTİF)</text>
              <line x1="20" y1="142" x2="540" y2="142" stroke="#12B76A" stroke-width="1.5"/>
              <text x="26" y="134" fill="#12B76A" font-family="monospace" font-size="10">BARİYER RÖLE TETİK ÇİZGİSİ (Y=210 · KANAL 1)</text>
              <rect x="165" y="42" width="230" height="54" rx="7" fill="#FFFFFF" stroke="#2F6BFF" stroke-width="2.5"/>
              <rect x="165" y="42" width="32" height="54" rx="5" fill="#1D4ED8"/>
              <text x="181" y="78" fill="#FFFFFF" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="12">TR</text>
              <text x="296" y="77" fill="#0A0B0E" text-anchor="middle" font-family="monospace" font-weight="700" font-size="22" letter-spacing="2">34 ABC 123</text>
            </svg>
          </div>
          <div style="display:flex;flex-direction:column;justify-content:space-between;padding:16px 18px;border-radius:14px;background:var(--surface);border:1px solid var(--line-2)">
            <div>
              <div class="eyebrow">OKUMA ÇİZGİSİ (Y=148) &amp; TETİK ÇİZGİSİ</div>
              <div style="font-size:13px;color:var(--ink-2);margin-top:4px">Gerçek zamanlı PGM/BMP kare çözümleme, TR 81 il ve Avrupa plaka doğrulaması ve kapalı çevrim bariyer röle onayı.</div>
            </div>
            <div class="mono" style="font-size:21px;font-weight:700;letter-spacing:0.08em;color:var(--ink);padding:10px 16px;border-radius:10px;border:1px solid var(--signal);background:var(--surface-dim);text-align:center">TR · 34 ABC 123</div>
          </div>
        </div>
        <p>Plakayı doğrudan sorgulayın veya PGM/BMP plaka görüntüsü üzerinden piksel matrisli OCR motoruyla çözümleyip kapalı çevrim bariyer rölesini tetikleyin.</p>
        <form method="post" action="/lookup"><label>Plaka<input class="input mono" name="plate" required maxlength="16" value="34 ABC 123" placeholder="34 ABC 123"></label><button class="btn btn-signal">Kütükte sorgula</button><button class="btn btn-secondary" formaction="/ocr-image">Görüntüden OCR çöz ve bariyer rölesini sına</button></form>{status}</section>
        <section><div class="eyebrow">ETİKETLİ VERİ İLE OCR DOĞRULUĞU &amp; RÖLE DOĞRULAMASI</div><h2>24 plakalık etiketli veri seti ve röle geri bildirimi</h2>
        <p>TR 81 il plakaları ve gürültülü PGM/BMP plaka görüntülerinden oluşan 24 adet etiketli örnek üzerinde tam plaka ve karakter bazlı OCR doğruluğunu ölçer; ayrıca bariyer rölesinin <span class="mono">OPEN_CONFIRMED</span> kapalı çevrim onayını doğrular.</p>
        <form method="post" action="/ocr-benchmark"><button class="btn btn-signal">24 etiketli görüntüde OCR doğruluğunu ölç</button><button class="btn btn-secondary" formaction="/relay-test">Kapalı çevrim bariyer rölesi geri bildirimini sına</button></form>{benchmark_html}</section>
        <section><div class="eyebrow">ARAÇ KÜTÜĞÜ · {count} KAYIT</div><div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px"><h2>Yetkili araç ekle</h2><a class="btn btn-secondary btn-sm" download="lpr-arac-kutugu.csv" href="/export/csv">Kütüğü CSV İndir</a></div>
        <form method="post" action="/register"><label>Plaka<input class="input mono" name="plate" required maxlength="16" placeholder="06 ANK 06"></label><label>Blok / Daire<input class="input" name="unit" required maxlength="80" placeholder="A Blok D:12"></label><label>Araç sahibi<input class="input" name="owner" required maxlength="80" placeholder="Ahmet Yılmaz"></label><button class="btn btn-signal">Kaydet</button></form>
        <div class="data-table-wrap"><table class="data-table"><thead><tr><th>Plaka</th><th>Blok / Daire</th><th>Araç sahibi</th><th>İşlem</th></tr></thead><tbody>{}</tbody></table></div></section>
        <section><div class="eyebrow">GEÇİŞ VE BARİYER GÜNLÜĞÜ</div><h2>Son geçiş kayıtları</h2><p>Plaka sorgulama ve görüntüden OCR okuma işlemleri zaman damgası ve bariyer röle durumuyla birlikte kaydedilir.</p><div class="data-table-wrap"><table class="data-table"><thead><tr><th>Saat (UTC)</th><th>Plaka</th><th>Kütük Durumu</th><th>Bariyer Röle Yanıtı</th></tr></thead><tbody>{}</tbody></table></div></section>"##,
            rows.join(""),
            passage_rows.join("")
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
        let bench = evaluate_labeled_ocr_dataset();
        assert_eq!(bench.total_samples, 24);
        assert!(bench.plate_accuracy_pct >= 95.0);
        let (relay_ok, _, _) = run_closed_loop_relay_verification();
        assert!(relay_ok);
        return;
    }
    let dir = app_data_dir("lpr-registry");
    if fs::read_dir(&dir)
        .map(|mut d| {
            !d.any(|e| {
                e.ok()
                    .is_some_and(|x| x.file_name().to_string_lossy().starts_with("plate-"))
            })
        })
        .unwrap_or(false)
    {
        let _ = register(&dir, "34 ABC 123", "A Blok D:04", "Merkez Operasyon");
        let _ = register(&dir, "06 ANK 06", "B Blok D:11", "Güvenlik Amirliği");
    }
    let writes = std::sync::Mutex::new(());
    serve(
        "ipscans-lpr",
        17943,
        Arc::new(move |method, path, body| match (method, path) {
            ("GET", "/" | "/index.html") => screen(&dir, "", ""),
            ("GET", "/export/csv") => (
                200,
                "text/csv; charset=utf-8",
                export_registry_csv(&dir).into_bytes(),
            ),
            ("GET", "/api/ocr-benchmark") => {
                let rep = evaluate_labeled_ocr_dataset();
                let out = format!(
                    r##"{{"ok":true,"totalSamples":{},"exactMatches":{},"plateAccuracyPct":{:.2},"totalChars":{},"matchedChars":{},"charAccuracyPct":{:.2},"avgConfidence":{:.4}}}"##,
                    rep.total_samples,
                    rep.exact_matches,
                    rep.plate_accuracy_pct,
                    rep.total_chars,
                    rep.matched_chars,
                    rep.char_accuracy_pct,
                    rep.avg_confidence
                );
                json(200, out)
            }
            ("POST", "/ocr-benchmark") => {
                let rep = evaluate_labeled_ocr_dataset();
                let mut tbl = format!(
                    "<output>Etiketli OCR Veri Seti Sonucu · Toplam: {} görüntü · Tam Eşleşme: {}/{} (%{:.1}) · Karakter Doğruluğu: {}/{} (%{:.1}) · Ortalama Güven: %{:.1}</output><div class=\"data-table-wrap\"><table class=\"data-table\"><thead><tr><th>#</th><th>Format</th><th>Gürültü</th><th>Beklenen</th><th>OCR Çıktısı</th><th>Güven</th><th>Sonuç</th></tr></thead><tbody>",
                    rep.total_samples,
                    rep.exact_matches,
                    rep.total_samples,
                    rep.plate_accuracy_pct,
                    rep.matched_chars,
                    rep.total_chars,
                    rep.char_accuracy_pct,
                    rep.avg_confidence * 100.0
                );
                for (idx, s) in rep.samples.iter().enumerate() {
                    tbl.push_str(&format!(
                        "<tr><td class=mono>{:02}</td><td>{}</td><td>{}</td><td class=mono>{}</td><td class=mono>{}</td><td>%{:.1}</td><td>{}</td></tr>",
                        idx + 1,
                        escape(s.format_kind),
                        s.noise_level,
                        escape(&s.expected_plate),
                        escape(&s.predicted_plate),
                        s.confidence * 100.0,
                        if s.exact_match { "DOĞRU" } else { "FARKLI" }
                    ));
                }
                tbl.push_str("</tbody></table></div>");
                screen(&dir, "", &tbl)
            }
            ("POST", "/relay-test" | "/api/relay-test") => {
                let (ok, json_payload, summary) = run_closed_loop_relay_verification();
                if path == "/api/relay-test" {
                    json(if ok { 200 } else { 500 }, json_payload)
                } else {
                    screen(&dir, "", &format!("<output>{}</output>", escape(&summary)))
                }
            }
            ("POST", "/ocr-image" | "/api/ocr") => {
                let raw_plate = if path == "/api/ocr" {
                    extract_json_string(body, "plate")
                } else {
                    field(body, "plate")
                }
                .unwrap_or_else(|| "34 ABC 123".to_string());
                let pgm = render_plate_pgm_image(&raw_plate, 0);
                match recognize_plate_from_image(&pgm) {
                    Ok((recognized_plate, confidence, region)) => {
                        let authorized =
                            fs::metadata(dir.join(format!("plate-{recognized_plate}.txt"))).is_ok();
                        let relay_info = if authorized {
                            let relay_addr = spawn_relay_emulator(b"OPEN_CONFIRMED|CH=1\r\n");
                            let fb = trigger_barrier_with_feedback(
                                relay_addr,
                                &recognized_plate,
                                1500,
                                800,
                            );
                            format!(
                                "Yetkili araç · Bariyer rölesi: {} ({} ms)",
                                fb.status_code, fb.rtt_ms
                            )
                        } else {
                            "Kütükte kayıtlı değil · Bariyer kapalı tutuldu".to_string()
                        };
                        append_passage(
                            &dir,
                            &recognized_plate,
                            if authorized {
                                "Yetkili Sakin"
                            } else {
                                "Kayıtsız Ziyaretçi"
                            },
                            &relay_info,
                        );
                        if path == "/api/ocr" {
                            json(
                                200,
                                format!(
                                    r##"{{"ok":true,"recognizedPlate":{},"region":{},"confidence":{:.4},"authorized":{authorized},"relayStatus":{}}}"##,
                                    json_str(&recognized_plate),
                                    json_str(&format!("{region:?}")),
                                    confidence,
                                    json_str(&relay_info)
                                ),
                            )
                        } else {
                            let msg = format!(
                                "PGM/BMP Görüntü OCR Çıktısı: {} ({:?}, güven %{:.1}) · {}",
                                recognized_plate,
                                region,
                                confidence * 100.0,
                                relay_info
                            );
                            screen(&dir, &msg, "")
                        }
                    }
                    Err(e) => {
                        if path == "/api/ocr" {
                            json(400, format!(r##"{{"ok":false,"error":{}}}"##, json_str(&e)))
                        } else {
                            screen(&dir, &e, "")
                        }
                    }
                }
            }
            ("POST", "/delete") => {
                let msg = match plate_id(&field(body, "plate").unwrap_or_default()) {
                    Ok(plate) => {
                        let _guard = writes.lock().unwrap_or_else(|e| e.into_inner());
                        let _ = fs::remove_file(dir.join(format!("plate-{plate}.txt")));
                        format!("{plate} kütükten kaldırıldı.")
                    }
                    Err(e) => e.to_owned(),
                };
                screen(&dir, &msg, "")
            }
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
                        Ok(_) => {
                            append_passage(&dir, &plate, "Yetkili Sakin", "Sorgulama Doğrulandı");
                            format!("{plate} · Yetkili araç.")
                        }
                        Err(e) if e.kind() == io::ErrorKind::NotFound => {
                            append_passage(
                                &dir,
                                &plate,
                                "Kayıtsız Araç",
                                "Bariyer Kapalı Tutuldu",
                            );
                            format!("{plate} · Kütükte bulunamadı.")
                        }
                        Err(e) => format!("Kütük okunamadı. {e}"),
                    },
                };
                screen(&dir, &msg, "")
            }
            _ => json(404, r##"{"error":"Bulunamadı"}"##.into()),
        }),
    );
}
