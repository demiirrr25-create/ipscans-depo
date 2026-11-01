//! IPScans Network Health Pro v3.0 — Rolling Telemetry Statistics, Jitter/Bufferbloat Grader,
//! and L2 ARP Duplicate-IP / MAC-Spoofing Conflict Engine.

use std::collections::HashMap;

#[derive(Clone, Debug)]
pub struct TelemetrySummary {
    pub sample_count: usize,
    pub min_rtt_ms: u64,
    pub avg_rtt_ms: f64,
    pub max_rtt_ms: u64,
    pub jitter_ms: f64,
    pub stability_grade: &'static str,
}

#[derive(Clone, Debug, PartialEq)]
pub struct ArpConflictAlert {
    pub ip: String,
    pub previous_mac: String,
    pub conflicting_mac: String,
}

/// Computes min, mean, max, mean consecutive delta (RFC 3550 jitter proxy), and stability grade.
pub fn summarize_rtt_samples(samples_ms: &[u64]) -> TelemetrySummary {
    if samples_ms.is_empty() {
        return TelemetrySummary {
            sample_count: 0,
            min_rtt_ms: 0,
            avg_rtt_ms: 0.0,
            max_rtt_ms: 0,
            jitter_ms: 0.0,
            stability_grade: "—",
        };
    }

    let min_rtt_ms = *samples_ms.iter().min().unwrap_or(&0);
    let max_rtt_ms = *samples_ms.iter().max().unwrap_or(&0);
    let sum: u64 = samples_ms.iter().sum();
    let avg_rtt_ms = (sum as f64) / (samples_ms.len() as f64);

    let jitter_ms = if samples_ms.len() > 1 {
        let mut delta_sum = 0.0;
        for w in samples_ms.windows(2) {
            delta_sum += (w[1] as f64 - w[0] as f64).abs();
        }
        delta_sum / ((samples_ms.len() - 1) as f64)
    } else {
        0.0
    };

    let stability_grade = if avg_rtt_ms <= 15.0 && jitter_ms <= 3.0 {
        "A+"
    } else if avg_rtt_ms <= 35.0 && jitter_ms <= 8.0 {
        "A"
    } else if avg_rtt_ms <= 75.0 && jitter_ms <= 18.0 {
        "B"
    } else {
        "C"
    };

    TelemetrySummary {
        sample_count: samples_ms.len(),
        min_rtt_ms,
        avg_rtt_ms,
        max_rtt_ms,
        jitter_ms,
        stability_grade,
    }
}

/// Detects L2 ARP table conflicts where an IPv4 address changes MAC binding across observations.
pub fn detect_arp_mac_conflicts(
    baseline: &HashMap<String, String>,
    current: &[(String, String)],
) -> Vec<ArpConflictAlert> {
    let mut alerts = Vec::new();
    for (ip, mac) in current {
        if let Some(prev_mac) = baseline.get(ip) {
            if !prev_mac.eq_ignore_ascii_case(mac) && prev_mac != "LOCAL-NIC" && mac != "LOCAL-NIC"
            {
                alerts.push(ArpConflictAlert {
                    ip: ip.clone(),
                    previous_mac: prev_mac.clone(),
                    conflicting_mac: mac.clone(),
                });
            }
        }
    }
    alerts
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AdapterTransition {
    pub timestamp_unix: u64,
    pub from_adapter_ip: String,
    pub to_adapter_ip: String,
    pub from_gateway_ip: String,
    pub to_gateway_ip: String,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct OutageRecord {
    pub start_unix: u64,
    pub end_unix: Option<u64>,
    pub failed_samples: usize,
    pub duration_secs: u64,
    pub scope: &'static str, // "LAN_AND_WAN" or "WAN_ONLY"
}

#[derive(Clone, Debug)]
pub struct HealthSampleRecord {
    pub timestamp_unix: u64,
    pub adapter_ip: String,
    pub gateway_ip: String,
    pub gateway_rtt_ms: Option<u32>,
    pub wan_rtt_ms: Option<u32>,
    pub arp_conflicts: Vec<ArpConflictAlert>,
    pub adapter_changed: bool,
}

#[derive(Clone, Debug)]
pub struct LongRunReport {
    pub total_samples: usize,
    pub gateway_loss_pct: f64,
    pub wan_loss_pct: f64,
    pub gateway_p95_ms: u64,
    pub wan_p95_ms: u64,
    pub outage_count: usize,
    pub adapter_switch_count: usize,
    pub arp_conflict_count: usize,
}

/// Stateful network health session tracker handling connection loss/recovery,
/// adapter switches (resetting L2 ARP baseline without false spoofing alerts),
/// and long-duration JSONL measurement logs.
#[derive(Clone, Debug, Default)]
pub struct HealthSessionTracker {
    pub samples: Vec<HealthSampleRecord>,
    pub transitions: Vec<AdapterTransition>,
    pub outages: Vec<OutageRecord>,
    active_adapter_ip: String,
    active_gateway_ip: String,
    arp_baseline: HashMap<String, String>,
    open_outage_idx: Option<usize>,
}

impl HealthSessionTracker {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn ingest_observation(
        &mut self,
        timestamp_unix: u64,
        adapter_ip: &str,
        gateway_ip: &str,
        gateway_rtt_ms: Option<u32>,
        wan_rtt_ms: Option<u32>,
        arp_table: &HashMap<String, String>,
    ) -> HealthSampleRecord {
        let mut adapter_changed = false;
        let mut arp_conflicts = Vec::new();

        if !self.active_adapter_ip.is_empty() && self.active_adapter_ip != adapter_ip {
            adapter_changed = true;
            self.transitions.push(AdapterTransition {
                timestamp_unix,
                from_adapter_ip: self.active_adapter_ip.clone(),
                to_adapter_ip: adapter_ip.to_string(),
                from_gateway_ip: self.active_gateway_ip.clone(),
                to_gateway_ip: gateway_ip.to_string(),
            });
            // Reset L2 ARP baseline on adapter transition so legitimate gateway MAC on new interface
            // does not trigger a false ARP spoofing alert.
            self.arp_baseline = arp_table.clone();
        } else {
            let current_entries: Vec<(String, String)> = arp_table
                .iter()
                .map(|(k, v)| (k.clone(), v.clone()))
                .collect();
            if !self.arp_baseline.is_empty() {
                arp_conflicts = detect_arp_mac_conflicts(&self.arp_baseline, &current_entries);
            }
            for (k, v) in arp_table {
                self.arp_baseline.insert(k.clone(), v.clone());
            }
        }

        self.active_adapter_ip = adapter_ip.to_string();
        self.active_gateway_ip = gateway_ip.to_string();

        let is_down = gateway_rtt_ms.is_none() && wan_rtt_ms.is_none();
        let is_wan_down = gateway_rtt_ms.is_some() && wan_rtt_ms.is_none();

        if is_down || is_wan_down {
            let scope = if is_down { "LAN_AND_WAN" } else { "WAN_ONLY" };
            if let Some(idx) = self.open_outage_idx {
                let out = &mut self.outages[idx];
                out.failed_samples += 1;
                out.duration_secs = timestamp_unix.saturating_sub(out.start_unix);
            } else {
                self.outages.push(OutageRecord {
                    start_unix: timestamp_unix,
                    end_unix: None,
                    failed_samples: 1,
                    duration_secs: 0,
                    scope,
                });
                self.open_outage_idx = Some(self.outages.len() - 1);
            }
        } else if let Some(idx) = self.open_outage_idx.take() {
            let out = &mut self.outages[idx];
            out.end_unix = Some(timestamp_unix);
            out.duration_secs = timestamp_unix.saturating_sub(out.start_unix);
        }

        let rec = HealthSampleRecord {
            timestamp_unix,
            adapter_ip: adapter_ip.to_string(),
            gateway_ip: gateway_ip.to_string(),
            gateway_rtt_ms,
            wan_rtt_ms,
            arp_conflicts,
            adapter_changed,
        };
        self.samples.push(rec.clone());
        rec
    }

    pub fn export_jsonl(&self) -> String {
        let mut out = String::new();
        for s in &self.samples {
            let gw = s
                .gateway_rtt_ms
                .map(|v| v.to_string())
                .unwrap_or_else(|| "null".into());
            let wan = s
                .wan_rtt_ms
                .map(|v| v.to_string())
                .unwrap_or_else(|| "null".into());
            out.push_str(&format!(
                "{{\"ts\":{},\"adapter\":\"{}\",\"gateway\":\"{}\",\"gwRttMs\":{},\"wanRttMs\":{},\"adapterChanged\":{},\"arpConflicts\":{}}}\n",
                s.timestamp_unix,
                s.adapter_ip,
                s.gateway_ip,
                gw,
                wan,
                s.adapter_changed,
                s.arp_conflicts.len()
            ));
        }
        out
    }

    pub fn report(&self) -> LongRunReport {
        let total = self.samples.len();
        if total == 0 {
            return LongRunReport {
                total_samples: 0,
                gateway_loss_pct: 0.0,
                wan_loss_pct: 0.0,
                gateway_p95_ms: 0,
                wan_p95_ms: 0,
                outage_count: 0,
                adapter_switch_count: 0,
                arp_conflict_count: 0,
            };
        }
        let mut gw_ok: Vec<u64> = self
            .samples
            .iter()
            .filter_map(|s| s.gateway_rtt_ms.map(u64::from))
            .collect();
        let mut wan_ok: Vec<u64> = self
            .samples
            .iter()
            .filter_map(|s| s.wan_rtt_ms.map(u64::from))
            .collect();
        gw_ok.sort_unstable();
        wan_ok.sort_unstable();

        let p95 = |v: &[u64]| -> u64 {
            if v.is_empty() {
                0
            } else {
                let idx = ((v.len() as f64 * 0.95).ceil() as usize)
                    .saturating_sub(1)
                    .min(v.len() - 1);
                v[idx]
            }
        };

        let gw_loss = (total - gw_ok.len()) as f64 * 100.0 / (total as f64);
        let wan_loss = (total - wan_ok.len()) as f64 * 100.0 / (total as f64);
        let conflicts: usize = self.samples.iter().map(|s| s.arp_conflicts.len()).sum();

        LongRunReport {
            total_samples: total,
            gateway_loss_pct: gw_loss,
            wan_loss_pct: wan_loss,
            gateway_p95_ms: p95(&gw_ok),
            wan_p95_ms: p95(&wan_ok),
            outage_count: self.outages.len(),
            adapter_switch_count: self.transitions.len(),
            arp_conflict_count: conflicts,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rtt_summary_and_arp_conflict_detection() {
        let summary = summarize_rtt_samples(&[2, 3, 2, 4, 2]);
        assert_eq!(summary.min_rtt_ms, 2);
        assert_eq!(summary.max_rtt_ms, 4);
        assert_eq!(summary.stability_grade, "A+");

        let mut base = HashMap::new();
        base.insert("192.168.1.1".to_string(), "AA:BB:CC:11:22:33".to_string());
        let current = vec![("192.168.1.1".to_string(), "DE:AD:BE:EF:00:01".to_string())];
        let conflicts = detect_arp_mac_conflicts(&base, &current);
        assert_eq!(conflicts.len(), 1);
    }

    #[test]
    fn test_connection_loss_adapter_switch_and_long_run_telemetry() {
        let mut tracker = HealthSessionTracker::new();
        let mut arp_eth = HashMap::new();
        arp_eth.insert("192.168.0.1".to_string(), "AA:BB:CC:00:00:01".to_string());

        // 1. Normal samples on Ethernet
        for i in 0..10 {
            tracker.ingest_observation(
                1000 + i * 5,
                "192.168.0.17",
                "192.168.0.1",
                Some(2),
                Some(12),
                &arp_eth,
            );
        }
        // 2. Connection outage (3 failed samples = 10s duration)
        for i in 10..13 {
            tracker.ingest_observation(
                1000 + i * 5,
                "192.168.0.17",
                "192.168.0.1",
                None,
                None,
                &arp_eth,
            );
        }
        // 3. Recovery + Adapter switch to Wi-Fi with different gateway MAC -> must NOT trigger false ARP spoofing
        let mut arp_wifi = HashMap::new();
        arp_wifi.insert("10.0.0.1".to_string(), "FF:EE:DD:00:00:02".to_string());
        let switch_rec = tracker.ingest_observation(
            1065,
            "10.0.0.45",
            "10.0.0.1",
            Some(5),
            Some(18),
            &arp_wifi,
        );
        assert!(switch_rec.adapter_changed);
        assert!(switch_rec.arp_conflicts.is_empty());

        let rep = tracker.report();
        assert_eq!(rep.total_samples, 14);
        assert_eq!(rep.outage_count, 1);
        assert_eq!(tracker.outages[0].end_unix, Some(1065));
        assert_eq!(rep.adapter_switch_count, 1);
        assert_eq!(rep.arp_conflict_count, 0);
        assert_eq!( tracker.export_jsonl().lines().count(), 14 );
    }
}
