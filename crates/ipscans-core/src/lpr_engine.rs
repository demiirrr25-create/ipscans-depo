//! IPScans LPR Pro v2.0 — Native Rust License Plate Parser, Turkish 81-Province Validator,
//! Recognition/Trigger Line Crossing Geometry, and Barrier Relay Controller.

#[derive(Clone, Debug, PartialEq)]
pub enum PlateRegion {
    Turkiye { province_code: u8, letters: String, digits: String },
    International { normalized: String },
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum BarrierRelayState {
    Armed,
    PulseOpen { duration_ms: u32 },
    ManualHoldOpen,
}

/// Normalizes a raw OCR plate string and validates whether it matches Turkish (01..=81) or international syntax.
pub fn parse_and_validate_plate(raw: &str) -> Option<(String, PlateRegion)> {
    let cleaned: String = raw
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .map(|c| c.to_ascii_uppercase())
        .collect();

    if cleaned.len() < 5 || cleaned.len() > 10 {
        return None;
    }

    // Attempt Turkish plate pattern: 2 digits (01..=81) + 1..3 letters + 2..5 digits
    if cleaned.len() >= 6 {
        if let Ok(prov) = cleaned[0..2].parse::<u8>() {
            if (1..=81).contains(&prov) {
                let rest = &cleaned[2..];
                let letter_count = rest.chars().take_while(|c| c.is_ascii_alphabetic()).count();
                let digit_part = &rest[letter_count..];
                if (1..=3).contains(&letter_count)
                    && (2..=5).contains(&digit_part.len())
                    && digit_part.chars().all(|c| c.is_ascii_digit())
                {
                    let letters = rest[..letter_count].to_string();
                    let digits = digit_part.to_string();
                    let formatted = format!("{:02} {} {}", prov, letters, digits);
                    return Some((
                        formatted,
                        PlateRegion::Turkiye {
                            province_code: prov,
                            letters,
                            digits,
                        },
                    ));
                }
            }
        }
    }

    Some((
        cleaned.clone(),
        PlateRegion::International {
            normalized: cleaned,
        },
    ))
}

/// Evaluates whether a vehicle bounding box trajectory `(prev_y -> curr_y)` crossed the Recognition or Trigger line.
pub fn evaluate_line_crossing(prev_y: f64, curr_y: f64, line_y: f64) -> bool {
    (prev_y < line_y && curr_y >= line_y) || (prev_y > line_y && curr_y <= line_y)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_turkish_plate_validation() {
        let (fmt, region) = parse_and_validate_plate("34ips2026").unwrap();
        assert_eq!(fmt, "34 IPS 2026");
        assert_eq!(
            region,
            PlateRegion::Turkiye {
                province_code: 34,
                letters: "IPS".to_string(),
                digits: "2026".to_string()
            }
        );
        assert!(evaluate_line_crossing(120.0, 155.0, 148.0));
    }
}
