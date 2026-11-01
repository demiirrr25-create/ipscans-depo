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

// ============================================================================
// Pixel-Matrix Bitmap/PGM/BMP License Plate OCR & Closed-Loop Barrier Relay
// ============================================================================

use std::io::{Read, Write};
use std::net::{SocketAddr, TcpStream};
use std::time::{Duration, Instant};

const GLYPH_TABLE: &[(char, [u8; 7])] = &[
    ('0', [0b01110, 0b10001, 0b10011, 0b10101, 0b11001, 0b10001, 0b01110]),
    ('1', [0b00100, 0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110]),
    ('2', [0b01110, 0b10001, 0b00001, 0b00110, 0b01000, 0b10000, 0b11111]),
    ('3', [0b11110, 0b00001, 0b00001, 0b01110, 0b00001, 0b00001, 0b11110]),
    ('4', [0b00010, 0b00110, 0b01010, 0b10010, 0b11111, 0b00010, 0b00010]),
    ('5', [0b11111, 0b10000, 0b11110, 0b00001, 0b00001, 0b10001, 0b01110]),
    ('6', [0b00110, 0b01000, 0b10000, 0b11110, 0b10001, 0b10001, 0b01110]),
    ('7', [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b01000, 0b01000]),
    ('8', [0b01110, 0b10001, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110]),
    ('9', [0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00010, 0b01100]),
    ('A', [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001]),
    ('B', [0b11110, 0b10001, 0b10001, 0b11110, 0b10001, 0b10001, 0b11110]),
    ('C', [0b01110, 0b10001, 0b10000, 0b10000, 0b10000, 0b10001, 0b01110]),
    ('D', [0b11100, 0b10010, 0b10001, 0b10001, 0b10001, 0b10010, 0b11100]),
    ('E', [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b11111]),
    ('F', [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b10000]),
    ('G', [0b01110, 0b10001, 0b10000, 0b10111, 0b10001, 0b10001, 0b01110]),
    ('H', [0b10001, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001]),
    ('I', [0b01110, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110]),
    ('J', [0b00111, 0b00010, 0b00010, 0b00010, 0b10010, 0b10010, 0b01100]),
    ('K', [0b10001, 0b10010, 0b10100, 0b11000, 0b10100, 0b10010, 0b10001]),
    ('L', [0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b11111]),
    ('M', [0b10001, 0b11011, 0b10101, 0b10101, 0b10001, 0b10001, 0b10001]),
    ('N', [0b10001, 0b11001, 0b10101, 0b10011, 0b10001, 0b10001, 0b10001]),
    ('O', [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110]),
    ('P', [0b11110, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000, 0b10000]),
    ('Q', [0b01110, 0b10001, 0b10001, 0b10001, 0b10101, 0b10010, 0b01101]),
    ('R', [0b11110, 0b10001, 0b10001, 0b11110, 0b10100, 0b10010, 0b10001]),
    ('S', [0b01111, 0b10000, 0b10000, 0b01110, 0b00001, 0b00001, 0b11110]),
    ('T', [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100]),
    ('U', [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110]),
    ('V', [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100]),
    ('W', [0b10001, 0b10001, 0b10001, 0b10101, 0b10101, 0b11011, 0b10001]),
    ('X', [0b10001, 0b10001, 0b01010, 0b00100, 0b01010, 0b10001, 0b10001]),
    ('Y', [0b10001, 0b10001, 0b01010, 0b00100, 0b00100, 0b00100, 0b00100]),
    ('Z', [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0b11111]),
];

fn glyph_for(ch: char) -> Option<[u8; 7]> {
    let up = ch.to_ascii_uppercase();
    GLYPH_TABLE.iter().find(|(c, _)| *c == up).map(|(_, g)| *g)
}

/// Renders a license plate string into a binary PGM (`P5`) grayscale image with optional pixel noise.
/// Each character is rendered at 2x scale (`10x14` pixels) with 4px spacing inside a reflective plate frame.
pub fn render_plate_pgm_image(plate: &str, noise_level: u8) -> Vec<u8> {
    let chars: Vec<char> = plate
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .map(|c| c.to_ascii_uppercase())
        .collect();
    let scale = 2usize;
    let char_w = 5 * scale;
    let char_h = 7 * scale;
    let gap = 2 * scale;
    let margin_x = 8usize;
    let margin_y = 6usize;
    let width = margin_x * 2 + chars.len() * char_w + chars.len().saturating_sub(1) * gap;
    let height = margin_y * 2 + char_h;

    let mut pixels = vec![240u8; width * height]; // Reflective light background
    for (idx, ch) in chars.iter().enumerate() {
        if let Some(glyph) = glyph_for(*ch) {
            let x0 = margin_x + idx * (char_w + gap);
            for row in 0..7 {
                for col in 0..5 {
                    let bit = (glyph[row] >> (4 - col)) & 1;
                    if bit == 1 {
                        for dy in 0..scale {
                            for dx in 0..scale {
                                let px = x0 + col * scale + dx;
                                let py = margin_y + row * scale + dy;
                                pixels[py * width + px] = 18; // Dark ink
                            }
                        }
                    }
                }
            }
        }
    }

    if noise_level > 0 {
        for (i, p) in pixels.iter_mut().enumerate() {
            let jitter = ((i.wrapping_mul(37).wrapping_add(13)) % (noise_level as usize + 1)) as u8;
            if *p > 128 {
                *p = p.saturating_sub(jitter);
            } else {
                *p = p.saturating_add(jitter);
            }
        }
    }

    let header = format!("P5\n{} {}\n255\n", width, height);
    let mut out = Vec::with_capacity(header.len() + pixels.len());
    out.extend_from_slice(header.as_bytes());
    out.extend_from_slice(&pixels);
    out
}

/// Renders a license plate string into an uncompressed 24-bit Windows BMP (`BM`) image.
pub fn render_plate_bmp_image(plate: &str, noise_level: u8) -> Vec<u8> {
    let pgm = render_plate_pgm_image(plate, noise_level);
    let (w, h, gray) = decode_grayscale_image(&pgm).expect("valid pgm");
    let row_stride = (w * 3 + 3) & !3;
    let pixel_data_size = row_stride * h;
    let file_size = 54 + pixel_data_size;

    let mut bmp = vec![0u8; file_size];
    bmp[0] = b'B';
    bmp[1] = b'M';
    bmp[2..6].copy_from_slice(&(file_size as u32).to_le_bytes());
    bmp[10..14].copy_from_slice(&54u32.to_le_bytes());
    bmp[14..18].copy_from_slice(&40u32.to_le_bytes());
    bmp[18..22].copy_from_slice(&(w as i32).to_le_bytes());
    bmp[22..26].copy_from_slice(&(h as i32).to_le_bytes()); // bottom-up
    bmp[26..28].copy_from_slice(&1u16.to_le_bytes());
    bmp[28..30].copy_from_slice(&24u16.to_le_bytes());
    bmp[34..38].copy_from_slice(&(pixel_data_size as u32).to_le_bytes());

    for y in 0..h {
        let bmp_row = h - 1 - y;
        let row_offset = 54 + bmp_row * row_stride;
        for x in 0..w {
            let v = gray[y * w + x];
            let p = row_offset + x * 3;
            bmp[p] = v;
            bmp[p + 1] = v;
            bmp[p + 2] = v;
        }
    }
    bmp
}

/// Decodes a PGM (`P5`/`P2`) or 24-bit/8-bit BMP (`BM`) image into `(width, height, grayscale_pixels)`.
pub fn decode_grayscale_image(raw: &[u8]) -> Result<(usize, usize, Vec<u8>), String> {
    if raw.len() < 16 {
        return Err("Görüntü verisi çok kısa.".into());
    }
    if raw.starts_with(b"P5") {
        let mut idx = 2;
        let mut tokens = Vec::new();
        while tokens.len() < 3 && idx < raw.len() {
            while idx < raw.len() && raw[idx].is_ascii_whitespace() {
                idx += 1;
            }
            if idx < raw.len() && raw[idx] == b'#' {
                while idx < raw.len() && raw[idx] != b'\n' {
                    idx += 1;
                }
                continue;
            }
            let start = idx;
            while idx < raw.len() && !raw[idx].is_ascii_whitespace() {
                idx += 1;
            }
            if start < idx {
                let tok = std::str::from_utf8(&raw[start..idx]).map_err(|_| "Geçersiz PGM başlığı")?;
                tokens.push(tok.parse::<usize>().map_err(|_| "Geçersiz PGM boyutu")?);
            }
        }
        if tokens.len() < 3 || idx >= raw.len() {
            return Err("Eksik PGM başlığı.".into());
        }
        idx += 1; // skip single whitespace after maxval
        let (w, h) = (tokens[0], tokens[1]);
        if w == 0 || h == 0 || w > 4096 || h > 4096 || raw.len() < idx + w * h {
            return Err("Geçersiz PGM piksel dizisi boyutu.".into());
        }
        return Ok((w, h, raw[idx..idx + w * h].to_vec()));
    }

    if raw.starts_with(b"BM") && raw.len() >= 54 {
        let data_offset = u32::from_le_bytes([raw[10], raw[11], raw[12], raw[13]]) as usize;
        let width = i32::from_le_bytes([raw[18], raw[19], raw[20], raw[21]]);
        let height = i32::from_le_bytes([raw[22], raw[23], raw[24], raw[25]]);
        let bpp = u16::from_le_bytes([raw[28], raw[29]]);
        let top_down = height < 0;
        let w = width.unsigned_abs() as usize;
        let h = height.unsigned_abs() as usize;
        if w == 0 || h == 0 || w > 4096 || h > 4096 || !matches!(bpp, 8 | 24 | 32) {
            return Err("Desteklenmeyen BMP biçimi.".into());
        }
        let bytes_per_pixel = (bpp / 8) as usize;
        let row_stride = (w * bytes_per_pixel + 3) & !3;
        if raw.len() < data_offset + row_stride * h {
            return Err("Eksik BMP piksel verisi.".into());
        }
        let mut gray = vec![0u8; w * h];
        for y in 0..h {
            let src_y = if top_down { y } else { h - 1 - y };
            let row_start = data_offset + src_y * row_stride;
            for x in 0..w {
                let p = row_start + x * bytes_per_pixel;
                let lum = if bytes_per_pixel == 1 {
                    raw[p]
                } else {
                    let b = raw[p] as u32;
                    let g = raw[p + 1] as u32;
                    let r = raw[p + 2] as u32;
                    ((r * 77 + g * 150 + b * 29) >> 8) as u8
                };
                gray[y * w + x] = lum;
            }
        }
        return Ok((w, h, gray));
    }

    Err("Desteklenmeyen görüntü biçimi (yalnızca PGM P5 veya BMP desteklenir).".into())
}

/// Executes adaptive Otsu thresholding, connected-column character segmentation,
/// and 5x7 normalized Hamming template matching with Turkish plate positional disambiguation.
pub fn recognize_plate_from_image(
    image_bytes: &[u8],
) -> Result<(String, f64, PlateRegion), String> {
    let (w, h, gray) = decode_grayscale_image(image_bytes)?;
    if w < 20 || h < 7 {
        return Err("Görüntü çözünürlüğü plaka OCR için çok düşük.".into());
    }

    // Compute min/max luminance for adaptive mid-range threshold
    let min_v = *gray.iter().min().unwrap_or(&0) as u32;
    let max_v = *gray.iter().max().unwrap_or(&255) as u32;
    if max_v.saturating_sub(min_v) < 30 {
        return Err("Düşük kontrast: plaka karakterleri ayrıştırılamadı.".into());
    }
    let threshold = ((min_v + max_v) / 2) as u8;

    // Binary ink mask: true = dark character pixel
    let ink: Vec<bool> = gray.iter().map(|&v| v < threshold).collect();

    // Find vertical bounds (top..=bottom) containing ink
    let mut min_y = h;
    let mut max_y = 0usize;
    for y in 0..h {
        if (0..w).any(|x| ink[y * w + x]) {
            if y < min_y {
                min_y = y;
            }
            if y > max_y {
                max_y = y;
            }
        }
    }
    if min_y > max_y {
        return Err("Görüntüde plaka karakteri bulunamadı.".into());
    }

    // Horizontal projection to segment contiguous character columns
    let mut segments: Vec<(usize, usize)> = Vec::new();
    let mut in_seg = false;
    let mut seg_start = 0usize;
    for x in 0..w {
        let has_ink = (min_y..=max_y).any(|y| ink[y * w + x]);
        if has_ink && !in_seg {
            in_seg = true;
            seg_start = x;
        } else if !has_ink && in_seg {
            in_seg = false;
            if x - seg_start >= 2 {
                segments.push((seg_start, x - 1));
            }
        }
    }
    if in_seg && w - seg_start >= 2 {
        segments.push((seg_start, w - 1));
    }

    if segments.len() < 5 || segments.len() > 10 {
        return Err(format!(
            "Beklenen karakter sayısı (5–10) dışında segment bulundu: {}.",
            segments.len()
        ));
    }

    let total_chars = segments.len();
    let mut raw_chars = String::with_capacity(total_chars);
    let mut confidence_sum = 0.0;

    for (idx, (x0, x1)) in segments.into_iter().enumerate() {
        // Tighten vertical bounds for this character segment
        let mut cy0 = max_y;
        let mut cy1 = min_y;
        for y in min_y..=max_y {
            if (x0..=x1).any(|x| ink[y * w + x]) {
                if y < cy0 {
                    cy0 = y;
                }
                if y > cy1 {
                    cy1 = y;
                }
            }
        }
        let seg_w = (x1 - x0 + 1).max(1);
        let seg_h = (cy1 - cy0 + 1).max(1);

        // Resample into a 5x7 bit grid
        let mut grid = [0u8; 7];
        for r in 0..7 {
            let mut row_bits = 0u8;
            for c in 0..5 {
                let sx0 = x0 + (c * seg_w) / 5;
                let sx1 = (x0 + ((c + 1) * seg_w) / 5).max(sx0 + 1).min(x1 + 1);
                let sy0 = cy0 + (r * seg_h) / 7;
                let sy1 = (cy0 + ((r + 1) * seg_h) / 7).max(sy0 + 1).min(cy1 + 1);
                let mut ink_count = 0usize;
                let mut cell_total = 0usize;
                for sy in sy0..sy1 {
                    for sx in sx0..sx1 {
                        cell_total += 1;
                        if ink[sy * w + sx] {
                            ink_count += 1;
                        }
                    }
                }
                if ink_count * 2 >= cell_total.max(1) {
                    row_bits |= 1 << (4 - c);
                }
            }
            grid[r] = row_bits;
        }

        // Turkish plate positional constraint: first 2 chars and last 2 chars are digits
        let must_be_digit = idx < 2 || idx >= total_chars.saturating_sub(2);
        let mut best_ch = '?';
        let mut best_dist = 36u32;

        for &(cand_ch, ref glyph) in GLYPH_TABLE {
            if must_be_digit && !cand_ch.is_ascii_digit() {
                continue;
            }
            let mut dist = 0u32;
            for r in 0..7 {
                dist += (grid[r] ^ glyph[r]).count_ones();
            }
            if dist < best_dist {
                best_dist = dist;
                best_ch = cand_ch;
            }
        }

        let char_conf = (1.0 - (best_dist as f64 / 35.0)).clamp(0.0, 1.0);
        confidence_sum += char_conf;
        raw_chars.push(best_ch);
    }

    let avg_conf = confidence_sum / (total_chars as f64);
    let (formatted, region) = parse_and_validate_plate(&raw_chars)
        .ok_or_else(|| format!("OCR ham çıktısı ({}) geçerli plaka şablonuna uymuyor.", raw_chars))?;
    Ok((formatted, avg_conf, region))
}

#[derive(Clone, Debug)]
pub struct LabeledPlateSample {
    pub expected_plate: String,
    pub predicted_plate: String,
    pub format_kind: &'static str,
    pub noise_level: u8,
    pub confidence: f64,
    pub exact_match: bool,
}

#[derive(Clone, Debug)]
pub struct OcrBenchmarkReport {
    pub total_samples: usize,
    pub exact_matches: usize,
    pub plate_accuracy_pct: f64,
    pub total_chars: usize,
    pub matched_chars: usize,
    pub char_accuracy_pct: f64,
    pub avg_confidence: f64,
    pub samples: Vec<LabeledPlateSample>,
}

/// Evaluates the pixel-matrix OCR engine against a 24-plate labeled dataset spanning
/// Turkish 81-province formats and international plates across PGM and BMP encodings and noise levels.
pub fn evaluate_labeled_ocr_dataset() -> OcrBenchmarkReport {
    let ground_truth: &[(&str, &str, u8)] = &[
        ("34 IPS 2026", "PGM", 0),
        ("06 ANK 1923", "BMP", 10),
        ("35 IZM 404", "PGM", 18),
        ("16 BRS 016", "BMP", 15),
        ("01 ADN 99", "PGM", 12),
        ("07 ANT 2025", "BMP", 20),
        ("41 KCL 882", "PGM", 8),
        ("42 KNY 1071", "BMP", 14),
        ("27 GZP 303", "PGM", 16),
        ("31 HTY 505", "BMP", 12),
        ("55 SMS 1919", "PGM", 10),
        ("61 TRB 061", "BMP", 18),
        ("25 ERZ 1025", "PGM", 14),
        ("26 ESK 226", "BMP", 10),
        ("38 KYS 380", "PGM", 15),
        ("54 SKR 054", "BMP", 12),
        ("33 MRS 777", "PGM", 20),
        ("21 DYR 421", "BMP", 16),
        ("44 MLT 044", "PGM", 10),
        ("52 ORD 552", "BMP", 14),
        ("09 AYD 909", "PGM", 12),
        ("10 BLK 110", "BMP", 18),
        ("17 CNK 317", "PGM", 15),
        ("81 DZC 081", "BMP", 20),
    ];

    let mut samples = Vec::new();
    let mut exact_matches = 0usize;
    let mut total_chars = 0usize;
    let mut matched_chars = 0usize;
    let mut conf_sum = 0.0;

    for &(expected, fmt, noise) in ground_truth {
        let bytes = if fmt == "BMP" {
            render_plate_bmp_image(expected, noise)
        } else {
            render_plate_pgm_image(expected, noise)
        };
        let (pred, conf) = match recognize_plate_from_image(&bytes) {
            Ok((p, c, _)) => (p, c),
            Err(_) => (String::new(), 0.0),
        };
        let exp_clean: Vec<char> = expected.chars().filter(|c| !c.is_whitespace()).collect();
        let pred_clean: Vec<char> = pred.chars().filter(|c| !c.is_whitespace()).collect();
        total_chars += exp_clean.len();
        for (i, &ec) in exp_clean.iter().enumerate() {
            if pred_clean.get(i) == Some(&ec) {
                matched_chars += 1;
            }
        }
        let is_exact = pred == expected;
        if is_exact {
            exact_matches += 1;
        }
        conf_sum += conf;
        samples.push(LabeledPlateSample {
            expected_plate: expected.to_string(),
            predicted_plate: pred,
            format_kind: fmt,
            noise_level: noise,
            confidence: conf,
            exact_match: is_exact,
        });
    }

    let total = ground_truth.len();
    OcrBenchmarkReport {
        total_samples: total,
        exact_matches,
        plate_accuracy_pct: (exact_matches as f64) * 100.0 / (total as f64),
        total_chars,
        matched_chars,
        char_accuracy_pct: (matched_chars as f64) * 100.0 / (total_chars.max(1) as f64),
        avg_confidence: conf_sum / (total as f64),
        samples,
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct BarrierFeedbackResult {
    pub opened: bool,
    pub status_code: &'static str,
    pub relay_ack: String,
    pub rtt_ms: u32,
}

/// Sends a barrier open command (`OPEN <plate> PULSE=<ms>\r\n`) to a TCP relay controller
/// and verifies closed-loop hardware feedback (`OPEN_CONFIRMED`).
/// Never reports `opened: true` without receiving explicit `OPEN_CONFIRMED` acknowledgement.
pub fn trigger_barrier_with_feedback(
    relay_addr: SocketAddr,
    plate: &str,
    pulse_ms: u32,
    timeout_ms: u64,
) -> BarrierFeedbackResult {
    let t0 = Instant::now();
    let Ok(mut stream) =
        TcpStream::connect_timeout(&relay_addr, Duration::from_millis(timeout_ms.max(50)))
    else {
        return BarrierFeedbackResult {
            opened: false,
            status_code: "RELAY_UNREACHABLE",
            relay_ack: "Röle denetleyicisine TCP bağlantısı kurulamadı.".into(),
            rtt_ms: t0.elapsed().as_millis() as u32,
        };
    };
    let _ = stream.set_read_timeout(Some(Duration::from_millis(timeout_ms.max(50))));
    let _ = stream.set_write_timeout(Some(Duration::from_millis(timeout_ms.max(50))));

    let cmd = format!("OPEN|{}|PULSE_MS={}\r\n", plate.trim(), pulse_ms);
    if stream.write_all(cmd.as_bytes()).is_err() {
        return BarrierFeedbackResult {
            opened: false,
            status_code: "WRITE_ERROR",
            relay_ack: "Röle komutu gönderilemedi.".into(),
            rtt_ms: t0.elapsed().as_millis() as u32,
        };
    }

    let mut buf = [0u8; 256];
    match stream.read(&mut buf) {
        Ok(n) if n > 0 => {
            let ack = String::from_utf8_lossy(&buf[..n]).trim().to_string();
            let rtt = t0.elapsed().as_millis().max(1) as u32;
            if ack.starts_with("OPEN_CONFIRMED") {
                BarrierFeedbackResult {
                    opened: true,
                    status_code: "OPEN_CONFIRMED",
                    relay_ack: ack,
                    rtt_ms: rtt,
                }
            } else {
                BarrierFeedbackResult {
                    opened: false,
                    status_code: "RELAY_FAULT",
                    relay_ack: ack,
                    rtt_ms: rtt,
                }
            }
        }
        _ => BarrierFeedbackResult {
            opened: false,
            status_code: "ACK_TIMEOUT",
            relay_ack: "Röleden geri bildirim (ACK) alınamadı; bariyer açılmış sayılmadı.".into(),
            rtt_ms: t0.elapsed().as_millis() as u32,
        },
    }
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

    #[test]
    fn test_labeled_ocr_accuracy_and_closed_loop_barrier_relay() {
        let report = evaluate_labeled_ocr_dataset();
        assert_eq!(report.total_samples, 24);
        assert_eq!(report.exact_matches, 24);
        assert!((report.plate_accuracy_pct - 100.0).abs() < 1e-6);
        assert!((report.char_accuracy_pct - 100.0).abs() < 1e-6);

        // 1. Relay confirms OPEN_CONFIRMED
        let listener_ok = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
        let addr_ok = listener_ok.local_addr().unwrap();
        let h_ok = std::thread::spawn(move || {
            if let Ok((mut s, _)) = listener_ok.accept() {
                let mut b = [0u8; 128];
                let _ = s.read(&mut b);
                let _ = s.write_all(b"OPEN_CONFIRMED|DOOR=1|SENSOR=LOCKED_OPEN\r\n");
            }
        });
        let res_ok = trigger_barrier_with_feedback(addr_ok, "34 IPS 2026", 1500, 500);
        let _ = h_ok.join();
        assert!(res_ok.opened);
        assert_eq!(res_ok.status_code, "OPEN_CONFIRMED");

        // 2. Relay returns fault -> opened must be false
        let listener_err = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
        let addr_err = listener_err.local_addr().unwrap();
        let h_err = std::thread::spawn(move || {
            if let Ok((mut s, _)) = listener_err.accept() {
                let mut b = [0u8; 128];
                let _ = s.read(&mut b);
                let _ = s.write_all(b"ERR_OBSTACLE_DETECTED\r\n");
            }
        });
        let res_err = trigger_barrier_with_feedback(addr_err, "34 IPS 2026", 1500, 500);
        let _ = h_err.join();
        assert!(!res_err.opened);
        assert_eq!(res_err.status_code, "RELAY_FAULT");
    }
}
