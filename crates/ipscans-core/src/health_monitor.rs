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
            stability_grade: "A+",
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
            if !prev_mac.eq_ignore_ascii_case(mac) && prev_mac != "LOCAL-NIC" && mac != "LOCAL-NIC" {
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
}
