#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use ipscans_core::console::{escape, field, json, page, serve, Reply};
use ipscans_core::json::{extract_json_string, json_str};
use ipscans_core::network::{discover_gateway_context, scan_local_subnet, GatewayContext};
use ipscans_core::sentinel::{
    check_ollama_status, execute_autonomous_incident_pipeline, load_quarantine_ledger_raw,
    purge_modem_upnp_port_mappings, quarantine_device_now, quarantine_ip_with_runner,
    restore_device_access, unquarantine_ip_with_runner, valid_target, VirtualFirewallEngine,
};
use ipscans_core::win32::{
    elevate_self, is_running_as_admin, open_admin_cmd_window, open_admin_powershell_window,
    run_hidden_command,
};
use std::{env, sync::Arc};

/// Require a human at the interactive Windows desktop for every privileged or router change.
fn operator_confirms(action: &str) -> bool {
    if env::args().any(|arg| arg == "--headless") {
        return false;
    }
    static PROMPT: std::sync::Mutex<()> = std::sync::Mutex::new(());
    let Ok(_guard) = PROMPT.try_lock() else {
        return false;
    };
    #[link(name = "user32")]
    extern "system" {
        fn MessageBoxW(hwnd: isize, text: *const u16, caption: *const u16, flags: u32) -> i32;
    }
    let message: Vec<u16> =
        format!("İstenen işlem: {action}\n\nBu işlemi şimdi uygulamak istiyor musunuz?")
            .encode_utf16()
            .chain([0])
            .collect();
    let title: Vec<u16> = "IPScans Sentinel · Operatör onayı"
        .encode_utf16()
        .chain([0])
        .collect();
    // YES/NO with NO selected by default, warning icon and foreground activation.
    unsafe {
        MessageBoxW(
            0,
            message.as_ptr(),
            title.as_ptr(),
            0x00010000 | 0x100 | 0x30 | 4,
        ) == 6
    }
}

fn run_isolated_firewall_verification(target_ip: &str) -> (bool, String, Vec<String>) {
    let ip = if target_ip.trim().is_empty() {
        "192.168.0.145"
    } else {
        target_ip.trim()
    };
    let ctx = GatewayContext {
        local_ip: "192.168.0.29".into(),
        subnet_prefix: "192.168.0".into(),
        scan_cidr: "192.168.0.0/24".into(),
        gateway_ip: "192.168.0.1".into(),
        gateway_mac: "54:A7:03:AA:BB:CC".into(),
        interface_index: "12".into(),
        dns_servers: vec!["1.1.1.1".into()],
    };
    let mut logs = Vec::new();
    // 1. Add + Show Rule Verification + Full Rollback
    let mut vm = VirtualFirewallEngine::new();
    let ok_add = match quarantine_ip_with_runner(ip, &ctx, |a| vm.exec_netsh(a)) {
        Ok(add_logs) => {
            logs.extend(add_logs);
            true
        }
        Err(e) => {
            logs.push(e);
            false
        }
    };
    let rules_after_add = vm.active_rules.len();
    logs.push(format!(
        "[VM-DOĞRULAMA] Ekleme sonrası aktif kural sayısı: {rules_after_add} (IN + OUT)"
    ));
    let ok_del = match unquarantine_ip_with_runner(ip, |a| vm.exec_netsh(a)) {
        Ok(del_logs) => {
            logs.extend(del_logs);
            true
        }
        Err(e) => {
            logs.push(e);
            false
        }
    };
    let rules_after_del = vm.active_rules.len();
    logs.push(format!(
        "[VM-DOĞRULAMA] Geri alma sonrası aktif kural sayısı: {rules_after_del}"
    ));

    // 2. Transactional Outbound Failure -> Automatic Inbound Rollback
    let mut vm_fail = VirtualFirewallEngine::new();
    vm_fail.fail_outbound_once = true;
    let ok_tx_fail = match quarantine_ip_with_runner(ip, &ctx, |a| vm_fail.exec_netsh(a)) {
        Ok(tx_logs) => {
            logs.extend(tx_logs);
            true
        }
        Err(e) => {
            logs.push(e);
            false
        }
    };
    let rules_after_tx_rollback = vm_fail.active_rules.len();
    logs.push(format!(
        "[VM-DOĞRULAMA] OUT kuralı başarısız olduğunda otomatik IN geri alma sonrası kalan kural: {rules_after_tx_rollback}"
    ));

    let passed = ok_add
        && rules_after_add == 2
        && ok_del
        && rules_after_del == 0
        && !ok_tx_fail
        && rules_after_tx_rollback == 0;
    let json_data = format!(
        r#"{{"ok":{passed},"targetIp":{},"rulesAfterAdd":{rules_after_add},"rulesAfterRollback":{rules_after_del},"rulesAfterOutboundFailureRollback":{rules_after_tx_rollback},"arbitraryHttpShellRemoved":true,"logs":[{}]}}"#,
        json_str(ip),
        logs.iter().map(|l| json_str(l)).collect::<Vec<_>>().join(",")
    );
    (passed, json_data, logs)
}

fn screen(result: &str) -> Reply {
    let admin = if is_running_as_admin() {
        "Yönetici"
    } else {
        "Standart kullanıcı"
    };
    let ledger = load_quarantine_ledger_raw();
    let mut rows = String::new();
    for entry in ledger {
        rows.push_str(&format!(
            "<tr><td>{}</td><td>{}</td><td>{}</td></tr>",
            escape(&entry.ip),
            escape(&entry.status),
            escape(&entry.reason)
        ));
    }
    if rows.is_empty() {
        rows.push_str("<tr><td colspan=3>İşlem kaydı yok.</td></tr>");
    }
    page(
        "IPScans Sentinel",
        "sentinel",
        "Olay inceleme ve hedefe özel yerel savunma",
        &format!(
            r#"
        <section><div class="eyebrow">01 / OPERATÖR · {admin}</div><h2>İstasyon durumu</h2><form method="post" action="/status"><button class="btn btn-signal">Durumu oku</button><button class="btn btn-secondary" formaction="/scan">Ağ envanterini tara</button><button class="btn btn-secondary" formaction="/vm-firewall-test">İzole güvenlik duvarı ekleme ve geri almayı sına</button><button class="btn btn-secondary" formaction="/elevate">Yönetici olarak aç</button></form>{result}</section>
        <section><div class="eyebrow">02 / OLAY İNCELEME</div><h2>Hedefi incele</h2><p>Seçilen IP için port ve kamera protokollerini yoklar. Yerel Ollama modeli erişilebilirse olay açıklamasını değerlendirir.</p><form method="post" action="/incident"><label>Hedef IPv4<input class="input mono" name="targetIp" value="192.168.0.29" required></label><label>Olay açıklaması<input class="input" name="prompt" maxlength="512" value="Yetkisiz RTSP/TCP bağlantı denemesi ve güvenlik duvarı izolasyon testi" required></label><button class="btn btn-signal">İncele</button></form></section>
        <section><div class="eyebrow">03 / MÜDAHALE</div><h2>Hedefe özel erişim kuralları</h2><p>Yerel engel yalnızca bu bilgisayar ile hedef arasındaki trafiği etkiler (IN ve OUT kuralları netsh advfirewall üzerinden doğrulanır; OUT başarısız olursa IN otomatik geri alınır). Serbest HTTP komut çalıştırma yolu kalıcı olarak kaldırılmıştır.</p>
        <form method="post" action="/quarantine"><label>Hedef IPv4<input class="input mono" name="ip" value="192.168.0.145" required></label><button class="btn btn-danger">Yerel trafiği engelle</button><button class="btn btn-secondary" formaction="/restore">Yerel engeli kaldır</button><button class="btn btn-secondary" formaction="/vm-firewall-test">İzole VM kural ekleme/geri alma testi</button><button class="btn btn-secondary" formaction="/modem-harden">Hedefin UPnP yönlendirmelerini kaldır</button></form>
        <div class="data-table-wrap"><table class="data-table"><thead><tr><th>Hedef</th><th>Durum</th><th>İşlem</th></tr></thead><tbody>{rows}</tbody></table></div></section>
        <section><div class="eyebrow">04 / WINDOWS OPERATÖR ARAÇLARI</div><h2>Windows tanı araçları</h2><form method="post" action="/diagnostics"><label>Rapor<select class="select" name="report"><option value="identity">Windows işlem kimliği</option><option value="interfaces">Ağ bağdaştırıcıları</option><option value="routes">IPv4 yönlendirme tablosu</option></select></label><button class="btn btn-signal">Raporu al</button></form>
        <details><summary>Etkileşimli yönetici terminali</summary><p>Terminal ayrı bir Windows penceresinde açılır ve işlemi bu bilgisayarın kullanıcısı onaylar.</p><form method="post" action="/open-admin"><label>Kabuk<select class="select" name="shell"><option>cmd</option><option>powershell</option></select></label><button class="btn btn-secondary">Terminal aç</button></form></details></section>"#
        ),
    )
}

fn handler(method: &str, path: &str, body: &str) -> Reply {
    if method == "GET" && matches!(path, "/" | "/index.html") {
        return screen("");
    }
    let api = path.starts_with("/api/");
    let action = path
        .trim_start_matches("/api/sentinel/")
        .trim_start_matches("/api/")
        .trim_start_matches('/');
    // Never re-introduce arbitrary HTTP command execution
    if action == "shell" || action == "exec" || action == "cmd" {
        return json(
            404,
            r#"{"error":"Serbest HTTP komut çalıştırma yolu güvenlik nedeniyle kaldırılmıştır."}"#
                .into(),
        );
    }
    if method != "POST" && !(method == "GET" && api && matches!(action, "status" | "scan")) {
        return json(404, r#"{"error":"Bulunamadı"}"#.into());
    }
    let input = |name| {
        if api {
            extract_json_string(body, name)
        } else {
            field(body, name)
        }
    };
    let reply = |ok, data: String, message: String| {
        if api {
            json(if ok { 200 } else { 400 }, data)
        } else {
            screen(&format!(
                "<output><pre style=\"white-space:pre-wrap\">{}</pre></output>",
                escape(&message)
            ))
        }
    };
    let feedback = |ok, msg: String| {
        reply(
            ok,
            format!(
                r#"{{"ok":{ok},"message":{},"logs":[{}]}}"#,
                json_str(&msg),
                json_str(&msg)
            ),
            msg,
        )
    };
    match action {
        "status" => {
            let ctx = discover_gateway_context();
            let (online, models, has_agent) = check_ollama_status();
            let models_json = models
                .iter()
                .map(|m| json_str(m))
                .collect::<Vec<_>>()
                .join(",");
            let ledger = load_quarantine_ledger_raw()
                .iter()
                .map(|e| e.to_json())
                .collect::<Vec<_>>()
                .join(",");
            reply(
                true,
                format!(
                    r#"{{"ok":true,"isAdmin":{},"ollamaOnline":{online},"hasCyberAgent":{has_agent},"ollamaModels":[{models_json}],"gateway":{{"ip":{},"localIp":{},"mac":{},"subnet":{}}},"ledger":[{ledger}]}}"#,
                    is_running_as_admin(),
                    json_str(&ctx.gateway_ip),
                    json_str(&ctx.local_ip),
                    json_str(&ctx.gateway_mac),
                    json_str(&ctx.scan_cidr)
                ),
                format!(
                    "Yerel IP · {}\nAğ geçidi · {}\nOllama · {}\nModeller · {}",
                    ctx.local_ip,
                    ctx.gateway_ip,
                    if online {
                        "Çevrimiçi"
                    } else {
                        "Erişilemiyor"
                    },
                    models.join(", ")
                ),
            )
        }
        "scan" => {
            let (ctx, hosts) = scan_local_subnet(None);
            let items = hosts
                .iter()
                .map(|h| h.to_json())
                .collect::<Vec<_>>()
                .join(",");
            let lines = hosts
                .iter()
                .map(|h| {
                    format!(
                        "{} · {} · {} · {:?}",
                        h.ip, h.hostname, h.vendor, h.open_ports
                    )
                })
                .collect::<Vec<_>>()
                .join("\n");
            reply(
                true,
                format!(
                    r#"{{"ok":true,"gateway":{{"ip":{},"subnet":{}}},"hosts":[{items}]}}"#,
                    json_str(&ctx.gateway_ip),
                    json_str(&ctx.scan_cidr)
                ),
                format!("{} cihaz bulundu.\n{lines}", hosts.len()),
            )
        }
        "vm-firewall-test" => {
            let ip = input("ip").unwrap_or_else(|| "192.168.0.145".to_string());
            let (passed, json_data, logs) = run_isolated_firewall_verification(&ip);
            reply(passed, json_data, logs.join("\n"))
        }
        "incident" => {
            let result = execute_autonomous_incident_pipeline(
                &input("prompt").unwrap_or_default(),
                input("targetIp").as_deref(),
                false,
            );
            let ok = !result.starts_with(r#"{"ok":false"#);
            reply(ok, result.clone(), result)
        }
        "quarantine" | "restore" | "modem-harden" => {
            let ctx = discover_gateway_context();
            let ip = input("ip")
                .or_else(|| input("cameraIp"))
                .unwrap_or_default();
            if !valid_target(&ip, &ctx) {
                return feedback(false, "Geçerli bir hedef IPv4 adresi gerekli.".into());
            }
            let description = match action {
                "quarantine" => "Bu bilgisayarda hedef ile trafiği engelle",
                "restore" => "Bu bilgisayarda hedef için engel kurallarını kaldır",
                _ => "Modemde hedefe ait kamera yönlendirmelerini sil",
            };
            if !operator_confirms(&format!("{description} · {ip}")) {
                return feedback(false, "Yerel operatör onayı alınamadı.".into());
            }
            let (ok, logs) = match action {
                "quarantine" => {
                    let (entry, logs) = quarantine_device_now(
                        &ip,
                        &input("mac").unwrap_or_default(),
                        &ctx.gateway_ip,
                        "Operatörün yerel trafik engelleme isteği",
                    );
                    (entry.status == "QUARANTINED", logs)
                }
                "restore" => restore_device_access(&ip),
                _ => purge_modem_upnp_port_mappings(&ctx.gateway_ip, &ip),
            };
            feedback(ok, logs.join("\n"))
        }
        "diagnostics" => {
            let report = input("report").unwrap_or_default();
            let (program, args): (&str, &[&str]) = match report.as_str() {
                "identity" => ("whoami.exe", &[]),
                "interfaces" => ("ipconfig.exe", &["/all"]),
                "routes" => ("route.exe", &["print", "-4"]),
                _ => return feedback(false, "Geçersiz rapor türü.".into()),
            };
            let (code, out, err) = run_hidden_command(program, args);
            let ok = code == 0;
            reply(
                ok,
                format!(
                    r#"{{"ok":{ok},"exitCode":{code},"stdout":{},"stderr":{}}}"#,
                    json_str(&out),
                    json_str(&err)
                ),
                format!("{out}\n{err}"),
            )
        }
        "open-admin" | "elevate" => {
            let prompt = if action == "elevate" {
                "Sentinel uygulamasını yönetici olarak başlat"
            } else {
                "Etkileşimli Windows yönetici terminali aç"
            };
            if !operator_confirms(prompt) {
                return feedback(false, "Yerel operatör onayı alınamadı.".into());
            }
            let result = if action == "elevate" {
                elevate_self()
            } else if input("shell").as_deref() == Some("cmd") {
                open_admin_cmd_window(None)
            } else {
                open_admin_powershell_window(None)
            };
            match result {
                Ok(true) => feedback(true, "Windows başlatma isteğini kabul etti.".into()),
                Ok(false) => feedback(false, "Başlatılamadı.".into()),
                Err(e) => feedback(false, e),
            }
        }
        _ => json(404, r#"{"error":"Bulunamadı"}"#.into()),
    }
}

fn main() {
    ipscans_core::win32::handle_desktop_install("IPScans-Sentinel.exe");
    let args: Vec<_> = env::args().collect();
    if args.iter().any(|a| a == "--version" || a == "-V") {
        println!("IPScans Sentinel {}", env!("CARGO_PKG_VERSION"));
        return;
    }
    if args.iter().any(|a| a == "--selftest" || a == "--self-test") {
        assert_eq!(handler("GET", "/api/sentinel/shell", "").0, 404);
        assert_eq!(
            handler("POST", "/api/sentinel/shell", r#"{"command":"echo test"}"#).0,
            404
        );
        let (vm_ok, _, _) = run_isolated_firewall_verification("192.168.0.145");
        assert!(vm_ok);
        assert!(
            execute_autonomous_incident_pipeline("fixture", None, false).contains(r#""ok":false"#)
        );
        return;
    }
    if let Some(i) = args.iter().position(|a| a == "--incident") {
        println!(
            "{}",
            execute_autonomous_incident_pipeline(
                args.get(i + 2).map_or("", String::as_str),
                args.get(i + 1).map(String::as_str),
                false
            )
        );
        return;
    }
    serve("sentinel", 17940, Arc::new(handler));
}
