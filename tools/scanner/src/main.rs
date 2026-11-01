//! `ipscans-network-scanner.exe` — High-speed native Rust CLI & JSON diagnostics engine
//! powering both command-line network audits and `ipscans.com` Next.js API routes.

use std::env;
use ipscans_core::json::json_str;
use ipscans_core::network::{
    check_ports_detailed, query_dns_records, query_whois_raw, scan_local_subnet, DISCOVERY_PORTS,
};
use ipscans_core::sentinel::execute_autonomous_incident_pipeline;

fn main() {
    let args: Vec<String> = env::args().collect();

    if args.iter().any(|a| a == "--version" || a == "-V" || a == "--selftest") {
        println!("ipscans-network-scanner 3.0.0 (Rust Native Engine)");
        return;
    }

    if let Some(pos) = args.iter().position(|a| a == "--ports") {
        let target = args.get(pos + 1).map(|s| s.as_str()).unwrap_or("127.0.0.1");
        let ports_csv = args.get(pos + 2).map(|s| s.as_str()).unwrap_or("");
        let ports: Vec<u16> = if ports_csv.is_empty() {
            DISCOVERY_PORTS.to_vec()
        } else {
            ports_csv
                .split(',')
                .filter_map(|p| p.trim().parse::<u16>().ok())
                .collect()
        };
        println!("{}", check_ports_detailed(target, &ports, 850));
        return;
    }

    if let Some(pos) = args.iter().position(|a| a == "--dns") {
        let domain = args.get(pos + 1).map(|s| s.as_str()).unwrap_or("ipscans.com");
        println!("{}", query_dns_records(domain));
        return;
    }

    if let Some(pos) = args.iter().position(|a| a == "--whois") {
        let domain = args.get(pos + 1).map(|s| s.as_str()).unwrap_or("ipscans.com");
        println!("{}", query_whois_raw(domain));
        return;
    }

    if let Some(pos) = args.iter().position(|a| a == "--incident") {
        let prompt = args
            .get(pos + 1)
            .map(|s| s.as_str())
            .unwrap_or("Dahua kamerama sızdılar");
        println!("{}", execute_autonomous_incident_pipeline(prompt, None, true));
        return;
    }

    // Default: perform parallel subnet scan and output structured JSON
    let (ctx, hosts) = scan_local_subnet(None);
    let hosts_json: Vec<String> = hosts.iter().map(|h| h.to_json()).collect();
    println!(
        "{{\"engine\":\"ipscans-rust-cli/3.0\",\"gateway\":{{\"ip\":{},\"mac\":{},\"localIp\":{},\"subnet\":{}}},\"hostCount\":{},\"hosts\":[{}]}}",
        json_str(&ctx.gateway_ip),
        json_str(&ctx.gateway_mac),
        json_str(&ctx.local_ip),
        json_str(&format!("{}.0/24", ctx.subnet_prefix)),
        hosts.len(),
        hosts_json.join(",")
    );
}

