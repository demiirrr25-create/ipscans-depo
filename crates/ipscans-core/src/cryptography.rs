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

// ============================================================================
// Pure-Rust Asymmetric RSA-512-SHA256 Licensing, Revocation & Key Rotation
// Note: ONLY public moduli (N, E) reside in `ipscans-core` / `IPScans-Cortex.exe`.
// Private signing exponents `d` never enter the distributed client binary.
// ============================================================================

/// Key ID v1 Public Modulus (512-bit RSA, e = 65537).
pub const PUBLIC_KEY_V1_N_HEX: &str = "bf2079016d627bd8938a69c2cbbe03019fbb67433a16c383eae187537580a04ecec97500d9a480c5207bdb17990eb07e2d9dcbe39bcad2dfbc467452c2ebe5fd";
/// Key ID v2 Public Modulus (512-bit RSA rotated key, e = 65537).
pub const PUBLIC_KEY_V2_N_HEX: &str = "bde722e1aaf0c920b64d8958c684b84f91ebc5d00a3e8651d76ba74e89cb7f0d67995244147d4e8a4f77fd11cc6f274561bc2ab5349f7ce7a32ea8e80ce06d35";
pub const RSA_PUBLIC_E: u64 = 65537;

#[derive(Clone, Debug, PartialEq, Eq)]
struct BigUint {
    limbs: Vec<u32>, // little-endian base 2^32
}

impl BigUint {
    fn zero() -> Self {
        Self { limbs: vec![0] }
    }

    fn from_u64(v: u64) -> Self {
        let lo = (v & 0xFFFF_FFFF) as u32;
        let hi = (v >> 32) as u32;
        let mut b = Self {
            limbs: if hi != 0 { vec![lo, hi] } else { vec![lo] },
        };
        b.trim();
        b
    }

    fn trim(&mut self) {
        while self.limbs.len() > 1 && *self.limbs.last().unwrap() == 0 {
            self.limbs.pop();
        }
        if self.limbs.is_empty() {
            self.limbs.push(0);
        }
    }

    fn is_zero(&self) -> bool {
        self.limbs.iter().all(|&x| x == 0)
    }

    fn from_be_bytes(bytes: &[u8]) -> Self {
        let mut limbs = Vec::new();
        let mut i = bytes.len();
        while i > 0 {
            let start = i.saturating_sub(4);
            let mut buf = [0u8; 4];
            let slice = &bytes[start..i];
            buf[4 - slice.len()..].copy_from_slice(slice);
            limbs.push(u32::from_be_bytes(buf));
            i = start;
        }
        let mut out = Self { limbs };
        out.trim();
        out
    }

    fn to_be_bytes_padded(&self, target_len: usize) -> Vec<u8> {
        let mut raw = Vec::with_capacity(self.limbs.len() * 4);
        for &limb in self.limbs.iter().rev() {
            raw.extend_from_slice(&limb.to_be_bytes());
        }
        let first_nonzero = raw.iter().position(|&b| b != 0).unwrap_or(raw.len());
        let trimmed = &raw[first_nonzero..];
        if trimmed.len() >= target_len {
            trimmed.to_vec()
        } else {
            let mut out = vec![0u8; target_len - trimmed.len()];
            out.extend_from_slice(trimmed);
            out
        }
    }

    fn from_hex(hex: &str) -> Result<Self, &'static str> {
        let clean = hex.trim();
        if clean.is_empty() {
            return Err("Empty hex");
        }
        let padded = if clean.len() % 2 == 1 {
            format!("0{}", clean)
        } else {
            clean.to_string()
        };
        let mut bytes = Vec::with_capacity(padded.len() / 2);
        for i in (0..padded.len()).step_by(2) {
            let b = u8::from_str_radix(&padded[i..i + 2], 16).map_err(|_| "Invalid hex digit")?;
            bytes.push(b);
        }
        Ok(Self::from_be_bytes(&bytes))
    }

    fn to_hex_padded(&self, byte_len: usize) -> String {
        let bytes = self.to_be_bytes_padded(byte_len);
        let mut out = String::with_capacity(bytes.len() * 2);
        for b in bytes {
            use std::fmt::Write;
            let _ = write!(&mut out, "{:02x}", b);
        }
        out
    }

    fn cmp_val(&self, other: &Self) -> std::cmp::Ordering {
        let mut a = self.clone();
        let mut b = other.clone();
        a.trim();
        b.trim();
        if a.limbs.len() != b.limbs.len() {
            return a.limbs.len().cmp(&b.limbs.len());
        }
        for i in (0..a.limbs.len()).rev() {
            if a.limbs[i] != b.limbs[i] {
                return a.limbs[i].cmp(&b.limbs[i]);
            }
        }
        std::cmp::Ordering::Equal
    }

    fn sub_assign(&mut self, other: &Self) {
        let mut borrow = 0i64;
        for i in 0..self.limbs.len() {
            let o = *other.limbs.get(i).unwrap_or(&0) as i64;
            let diff = (self.limbs[i] as i64) - o - borrow;
            if diff < 0 {
                self.limbs[i] = (diff + (1i64 << 32)) as u32;
                borrow = 1;
            } else {
                self.limbs[i] = diff as u32;
                borrow = 0;
            }
        }
        self.trim();
    }

    fn shl1_add_bit(&mut self, bit: u32) {
        let mut carry = bit;
        for limb in &mut self.limbs {
            let next_carry = *limb >> 31;
            *limb = (*limb << 1) | carry;
            carry = next_carry;
        }
        if carry != 0 {
            self.limbs.push(carry);
        }
        self.trim();
    }

    fn bit_len(&self) -> usize {
        let mut a = self.clone();
        a.trim();
        if a.is_zero() {
            return 0;
        }
        let top = *a.limbs.last().unwrap();
        (a.limbs.len() - 1) * 32 + (32 - top.leading_zeros() as usize)
    }

    fn get_bit(&self, idx: usize) -> u32 {
        let limb_idx = idx / 32;
        let bit_idx = idx % 32;
        if let Some(&limb) = self.limbs.get(limb_idx) {
            (limb >> bit_idx) & 1
        } else {
            0
        }
    }

    fn mul(&self, other: &Self) -> Self {
        let mut res = vec![0u32; self.limbs.len() + other.limbs.len()];
        for i in 0..self.limbs.len() {
            let mut carry = 0u64;
            for j in 0..other.limbs.len() {
                let prod = (self.limbs[i] as u64) * (other.limbs[j] as u64)
                    + (res[i + j] as u64)
                    + carry;
                res[i + j] = (prod & 0xFFFF_FFFF) as u32;
                carry = prod >> 32;
            }
            res[i + other.limbs.len()] = carry as u32;
        }
        let mut out = Self { limbs: res };
        out.trim();
        out
    }

    fn rem(&self, modulus: &Self) -> Self {
        let mut r = Self::zero();
        let bits = self.bit_len();
        for i in (0..bits).rev() {
            r.shl1_add_bit(self.get_bit(i));
            if r.cmp_val(modulus) != std::cmp::Ordering::Less {
                r.sub_assign(modulus);
            }
        }
        r.trim();
        r
    }

    fn mod_pow(&self, exp: &Self, modulus: &Self) -> Self {
        let mut result = Self::from_u64(1);
        let mut base = self.rem(modulus);
        let bits = exp.bit_len();
        for i in 0..bits {
            if exp.get_bit(i) == 1 {
                result = result.mul(&base).rem(modulus);
            }
            base = base.mul(&base).rem(modulus);
        }
        result
    }
}

fn encode_pkcs1_v15_sha256_block(message: &[u8]) -> [u8; 64] {
    let digest = sha256_bytes(message);
    let mut block = [0xFFu8; 64];
    block[0] = 0x00;
    block[1] = 0x01;
    // 64 - 3 - 32 = 29; place 0x00 separator at index 30, digest at 32..64
    block[30] = 0x00;
    block[31] = 0x20; // SHA-256 digest length marker (32 bytes)
    block[32..64].copy_from_slice(&digest);
    block
}

pub fn lookup_public_modulus_hex(kid: &str) -> Option<&'static str> {
    match kid {
        "cortex-key-2026-v1" => Some(PUBLIC_KEY_V1_N_HEX),
        "cortex-key-2026-v2" => Some(PUBLIC_KEY_V2_N_HEX),
        _ => None,
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct CortexLicenseClaims {
    pub license_id: String,
    pub key_id: String,
    pub customer: String,
    pub tier: String,
    pub max_cameras: u32,
    pub issued_at_unix: u64,
    pub expires_at_unix: u64,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct LicenseEnforcementResult {
    pub allowed: bool,
    pub status_code: &'static str,
    pub reason_tr: String,
    pub claims: Option<CortexLicenseClaims>,
}

fn hex_encode_str(s: &str) -> String {
    s.bytes().map(|b| format!("{:02x}", b)).collect()
}

fn hex_decode_str(hex: &str) -> Option<String> {
    if hex.len() % 2 != 0 {
        return None;
    }
    let mut bytes = Vec::with_capacity(hex.len() / 2);
    for i in (0..hex.len()).step_by(2) {
        bytes.push(u8::from_str_radix(&hex[i..i + 2], 16).ok()?);
    }
    String::from_utf8(bytes).ok()
}

/// Signs a Cortex license token using the issuer's private RSA exponent (`private_d_hex`) and modulus (`public_n_hex`).
/// This function is invoked ONLY by `CortexAdmin.exe` (`admin.rs`); `IPScans-Cortex.exe` never receives `private_d_hex`.
pub fn sign_cortex_license_asymmetric(
    private_d_hex: &str,
    public_n_hex: &str,
    claims: &CortexLicenseClaims,
) -> Result<String, &'static str> {
    if claims.customer.trim().is_empty() || claims.customer.len() > 240 {
        return Err("Geçerli bir müşteri adı girin.");
    }
    if !matches!(claims.tier.as_str(), "PRO" | "PLUS" | "ULTRA") {
        return Err("Geçersiz lisans paketi.");
    }
    if claims.expires_at_unix <= claims.issued_at_unix {
        return Err("Bitiş zamanı başlangıç zamanından sonra olmalı.");
    }
    let d = BigUint::from_hex(private_d_hex)?;
    let n = BigUint::from_hex(public_n_hex)?;
    let payload = format!(
        "IPS2.{}.{}.{}.{}.{}.{}.{}",
        claims.key_id,
        claims.license_id,
        claims.tier,
        claims.max_cameras,
        claims.issued_at_unix,
        claims.expires_at_unix,
        hex_encode_str(claims.customer.trim())
    );
    let block = encode_pkcs1_v15_sha256_block(payload.as_bytes());
    let m = BigUint::from_be_bytes(&block);
    let sig = m.mod_pow(&d, &n).to_hex_padded(64);
    Ok(format!("{}.{}", payload, sig))
}

/// Verifies an asymmetric `IPS2` Cortex license token using ONLY the public key registry (`PUBLIC_KEY_V1_N_HEX` / `PUBLIC_KEY_V2_N_HEX`).
pub fn verify_cortex_license_asymmetric(token: &str) -> Result<CortexLicenseClaims, &'static str> {
    let parts: Vec<&str> = token.trim().split('.').collect();
    if parts.len() != 9 || parts[0] != "IPS2" {
        return Err("Geçersiz IPS2 asimetrik lisans biçimi.");
    }
    let key_id = parts[1];
    let license_id = parts[2];
    let tier = parts[3];
    let max_cameras = parts[4]
        .parse::<u32>()
        .map_err(|_| "Geçersiz kamera kotası.")?;
    let issued_at_unix = parts[5]
        .parse::<u64>()
        .map_err(|_| "Geçersiz başlangıç zamanı.")?;
    let expires_at_unix = parts[6]
        .parse::<u64>()
        .map_err(|_| "Geçersiz bitiş zamanı.")?;
    let customer = hex_decode_str(parts[7]).ok_or("Geçersiz müşteri kodlaması.")?;
    let sig_hex = parts[8];

    let pub_n_hex = lookup_public_modulus_hex(key_id)
        .ok_or("Bilinmeyen veya devre dışı bırakılmış anahtar kimliği (kid).")?;
    let n = BigUint::from_hex(pub_n_hex)?;
    let e = BigUint::from_u64(RSA_PUBLIC_E);
    let sig = BigUint::from_hex(sig_hex)?;

    let payload = parts[..8].join(".");
    let expected_block = encode_pkcs1_v15_sha256_block(payload.as_bytes());
    let recovered = sig.mod_pow(&e, &n).to_be_bytes_padded(64);
    if recovered.as_slice() != expected_block.as_slice() {
        return Err("RSA-SHA256 açık anahtar imza doğrulaması başarısız.");
    }

    Ok(CortexLicenseClaims {
        license_id: license_id.to_string(),
        key_id: key_id.to_string(),
        customer,
        tier: tier.to_string(),
        max_cameras,
        issued_at_unix,
        expires_at_unix,
    })
}

/// Signs a Certificate Revocation List (`CRL1.<kid>.<issued_at>.<csv_revoked_ids>.<sig>`).
pub fn sign_revocation_list_asymmetric(
    private_d_hex: &str,
    public_n_hex: &str,
    key_id: &str,
    issued_at_unix: u64,
    revoked_license_ids: &[&str],
) -> Result<String, &'static str> {
    let d = BigUint::from_hex(private_d_hex)?;
    let n = BigUint::from_hex(public_n_hex)?;
    let joined = revoked_license_ids.join(",");
    let payload = format!("CRL1.{}.{}.{}", key_id, issued_at_unix, hex_encode_str(&joined));
    let block = encode_pkcs1_v15_sha256_block(payload.as_bytes());
    let m = BigUint::from_be_bytes(&block);
    let sig = m.mod_pow(&d, &n).to_hex_padded(64);
    Ok(format!("{}.{}", payload, sig))
}

/// Verifies a signed CRL token using ONLY the public key registry and returns the list of revoked license IDs.
pub fn verify_revocation_list_asymmetric(crl_token: &str) -> Result<Vec<String>, &'static str> {
    if crl_token.trim().is_empty() {
        return Ok(Vec::new());
    }
    let parts: Vec<&str> = crl_token.trim().split('.').collect();
    if parts.len() != 5 || parts[0] != "CRL1" {
        return Err("Geçersiz CRL1 iptal listesi biçimi.");
    }
    let key_id = parts[1];
    let pub_n_hex = lookup_public_modulus_hex(key_id).ok_or("Bilinmeyen CRL anahtar kimliği.")?;
    let n = BigUint::from_hex(pub_n_hex)?;
    let e = BigUint::from_u64(RSA_PUBLIC_E);
    let sig = BigUint::from_hex(parts[4])?;

    let payload = parts[..4].join(".");
    let expected_block = encode_pkcs1_v15_sha256_block(payload.as_bytes());
    let recovered = sig.mod_pow(&e, &n).to_be_bytes_padded(64);
    if recovered.as_slice() != expected_block.as_slice() {
        return Err("CRL açık anahtar imzası geçersiz.");
    }
    let decoded = hex_decode_str(parts[3]).ok_or("CRL içeriği çözülemedi.")?;
    Ok(decoded
        .split(',')
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(String::from)
        .collect())
}

/// Enforces license signature, key rotation policy (`retired_kids`), revocation list (`crl_token`),
/// expiration timestamp (`current_unix`), and camera quota (`requested_cameras`).
pub fn enforce_cortex_license(
    token: &str,
    crl_token: Option<&str>,
    retired_kids: &[&str],
    current_unix: u64,
    requested_cameras: u32,
) -> LicenseEnforcementResult {
    let claims = match verify_cortex_license_asymmetric(token) {
        Ok(c) => c,
        Err(e) => {
            return LicenseEnforcementResult {
                allowed: false,
                status_code: "INVALID_SIGNATURE",
                reason_tr: e.to_string(),
                claims: None,
            }
        }
    };

    if retired_kids.contains(&claims.key_id.as_str()) {
        return LicenseEnforcementResult {
            allowed: false,
            status_code: "KEY_ROTATED_OUT",
            reason_tr: format!(
                "Anahtar kimliği ({}) rotasyonla kullanımdan kaldırıldı.",
                claims.key_id
            ),
            claims: Some(claims),
        };
    }

    if let Some(crl_raw) = crl_token.filter(|s| !s.trim().is_empty()) {
        match verify_revocation_list_asymmetric(crl_raw) {
            Ok(revoked) => {
                if revoked.iter().any(|id| id == &claims.license_id) {
                    return LicenseEnforcementResult {
                        allowed: false,
                        status_code: "REVOKED",
                        reason_tr: format!(
                            "Lisans ({}) yönetici iptal listesinde (CRL) yer alıyor.",
                            claims.license_id
                        ),
                        claims: Some(claims),
                    };
                }
            }
            Err(e) => {
                return LicenseEnforcementResult {
                    allowed: false,
                    status_code: "INVALID_CRL",
                    reason_tr: e.to_string(),
                    claims: Some(claims),
                };
            }
        }
    }

    if current_unix > claims.expires_at_unix {
        return LicenseEnforcementResult {
            allowed: false,
            status_code: "EXPIRED",
            reason_tr: format!(
                "Lisans süresi doldu (bitiş: {}, şu an: {}).",
                claims.expires_at_unix, current_unix
            ),
            claims: Some(claims),
        };
    }

    if requested_cameras > claims.max_cameras {
        return LicenseEnforcementResult {
            allowed: false,
            status_code: "QUOTA_EXCEEDED",
            reason_tr: format!(
                "Kamera kotası aşıldı: istenen {}, lisans limiti {} ({}).",
                requested_cameras, claims.max_cameras, claims.tier
            ),
            claims: Some(claims),
        };
    }

    LicenseEnforcementResult {
        allowed: true,
        status_code: "ACTIVE",
        reason_tr: format!(
            "Lisans geçerli · {} ({} kamera kotası, anahtar {}).",
            claims.customer, claims.max_cameras, claims.key_id
        ),
        claims: Some(claims),
    }
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

    #[test]
    fn test_asymmetric_rsa_license_lifecycle_expiration_revocation_and_rotation() {
        // Private keys exist ONLY in test scope / admin issuer, never in client verification constants.
        const PRIV_D_V1: &str = "2729cb41cc9d328d65662657c111f561bece52d186b4a5698196a6f92609ae4f3d0ec1930b1d917781f14e399a2b53d900f9f5d26f63f79d58ddb673a61e0c2d";
        const PRIV_D_V2: &str = "34d8e3ce254208d6bfa4e839fa54e8edcbcfef26ac132652143ef33a5a0275828c8bbe9b69aae7fadda88c556aa8770031c39e558a8f2434abdc58b9cd35d3a9";

        let claims_v1 = CortexLicenseClaims {
            license_id: "LIC-2026-0001".to_string(),
            key_id: "cortex-key-2026-v1".to_string(),
            customer: "Anadolu Organize Sanayi".to_string(),
            tier: "PRO".to_string(),
            max_cameras: 8,
            issued_at_unix: 1_700_000_000,
            expires_at_unix: 1_800_000_000,
        };

        let token_v1 =
            sign_cortex_license_asymmetric(PRIV_D_V1, PUBLIC_KEY_V1_N_HEX, &claims_v1).unwrap();

        // 1. Active verification & quota enforcement
        let ok_res = enforce_cortex_license(&token_v1, None, &[], 1_750_000_000, 6);
        assert!(ok_res.allowed);
        assert_eq!(ok_res.status_code, "ACTIVE");

        // 2. Camera quota exceeded
        let quota_res = enforce_cortex_license(&token_v1, None, &[], 1_750_000_000, 12);
        assert!(!quota_res.allowed);
        assert_eq!(quota_res.status_code, "QUOTA_EXCEEDED");

        // 3. Expired license
        let exp_res = enforce_cortex_license(&token_v1, None, &[], 1_800_000_001, 4);
        assert!(!exp_res.allowed);
        assert_eq!(exp_res.status_code, "EXPIRED");

        // 4. Signed Revocation List (CRL) blocks revoked license ID
        let crl_token = sign_revocation_list_asymmetric(
            PRIV_D_V1,
            PUBLIC_KEY_V1_N_HEX,
            "cortex-key-2026-v1",
            1_750_000_000,
            &["LIC-2026-0001", "LIC-2026-0099"],
        )
        .unwrap();
        let rev_res =
            enforce_cortex_license(&token_v1, Some(&crl_token), &[], 1_750_000_000, 4);
        assert!(!rev_res.allowed);
        assert_eq!(rev_res.status_code, "REVOKED");

        // 5. Key Rotation: retire v1, issue with v2
        let claims_v2 = CortexLicenseClaims {
            license_id: "LIC-2026-0002".to_string(),
            key_id: "cortex-key-2026-v2".to_string(),
            customer: "Anadolu Organize Sanayi".to_string(),
            tier: "ULTRA".to_string(),
            max_cameras: 64,
            issued_at_unix: 1_750_000_000,
            expires_at_unix: 1_850_000_000,
        };
        let token_v2 =
            sign_cortex_license_asymmetric(PRIV_D_V2, PUBLIC_KEY_V2_N_HEX, &claims_v2).unwrap();

        let retired = ["cortex-key-2026-v1"];
        let rotated_old = enforce_cortex_license(&token_v1, None, &retired, 1_760_000_000, 4);
        assert!(!rotated_old.allowed);
        assert_eq!(rotated_old.status_code, "KEY_ROTATED_OUT");

        let rotated_new = enforce_cortex_license(&token_v2, None, &retired, 1_760_000_000, 32);
        assert!(rotated_new.allowed);
        assert_eq!(rotated_new.status_code, "ACTIVE");
    }
}
