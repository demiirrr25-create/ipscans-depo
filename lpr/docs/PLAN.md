# Uygulanabilir geliştirme planı

## Faz 1 — analiz

- [x] Dünkü sohbet ve son IPScans+ 4.3.0 kaynak kopyasını bul.
- [x] Mevcut masaüstü/web dağıtım sınırlarını incele, bağımsız LPR paketi oluştur.
- [x] Mimari, varsayımlar, model sözleşmesi, lisans ve donanım bağımlılıklarını belgele.
- [ ] Hedef kamera/bariyer modellerini ve kurulum donanımını envanterle.
- [ ] Gerçek ağırlıklar için ticari kullanım ve dağıtım onayını tamamla.

## Faz 2 — başlangıç kesiti (tamamlanmadı)

0.2.0 ilerlemesi: gerçek YOLOv9 ONNX + CCT OCR ile offline fotoğraf ve kayıtlı video zinciri doğrulandı; TR/EN PySide6 test konsolu ve ayrı süreçte iptal çalışıyor. Kamuya açık tek örnek fotoğraf ve sentetik verilerle test yapıldı. Gerçek Türk plaka saha kümesi, kamera erişimi ve ticari ağırlık/veri incelemesi açık; Faz 2 saha kabulü tamamlanmadı.

- [x] Bağımsız Python paketi, CLI ve bağımlılık tanılaması.
- [x] Tek kamera için sınırlı kuyruk ve tekrar bağlantı işçisi.
- [x] Yerel ONNX detector / PaddleOCR adaptör kodu; gerçek modellerle doğrulama bekliyor.
- [x] Sivil TR biçim alt kümesi, ardışık kare kontrolü, düşük güven inceleme durumu, cooldown.
- [x] SQLite geliştirme olayları ve filtreleme.
- [x] Etiketli görüntü benchmark komutu; precision/recall, CER, exact match, p50/p95 inference gecikmesi.
- [ ] Lisansı ve hash'i doğrulanmış detector/OCR dosyalarını temin et; Python 3.11/3.12 ortamında bağımlılık sürümlerini kilitle.
- [ ] Gerçek tek kamera akışında tespit → kırpma → OCR → kayıt zincirini doğrula.
- [ ] Kullanımı izinli, eğitimden bağımsız gündüz/gece/hareket/negatif test kümesini hazırla; araç/oturum bazlı split kullan.
- [ ] Perspektif düzeltme, düşük ışık iyileştirme ve karakter segmentasyonunu ablation benchmark ile değerlendir; fayda ölçülmeden açma.
- [ ] Güven eşiklerini kalibre et; kamera konumu ve plaka piksel boyutu için kurulum kılavuzu oluştur.

Faz 2 kabulü: izinli görüntülerde gerçek modellerle tekrarlanabilir rapor, hata örnekleri, donanım bilgisi, video uçtan uca gecikmesi ve tek kamera soak testi. Mevcut sentetik testler bu kabulün yerine geçmez.

## Faz 3 — çoklu kamera ve kayıt

Kamera başına process, bounded frame IPC, shared inference scheduler, watchdog/backoff; ROI, tracker, sanal çizgi/yön; SQLite migration/repository, PostgreSQL seçeneği; kırpıntı/medya kotası; olay + düzeltme geçmişi; query API/WebSocket. Kabul: 1/4/8/16 kamera yük testlerini donanım bazlı raporla; sürdürülemeyen kapasiteyi arayüzde reddet.

## Faz 4 — bariyer ve yetki

Önce simülatör, deny-by-default policy, whitelist/blacklist/ziyaretçi/abonelik/saat/use-count, komut idempotency, timeout/unknown ve offline senaryoları. Sonra üreticiye özel adaptör ve fiziksel sensör testleri. Replay/cloned-plate riski için ikinci kanıt. Kabul: kara liste, belirsiz yön, stale frame, DB kaybı ve lisans arızası otomatik açma üretmez; fiziksel emniyet bağımsız kalır.

## Faz 5 — ticari Windows arayüzü

PySide6 siyah/beyaz: Dashboard, Live Recognition, Vehicles, Access Control, History, Cameras & Settings; TR/EN; operatör inceleme kuyruğu; klavye/focus/kontrast; DPI; motor ayrı süreç. Gerçek veri yokken sahte başarılı olay gösterme. Kabul: kaynak ve paket UI smoke test, kullanıcı iş akışı ve erişilebilirlik testleri.

## Faz 6 — lisans ve güvenlik

İmzalı offline hak belgesi; rol/oturum yönetimi; DPAPI/Credential Manager; TLS; export izinleri; retention ve yedek imha; audit; SBOM ve dependency/model license kayıtları. Kabul: tahrif edilmiş/bitmiş lisans, saat geri alma, yetkisiz istek ve credential leakage testleri.

## Faz 7 — ürünleştirme

Windows 10/11 x64 hedeflerini bağımlılık desteğine göre kesinleştir; temiz VM kurulumu, uninstall, upgrade/rollback, code signing, signed manifest updates, crash redaction, sürüm notları ve kurulum kılavuzu. CI artifact üretir; yayın işi ayrıdır ve üretim onayı ister.

## Faz 8 — ipscans.com entegrasyonu

Güncel Next.js sürüm belgelerini okuyarak ayrı LPR ürün sayfası, ölçülmüş teknik gereksinimler, sürüm notları, checksum/provenance ve Windows indirmesi. Mevcut IPScans+/IPCast özelliklerini koru. Test edilmemiş kameralar için uyumluluk iddiası yazma. Üretim dağıtımı için açık onay al.

## Test matrisi

| Senaryo | Şimdi | Sonraki doğrulama |
|---|---|---|
| Aynı kare, düşük güven, yanlış biçim, karışık okumalar | otomatik mantık testleri | gerçek video |
| Queue kapasitesi, kopma, yeniden bağlantı, kapatma | sahte capture testleri | Hikvision/Dahua/ONVIF cihaz labı |
| Model checksum, provenance, hatalı tensor sözleşmesi | birim testleri | seçilen gerçek model export'u |
| 1/4/8/16 kamera | ölçülmedi | CPU/GPU/RAM, drop, p50/p95 capture→decision |
| Gece/hareket/kapalı plaka/düşük çözünürlük | ölçülmedi | etiketli holdout precision/recall/CER |
| Bilgisayar restart, DB kaybı, servis toparlanması | yapılmadı | Windows servis/chaos testleri |
| Gerçek bariyer ve emniyet sensörleri | yapılmadı | üretici onaylı fiziksel test |

Hedef FPS, doğruluk yüzdesi ve kamera kapasitesi bu aşamada vaat edilmez.
