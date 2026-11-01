//! Pure Rust FIPS 180-4 SHA-256, HMAC-SHA256, Forensic Evidence Chain, and License Key Engine.
//! Zero external crate dependencies (`std` only).

const K: [u32; 64] = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

const H0: [u32; 8] = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
];

/// Computes the exact FIPS 180-4 SHA-256 digest of `data` as a 32-byte array.
pub fn sha256_bytes(data: &[u8]) -> [u8; 32] {
    let mut state = H0;
    let bit_len = (data.len() as u64).wrapping_mul(8);

    let mut padded = Vec::with_capacity(data.len() + 72);
    padded.extend_from_slice(data);
    padded.push(0x80);
    while (padded.len() % 64) != 56 {
        padded.push(0x00);
    }
    padded.extend_from_slice(&bit_len.to_be_bytes());

    for chunk in padded.chunks_exact(64) {
        let mut w = [0u32; 64];
        for (i, word) in chunk.chunks_exact(4).enumerate() {
            w[i] = u32::from_be_bytes([word[0], word[1], word[2], word[3]]);
        }
        for i in 16..64 {
            let s0 = w[i - 15].rotate_right(7) ^ w[i - 15].rotate_right(18) ^ (w[i - 15] >> 3);
            let s1 = w[i - 2].rotate_right(17) ^ w[i - 2].rotate_right(19) ^ (w[i - 2] >> 10);
            w[i] = w[i - 16]
                .wrapping_add(s0)
                .wrapping_add(w[i - 7])
                .wrapping_add(s1);
        }

        let mut a = state[0];
        let mut b = state[1];
        let mut c = state[2];
        let mut d = state[3];
        let mut e = state[4];
        let mut f = state[5];
        let mut g = state[6];
        let mut h = state[7];

        for i in 0..64 {
            let s1 = e.rotate_right(6) ^ e.rotate_right(11) ^ e.rotate_right(25);
            let ch = (e & f) ^ ((!e) & g);
            let temp1 = h
                .wrapping_add(s1)
                .wrapping_add(ch)
                .wrapping_add(K[i])
                .wrapping_add(w[i]);
            let s0 = a.rotate_right(2) ^ a.rotate_right(13) ^ a.rotate_right(22);
            let maj = (a & b) ^ (a & c) ^ (b & c);
            let temp2 = s0.wrapping_add(maj);

            h = g;
            g = f;
            f = e;
            e = d.wrapping_add(temp1);
            d = c;
            c = b;
            b = a;
            a = temp1.wrapping_add(temp2);
        }

        state[0] = state[0].wrapping_add(a);
        state[1] = state[1].wrapping_add(b);
        state[2] = state[2].wrapping_add(c);
        state[3] = state[3].wrapping_add(d);
        state[4] = state[4].wrapping_add(e);
        state[5] = state[5].wrapping_add(f);
        state[6] = state[6].wrapping_add(g);
        state[7] = state[7].wrapping_add(h);
    }

    let mut out = [0u8; 32];
    for (i, word) in state.iter().enumerate() {
        let bytes = word.to_be_bytes();
        out[i * 4..i * 4 + 4].copy_from_slice(&bytes);
    }
    out
}

/// Computes the lowercase hexadecimal FIPS 180-4 SHA-256 digest of `data`.
pub fn sha256_hex(data: &[u8]) -> String {
    let digest = sha256_bytes(data);
    let mut hex = String::with_capacity(64);
    for b in digest {
        use std::fmt::Write;
        let _ = write!(&mut hex, "{:02x}", b);
    }
    hex
}

/// Computes RFC 2104 HMAC-SHA256.
pub fn hmac_sha256(key: &[u8], message: &[u8]) -> [u8; 32] {
    let mut key_block = [0u8; 64];
    if key.len() > 64 {
        let hashed = sha256_bytes(key);
        key_block[..32].copy_from_slice(&hashed);
    } else {
        key_block[..key.len()].copy_from_slice(key);
    }

    let mut o_key_pad = [0x5cu8; 64];
    let mut i_key_pad = [0x36u8; 64];
    for i in 0..64 {
        o_key_pad[i] ^= key_block[i];
        i_key_pad[i] ^= key_block[i];
    }

    let mut inner = Vec::with_capacity(64 + message.len());
    inner.extend_from_slice(&i_key_pad);
    inner.extend_from_slice(message);
    let inner_hash = sha256_bytes(&inner);

    let mut outer = Vec::with_capacity(64 + 32);
    outer.extend_from_slice(&o_key_pad);
    outer.extend_from_slice(&inner_hash);
    sha256_bytes(&outer)
}

/// Issue a versioned, self-contained license using the operator's private issuer key.
pub fn sign_license(
    secret: &[u8],
    customer: &str,
    tier: &str,
    expires: u64,
) -> Result<String, &'static str> {
    if secret.len() < 32 {
        return Err("İmzalama anahtarı en az 32 bayt olmalı.");
    }
    let customer = customer.trim();
    if customer.is_empty() || customer.len() > 240 || customer.chars().any(char::is_control) {
        return Err("Geçerli bir müşteri adı girin.");
    }
    if !matches!(tier, "PRO" | "PLUS" | "ULTRA") {
        return Err("Geçersiz lisans paketi.");
    }
    let customer_hex: String = customer.bytes().map(|b| format!("{b:02x}")).collect();
    let payload = format!("IPS1.{tier}.{expires}.{customer_hex}");
    let signature: String = hmac_sha256(secret, payload.as_bytes())
        .iter()
        .map(|b| format!("{b:02x}"))
        .collect();
    Ok(format!("{payload}.{signature}"))
}

/// Chains a forensic event into a tamper-evident SHA-256 ledger entry.
pub fn chain_forensic_evidence(
    previous_hash: &str,
    camera_id: &str,
    rule_id: &str,
    timestamp_iso: &str,
) -> String {
    let record = format!(
        "{}|{}|{}|{}",
        previous_hash, camera_id, rule_id, timestamp_iso
    );
    sha256_hex(record.as_bytes())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_fips_180_4_sha256_vectors() {
        // NIST test vector: "abc"
        assert_eq!(
            sha256_hex(b"abc"),
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );
        // NIST test vector: empty string
        assert_eq!(
            sha256_hex(b""),
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        );
    }

    #[test]
    fn test_commercial_license_and_forensic_chain() {
        let secret = [17; 32];
        let key = sign_license(&secret, "Marmara Teknoloji", "ULTRA", 365).unwrap();
        assert_eq!(key.split('.').count(), 5);
        assert_ne!(
            key,
            sign_license(&secret, "Marmara Teknoloji", "ULTRA", 366).unwrap()
        );
        assert!(sign_license(b"short", "Firma", "ULTRA", 1).is_err());
        assert!(sign_license(&secret, "Firma", "other", 1).is_err());

        let genesis = "0000000000000000000000000000000000000000000000000000000000000000";
        let h1 = chain_forensic_evidence(genesis, "CAM-01", "INTRUSION", "2026-11-01T10:00:00Z");
        assert_eq!(h1.len(), 64);
    }
}
