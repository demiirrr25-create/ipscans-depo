//! Zero-panic RFC 8259 JSON serialization and key extraction utilities.

/// Escapes a string for safe inclusion inside JSON quotes.
pub fn escape_json(s: &str) -> String {
    let mut out = String::with_capacity(s.len() + 8);
    for ch in s.chars() {
        match ch {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            c if (c as u32) < 0x20 => {
                out.push_str(&format!("\\u{:04x}", c as u32));
            }
            c => out.push(c),
        }
    }
    out
}

/// Wraps a string in quotes with RFC 8259 escaping.
pub fn json_str(s: &str) -> String {
    format!("\"{}\"", escape_json(s))
}

/// Extracts a string field `"key": "value"` from a JSON payload.
pub fn extract_json_string(body: &str, key: &str) -> Option<String> {
    let pattern = format!("\"{}\"", key);
    let mut search_from = 0;
    while let Some(rel_idx) = body[search_from..].find(&pattern) {
        let idx = search_from + rel_idx + pattern.len();
        let rest = body[idx..].trim_start();
        if let Some(after_colon) = rest.strip_prefix(':') {
            let after_colon = after_colon.trim_start();
            if let Some(after_quote) = after_colon.strip_prefix('"') {
                let mut result = String::new();
                let mut chars = after_quote.chars();
                while let Some(c) = chars.next() {
                    if c == '\\' {
                        if let Some(esc) = chars.next() {
                            match esc {
                                'n' => result.push('\n'),
                                'r' => result.push('\r'),
                                't' => result.push('\t'),
                                '"' => result.push('"'),
                                '\\' => result.push('\\'),
                                '/' => result.push('/'),
                                other => result.push(other),
                            }
                        }
                    } else if c == '"' {
                        return Some(result);
                    } else {
                        result.push(c);
                    }
                }
            }
        }
        search_from = idx;
    }
    None
}

/// Extracts a boolean field `"key": true/false` from a JSON payload.
pub fn extract_json_bool(body: &str, key: &str) -> Option<bool> {
    let pattern = format!("\"{}\"", key);
    let idx = body.find(&pattern)? + pattern.len();
    let rest = body[idx..].trim_start().strip_prefix(':')?.trim_start();
    if rest.starts_with("true") {
        Some(true)
    } else if rest.starts_with("false") {
        Some(false)
    } else {
        None
    }
}

/// Extracts an integer field `"key": 123` from a JSON payload.
pub fn extract_json_u64(body: &str, key: &str) -> Option<u64> {
    let pattern = format!("\"{}\"", key);
    let idx = body.find(&pattern)? + pattern.len();
    let rest = body[idx..].trim_start().strip_prefix(':')?.trim_start();
    let digits: String = rest
        .chars()
        .skip_while(|c| *c == '"')
        .take_while(|c| c.is_ascii_digit())
        .collect();
    digits.parse::<u64>().ok()
}
