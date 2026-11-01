//! `ipscans-core` — Shared Native Rust Engine for `ipscans.com` and all IPScans Windows `.exe` Applications.

pub mod design;
pub mod json;
pub mod network;
pub mod sentinel;
pub mod win32;

#[cfg(test)]
mod tests {
    use super::json::{escape_json, extract_json_bool, extract_json_string};
    use super::network::{discover_gateway_context, lookup_mac_vendor};

    #[test]
    fn test_json_escape_and_extract() {
        let payload = r#"{"prompt":"Dahua kamerama sızdılar","autoRestore":true}"#;
        assert_eq!(
            extract_json_string(payload, "prompt").as_deref(),
            Some("Dahua kamerama sızdılar")
        );
        assert_eq!(extract_json_bool(payload, "autoRestore"), Some(true));
        assert_eq!(escape_json("a\"b\\c"), "a\\\"b\\\\c");
    }

    #[test]
    fn test_mac_oui_vendor_lookup() {
        assert_eq!(
            lookup_mac_vendor("3C:EF:8C:11:22:33"),
            "Dahua Technology (IP Camera / NVR)"
        );
        assert_eq!(
            lookup_mac_vendor("28:57:BE:AA:BB:CC"),
            "Hikvision Digital Technology"
        );
    }

    #[test]
    fn test_gateway_discovery() {
        let ctx = discover_gateway_context();
        assert!(ctx.gateway_ip.contains('.'));
        assert!(ctx.local_ip.contains('.'));
    }
}
