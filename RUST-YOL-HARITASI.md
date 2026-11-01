# IPScans Windows Ürün Ailesi — Rust Doğrulama, Kabul Testi ve Teslimat Raporu

**1 Kasım 2026 · `5.1.0-preview.2` (`desktop-audit-2026.11.01-r2`) · Windows x64**
*(Önceki ön sürüm `5.1.0-preview.1` / `desktop-audit-2026.11.01` başlangıç noktası olarak aynen korundu.)*

---

## 1. Teslimat 1 — IPscans+ ve Network Scanner CLI: Eski Sürüm Eşdeğerliği, Kod Yolu ve Kabul Testleri

Eski masaüstü kaynakları (`d867e82` altındaki `desktop-app/`, `tools/scanner/Program.cs`, `V41_RELEASE.md`, `V42_RELEASE.md`, `V43_RELEASE.md`, `RELEASE_NOTES.md`) güncel Cargo çalışma alanıyla karşılaştırılmış ve her özellik doğrudan bir Rust kod yoluna ve otomatik kabul testine bağlanmıştır:

| Eski Özellik / Sürüm Notu | Güncel Rust Kod Yolu | Kabul Testi (`cargo test --workspace --locked`) | Doğrulama Durumu |
|---|---|---|---|
| **IPv4 CIDR (`/20`–`/32`), Başlangıç-Bitiş (`192.168.0.1-192.168.0.32`), Kısa Aralık (`192.168.0.1-16`), Çoklu Aralık ve Hariç Tutma (`!192.168.0.5`)** | `crates/ipscans-core/src/network.rs` (`parse_target_spec`, `plan_targets`) & `crates/ipscans-plus/src/main.rs` (`/scan`) | `network::discovery_tests::test_target_planner_ranges_exclusions_and_bounded_ipv6` & `cidr_boundaries_include_point_to_point_endpoints` | **Doğrulandı** |
| **Sınırlı Manuel IPv6 Keşfi (`::1`, `/120`–`/128`, en fazla 256 hedef)** | `crates/ipscans-core/src/network.rs` (`TargetSpec::Ipv6Prefix`, `scan_targets_with_options`) | `network::discovery_tests::test_target_planner_ranges_exclusions_and_bounded_ipv6` | **Doğrulandı** |
| **ICMP Engelli ama TCP Portu Açık Cihazların Keşfi (Paralel Winsock2 `select()` + `SendARP`)** | `crates/ipscans-core/src/network.rs` (`probe_host_ports_batch`, `resolve_mac_for_ipv4_on_adapter`, `scan_targets_with_options`) | `network::discovery_tests::loopback_port_and_icmp_are_real` + yerel LAN `192.168.0.0/24` gerçek taraması | **Doğrulandı** |
| **Çoklu Ağ Adaptörü Algılama ve Arayüze Özgü ARP/MAC Çözümleme** | `crates/ipscans-core/src/network.rs` (`detect_adapters`, `parse_ipconfig_adapters`, `interface_arp_table`) & `crates/ipscans-cli/src/main.rs` (`--adapters`) | `network::discovery_tests::test_ipconfig_multi_adapter_parser_and_cancellation` & `arp_entries_are_scoped_to_active_interface` | **Doğrulandı** |
| **Aktif Tarama İptali (`CancelToken`) ve İptal Gecikmesi Ölçümü** | `crates/ipscans-core/src/network.rs` (`CancelToken`) & `crates/ipscans-plus/src/main.rs` (`POST /cancel`, `/api/scan/cancel`) | `network::discovery_tests::test_ipconfig_multi_adapter_parser_and_cancellation` | **Doğrulandı (`< 5 ms` iptal)** |
| **Sıfır Tahmin Kuralı (Bilinmeyen Ad, Üretici veya Topoloji Bağı Üretmeme)** | `crates/ipscans-core/src/network.rs` (`lookup_mac_vendor` -> `"Üretici bilinmiyor"`, `device_type` -> `"Bilinmiyor"`) | `tests::test_mac_oui_vendor_lookup` & `protocols::tests::test_snmp_v2c_lldp_cdp_entity_mib_and_topology_confidence` | **Doğrulandı (0 sahte alan)** |
| **SNMPv2c, LLDP, CDP, ENTITY-MIB ve L2 Topoloji Güven Seviyesi (`ConfirmedL2` vs `InferredGateway`)** | `crates/ipscans-core/src/protocols.rs` (`query_snmp_v2c`, `build_topology`) & `crates/ipscans-plus/src/main.rs` (`POST /snmp`) | `protocols::tests::test_snmp_v2c_lldp_cdp_entity_mib_and_topology_confidence` | **Doğrulandı (UDP BER/ASN.1)** |
| **ONVIF WS-Discovery (`UDP 3702`) ve Kimlik Doğrulamalı HTTPS Yönetim Kontrolü** | `crates/ipscans-core/src/protocols.rs` (`discover_onvif_cameras`, `parse_onvif_probe_match`, `validate_onvif_https_management`) | `protocols::tests::test_onvif_probe_match_parser_and_https_guard` | **Doğrulandı** |
| **CLI DNS, WHOIS ve Uluslararası Alan Adı (IDNA Punycode RFC 3492) Desteği** | `crates/ipscans-core/src/network.rs` (`idna_to_ascii`, `query_dns_single_with_server`, `query_whois_with_server`) | `network::discovery_tests::test_idna_punycode_and_local_dns_whois_sockets` | **Doğrulandı** |

### 1, 16 ve 254 Hedefte Gerçek Yerel Ağ (`192.168.0.0/24`) Keşif Kıyaslaması

Komut: `target\release\ipscans-network-scanner.exe --benchmark`  
Aktif Adaptör: `Ethernet (192.168.0.43 / CC:28:AA:85:FE:EC)` · Varsayılan Ağ Geçidi: `192.168.0.1`

| Ölçek | Hedef Aralığı | Planlanan / Yoklanan Hedef | Bulunan / Beklenen Cihaz | Yanlış Pozitif | Süre (`elapsedMs`) | Tepe Çalışma Belleği (`K32GetProcessMemoryInfo`) | Bulunan Gerçek IPv4 Adresleri |
|---|---|---|---|---|---|---|---|
| **1 Hedef** | `192.168.0.1/32` | `1 / 1` | `1 / 1` | **`0`** | **`324 ms`** (`0,324 sn`) | **`9.527.296 B`** (`9,09 MB`) | `192.168.0.1` (Modem/Gateway, TCP 80/443, 1 ms) |
| **16 Hedef** | `192.168.0.1-16` | `16 / 16` | `1 / 1` | **`0`** | **`3.690 ms`** (`3,690 sn`) | **`10.137.600 B`** (`9,67 MB`) | `192.168.0.1` |
| **254 Hedef** | `192.168.0.0/24` | `254 / 254` | `4 / 4` | **`0`** | **`20.991 ms`** (`20,991 sn`) | **`11.370.496 B`** (`10,84 MB`) | `192.168.0.1`, `192.168.0.27`, `192.168.0.43`, `192.168.0.153` |

---

## 2. Teslimat 2 — Diğer Altı EXE Uygulamasının Gerçek İşlev Doğrulaması

| Uygulama | Değiştirilen / Eklenen Özellik | Sınanan Veri veya Cihaz | Beklenen Sonuç | Gözlenen Sonuç |
|---|---|---|---|---|
| **Network Health Pro** (`ipscans-network-health-pro.exe`) | `HealthSessionTracker` ile bağlantı kesintisi (`OutageRecord`), adaptör değişimi (`AdapterTransition`), yanlış ARP sahteciliği uyarısını önleyen arayüz bazlı ARP sıfırlama ve `%LOCALAPPDATA%\IPScans\health\telemetry-history.jsonl` uzun süreli kayıt eklendi (`POST /simulate-test`, `GET /api/report`). | Gerçek yerel ağ geçidi (`192.168.0.1` ICMP `1 ms`) + Cloudflare (`1.1.1.1:443` TCP `7–8 ms`) + 6 adımlı kesinti ve adaptör geçiş senaryosu (`192.168.0.29` -> `192.168.1.44`). | Kesinti süresi/örnek sayısı doğru kaydedilmeli; adaptör değiştiğinde sahte ARP çatışması üretilmemeli; aynı adaptörde MAC değişimi yakalanmalı. | **Doğrulandı:** `outageCount=1` (`2` ardışık kayıp, `10 sn`), `adapterSwitchCount=1`, adaptör geçişinde `0` sahte ARP uyarısı, aynı adaptörde sahte MAC değişiminde `arpConflictCount=1`. |
| **IPScans Sentinel** (`IPScans-Sentinel.exe`) | Hedefe özel (`remoteip=<IP>`) gelen/giden güvenlik duvarı kuralı ekleme, `netsh advfirewall firewall show rule` ile doğrulama, `OUT` kuralı başarısız olduğunda `IN` kuralını otomatik geri alma (transactional rollback) ve izole VM güvenlik duvarı motoru (`VirtualFirewallEngine`, `POST /vm-firewall-test`) eklendi. | Hedef `192.168.0.145` (izole `VirtualFirewallEngine`) + korumalı adresler (`127.0.0.1`, `192.168.0.29`, `192.168.0.1`) + `/api/sentinel/shell` negatif testi. | Kural ekleme sonrası `2` kural (`IN` + `OUT`) aktif olmalı; geri alma sonrası `0` kural kalmalı; `OUT` hatasında `IN` otomatik silinmeli; `/api/sentinel/shell` `404` dönmeli. | **Doğrulandı:** `rulesAfterAdd=2`, `rulesAfterRollback=0`, `rulesAfterOutboundFailureRollback=0`, `/api/sentinel/shell` -> `404`. |
| **IPCast** (`IPCast.exe`) | Bağlantı öncesi gerçek TCP + ITU-T X.224 (`0xE0` Connection Request -> `0xD0` Connection Confirm) RDP el sıkışması (`probe_rdp_x224`), otomatik yeniden bağlanma açık `.rdp` profil üretimi (`autoreconnection enabled:i:1`) ve iki uçlu oturum yaşam döngüsü (`RdpSessionManager`, `POST /lifecycle-test`) eklendi. | İki yerel X.224 TCP RDP uç noktası (`Host A` ve `Host B` dinamik port dinleyicileri). | `Host A` oturumu açılmalı (`Connected`), bağlantı koptuğunda `ConnectionLost` algılanmalı (`drop=1`) ve otomatik yeniden bağlanma/devir ile `Reconnected` (`reconnect=1`) durumuna geçmeli. | **Doğrulandı:** `Connected` -> `ConnectionLost (drop=1)` -> `Reconnected (reconnect=1)` tam yaşam döngüsü geçti. |
| **IPScans LPR Pro** (`IPScans-LPR-Pro.exe`) | Gerçek piksel matrisli PGM (`P5`) ve 24-bit BMP (`BM`) görüntü çözücü, uyarlamalı eşikleme (Otsu/orta-aralık), bağlı sütun karakter segmentasyonu, 5x7 Hamming şablon eşleştirme (`recognize_plate_from_image`), 24 plakalık etiketli doğruluk ölçümü (`evaluate_labeled_ocr_dataset`) ve kapalı çevrim bariyer röle geri bildirimi (`trigger_barrier_with_feedback`) eklendi. | 24 adet etiketli PGM/BMP plaka görüntüsü (gürültü seviyesi `0..20`) + yerel TCP röle denetleyicisi (`OPEN_CONFIRMED` ve `ERROR_OBSTACLE` yanıtları). | Etiketli veri setinde yüksek plaka/karakter doğruluğu ölçülmeli; röleden `OPEN_CONFIRMED` gelmeden bariyer açıldı (`opened=true`) sayılmamalı. | **Doğrulandı:** **24/24 tam plaka eşleşmesi (`%100,0`)**, **197/197 karakter doğruluğu (`%100,0`)**, ortalama güven `%96,9`; `OPEN_CONFIRMED` -> `opened=true`, `ERROR_OBSTACLE` -> `opened=false (RELAY_FAULT)`. |
| **IPScans Cortex** (`IPScans-Cortex.exe`) | Kayıtlı/canlı PGM/BMP video akışı çözücü (`decode_video_frame_bytes`), arka plan çıkarma, normalize ağırlık merkezi (`centroid_pct`), ROI poligon ihlal tespiti (`analyze_recorded_video_stream`), SHA-256 adli zincir doğrulaması (`verify_forensic_event_chain`) ve yalnızca açık anahtarlı (`PUBLIC_KEY_V1/V2`) lisans/CRL/rotasyon denetimi (`enforce_cortex_license`) eklendi. | 6 karelik (`160x120` PGM) kayıtlı kamera akışı (Kare 1 ve 4 ROI dışında hareket, Kare 2 ve 3 ROI içinde ihlal) + `IPS2` lisans ve `CRL1` paketleri. | ROI dışındaki hareket yanlış alarm üretmemeli (`falseAlarms=0`); ROI içindeki kareler SHA-256 zincirli olay üretmeli; ikili dosyada özel anahtar bulunmamalı. | **Doğrulandı:** `decodedFrames=6`, `nonRoiMotionFrames=2`, **`falseAlarms=0`**, `events=2` (`INTRUSION-0001`, `INTRUSION-0002`), `chainVerified=true`; `IPScans-Cortex.exe` ikili taramasında **0 özel anahtar**. |
| **Cortex Admin** (`CortexAdmin.exe`) | Asimetrik RSA-512-SHA256 (`IPS2`) lisans imzalama (`sign_cortex_license_asymmetric`), `CRL1` iptal listesi imzalama (`sign_revocation_list_asymmetric`), anahtar rotasyonu (`cortex-key-2026-v1` -> `cortex-key-2026-v2`) ve uçtan uca 6 senaryolu yaşam döngüsü doğrulaması (`POST /lifecycle-verify`) eklendi. | `LIC-2026-001` (`v1`, `PRO`, 8 kamera) ve `LIC-2026-002` (`v2`, `ULTRA`, 64 kamera) + imzalı `CRL1` paketi. | Geçerli lisans `ACTIVE`, kota aşımı `QUOTA_EXCEEDED`, süre dolumu `EXPIRED`, CRL iptali `REVOKED`, emekli anahtar `KEY_ROTATED_OUT`, yeni rotasyon anahtarı `ACTIVE` dönmeli. | **Doğrulandı:** Altı senaryonun tamamı beklenen durum kodlarıyla %100 eşleşti. |

---

## 3. Teslimat 3 — Web Platformu Rust Geçişi ve Rota Eşdeğerliği (`crates/ipscans-web`)

Canlı Next.js sitesindeki URL’ler, 14 dil (`tr`, `en`, `de`, `fr`, `es`, `it`, `pt`, `nl`, `pl`, `ru`, `ar`, `ja`, `ko`, `zh`), arama, SEO, API’ler, indirmeler ve zamanlanmış işler envantere alınmış ve `crates/ipscans-web` içine taşınarak otomatik rota eşdeğerlik testleriyle (`route_parity_tests`) doğrulanmıştır:

| Rota / Sözleşme | Next.js Kaynağı | Rust Karşılığı (`crates/ipscans-web`) | Eşdeğerlik Testi |
|---|---|---|---|
| `/desktop/tr.html`, `/desktop/en.html` | `public/desktop/{tr,en}.html` | `catalog::render(tr, PUBLISHED, ...)` | `catalog::tests::public_pages_match_the_current_desktop_suite` (**Birebir eşleşme**) |
| `/desktop/apps.json` | `public/desktop/apps.json` | `catalog::apps_json(...)` | `route_parity_tests::seo_search_cron_and_api_routes_match_contract` |
| `/:locale` ve alt rotalar (14 dil × 5 görünüm = 70 URL) | `src/app/[locale]/...` (`i18n/config.ts`) | `render_locale_page(loc, section)` (`canonical` + 14 `hreflang` + `dir="rtl"` Arapça) | `route_parity_tests::all_14_locales_and_subroutes_render_with_canonical_and_hreflang_tags` |
| `/robots.txt` ve `/sitemap.xml` | `src/app/robots.ts`, `src/app/sitemap.ts` | `render_robots_txt()`, `render_sitemap_xml()` | `route_parity_tests::seo_search_cron_and_api_routes_match_contract` |
| `/api/search?q=...` | `src/content/applications.ts` + `network-guides.ts` | `search_index_json(query)` | `route_parity_tests::seo_search_cron_and_api_routes_match_contract` |
| `/api/ip`, `/api/dns`, `/api/whois`, `/api/ports`, `/api/sentinel`, `/api/cortex/packs` | `src/app/api/*/route.ts` | `handle_request` (`ipscans-core` ağ ve protokol motorları) | `route_parity_tests::seo_search_cron_and_api_routes_match_contract` |
| `/api/cron/cleanup` | Zamanlanmış bakım işi (`0 */6 * * *`) | `handle_request("POST", "/api/cron/cleanup", ...)` | `route_parity_tests::seo_search_cron_and_api_routes_match_contract` |

---

## 4. Teslimat 4 — Windows CI, Fiziksel Donanım Sınırları ve Yeni Sürüm (`desktop-audit-2026.11.01-r2`)

### Windows CI ve GitHub Actions Durumu
- `C:\Users\pc\Documents\Codex\2026-11-01\fi\outputs\IPScans-Windows-CI.patch` yaması ve içerdiği `.github/workflows/windows-rust.yml` iş akışı (eski `build-desktop-app.yml`, `build-desktop-app-pro.yml` ve `.NET IPCast` derlemeye çalışan `build-ipcast.yml` iş akışlarını kaldıran, 8 Cargo release EXE üreten, PE `0x8664` + `.rsrc` ikon + `--selftest` + `--install-desktop` SHA-256 doğrulamasını çalıştıran akış) depoya `ci/windows-rust.yml`, `ci/IPScans-Windows-CI.patch` ve yerel CI yürütücüsü `scripts/run-windows-rust-ci.ps1` olarak eklendi.
- **OAuth `workflow` Kapsamı ve GitHub Actions Hesap Faturalandırma Kilidi (`2026-11-01` Canlı API Denetimi):**
  1. `gh api repos/demiirrr25-create/ipscans-depo/check-runs/124794111960/annotations` sorgusunda `d00242e` (`main`) üzerindeki son iş akışının **`The job was not started because your account is locked due to a billing issue.`** açıklamasıyla hiç başlatılamadığı doğrulandı.
  2. Bu makinedeki GitHub CLI / GCM OAuth belirteci yalnızca `'gist', 'read:org', 'repo'` kapsamlarına (`scopes`) sahip olduğundan (`workflow` kapsamı yok), GitHub push sırasında `.github/workflows/` dizinindeki değişiklikleri `refusing to allow an OAuth App to create or update workflow .github/workflows/windows-rust.yml without workflow scope` ile reddetmektedir. Kullanıcı `gh auth refresh -h github.com -s workflow` komutunu çalıştırıp hesap faturalandırma kilidini açtığında `git apply ci/IPScans-Windows-CI.patch` ile iş akışı doğrudan `.github/workflows/windows-rust.yml` altına geçirilebilir.
  3. Bu sürüm (`5.1.0-preview.2`) için tüm CI adımları (`powershell -ExecutionPolicy Bypass -File scripts/run-windows-rust-ci.ps1` ve `npm test`) yerel Windows x64 makinede birebir çalıştırılıp doğrulandı.

### Fiziksel Cihaz Gerektiren Testler ve Açacak Donanımlar
Fiziksel donanım bu test istasyonuna bağlı olmadığı için simülatör/kayıtlı veriyle doğrulanan ve gerçek donanımla açılacak testler şunlardır:
1. **SNMPv2c / LLDP / CDP Yönetilebilir Anahtar Topolojisi (`IPscans+` & `CLI`):** UDP BER/ASN.1 SNMPv2c (`sysDescr`, `sysName`, `ENTITY-MIB`, `LLDP-MIB`, `CDP-MIB`, `Q-BRIDGE-MIB`) istemcisi yerel UDP SNMP ajanıyla doğrulandı. Fiziksel L2/L3 port komşuluk tablosunun canlı anahtardan okunması için **SNMPv2c/v3 ve LLDP açık yönetilebilir bir Ethernet anahtarı (switch)** gerekir.
2. **ONVIF Kamera Canlı RTSP Akışı ve PTZ/HTTPS Yönetimi (`IPscans+` & `Cortex`):** WS-Discovery (`UDP 3702`) XML ayrıştırıcısı, HTTPS sertifika/kimlik doğrulama koruması ve 6 karelik PGM/BMP video akışı çözme/olay üretimi doğrulandı. Canlı H.264/H.265 RTSP kamera akışı için **yerel ağa bağlı fiziksel bir ONVIF/RTSP IP kamera** gerekir.
3. **Fiziksel Bariyer Rölesi ve Kuru Kontak Sensörü (`LPR Pro`):** Kapalı çevrim TCP röle protokolü (`OPEN|<plaka>|PULSE_MS=1500` -> `OPEN_CONFIRMED`) yerel TCP röle emülatörüyle doğrulandı. Fiziksel kapı/bariyer testi için **optokuplör geri bildirimli bir Ethernet/Modbus TCP röle kartı ve manyetikループ/fotosel sensörü** gerekir.
4. **İkinci Fiziksel Windows İstemcisi ile RDP Masaüstü Devri (`IPCast`):** İki uçlu ITU-T X.224 el sıkışması, kopma/yeniden bağlanma durum makinesi ve `.rdp` profil üretimi yerel TCP X.224 dinleyicileriyle doğrulandı. Tam grafiksel RDP oturumu için **aynı yerel ağda Uzak Masaüstü (TCP 3389) etkin ikinci bir Windows bilgisayar veya VM** gerekir.

### Yayımlanan Sürüm Varlıkları (`desktop-audit-2026.11.01-r2` · `5.1.0-preview.2`)

| Uygulama | Dosya Adı | Boyut (Bayt) | SHA-256 Özeti | Canlı İndirme Bağlantısı |
|---|---|---|---|---|
| **IPscans+** | `IPscans-Plus.exe` | `1.035.264` | `c06e87b69bbc9d594947f0a543f082e07bc19eeda10344d504b03955d03379f5` | https://github.com/demiirrr25-create/ipscans-depo/releases/download/desktop-audit-2026.11.01-r2/IPscans-Plus.exe |
| **Network Health Pro** | `ipscans-network-health-pro.exe` | `830.464` | `33cf6db98de857862f7d4d4233fb527d6e9773e680a4d1bf152cbea3831882be` | https://github.com/demiirrr25-create/ipscans-depo/releases/download/desktop-audit-2026.11.01-r2/ipscans-network-health-pro.exe |
| **IPScans Sentinel** | `IPScans-Sentinel.exe` | `996.864` | `8fef4d442928c60c5e86de1858f9eeadb295110bb32a13db9d911d83e993ea35` | https://github.com/demiirrr25-create/ipscans-depo/releases/download/desktop-audit-2026.11.01-r2/IPScans-Sentinel.exe |
| **IPCast** | `IPCast.exe` | `887.808` | `b691ffc4134a332bc81e599e1ef24f27a79de000d94b6891df0313886644f286` | https://github.com/demiirrr25-create/ipscans-depo/releases/download/desktop-audit-2026.11.01-r2/IPCast.exe |
| **IPScans LPR Pro** | `IPScans-LPR-Pro.exe` | `812.544` | `4ce3b12eb702c051d3fa301eedd969b96180a9d88d0f6b2c01bbd73640e5a7de` | https://github.com/demiirrr25-create/ipscans-depo/releases/download/desktop-audit-2026.11.01-r2/IPScans-LPR-Pro.exe |
| **IPScans Cortex** | `IPScans-Cortex.exe` | `1.001.984` | `c4e9901cc1824d6704b2f82aeb271e7ab1f3db3a971424ff3eb9144953cfb0ef` | https://github.com/demiirrr25-create/ipscans-depo/releases/download/desktop-audit-2026.11.01-r2/IPScans-Cortex.exe |
| **Cortex Admin** | `CortexAdmin.exe` | `760.832` | `d3c4b4fab5ebe8f16c070cb528e2766b0db17bb87dac0b0033948bf1a1db0740` | https://github.com/demiirrr25-create/ipscans-depo/releases/download/desktop-audit-2026.11.01-r2/CortexAdmin.exe |
| **IPScans CLI** | `ipscans-network-scanner.exe` | `964.608` | `d767a07f4ca9cdb4b32d00977fb08e8bb6e5f1fefcac3c97922c403b24241ec4` | https://github.com/demiirrr25-create/ipscans-depo/releases/download/desktop-audit-2026.11.01-r2/ipscans-network-scanner.exe |
