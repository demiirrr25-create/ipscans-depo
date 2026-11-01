# IPCast v3.0 — Şifreli Uzak Masaüstü ve Dosya Aktarımı (Native Rust)

**IPCast v3.0 (`IPCast.exe`)**, Windows 10/11 (x64) için **%100 Native Rust** ile geliştirilmiş, uçtan uca TLS 1.3 şifreli uzak masaüstü, 9 haneli istasyon kimliği, doğrudan LAN IP bağlantısı ve SHA-256 doğrulamalı dosya aktarım uygulamasıdır.

## Mimari Özellikler
- **9 Haneli Cihaz Kimliği & Doğrudan LAN IP**: Yerel ağda sıfır yapılandırma ile iş istasyonu keşfi ve tek kullanımlık oturum parolası.
- **Oturum Bazlı İzin Denetimi**: Görüntüleme, fare/klavye kontrolü ve pano/dosya aktarımı izinlerini ayrı ayrı onaylama.
- **IPScans v2 Tasarım Sistemi**: Varsayılan açık tema (Light Mode), gerçek zamanlı TLS 1.3 oturum günlüğü ve LAN adres defteri.

## Derleme ve Doğrulama

```powershell
cargo build --release --bin IPCast
.\target\release\IPCast.exe --selftest
```
