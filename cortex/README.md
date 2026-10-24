# IPScans Cortex 2.0.0 Pro — Kurumsal Kamera Zekâsı, Görsel Analitik ve Saha Paketleri

IPScans Cortex 2.0 Pro; yerel RTSP/ONVIF kameraları, çok katmanlı görsel yapay zekâyı, profesyonel 8-tutamaçlı bölge (ROI) ve geçiş hattı (Tripwire) stüdyosunu, canlı termal ısı haritasını, 6 sektörel tek tıkla kurulum paketini ve SHA-256 adli kanıt paketlemeyi tek bir masaüstü kontrol merkezinde birleştirir. Görüntüler buluta aktarılmaz; tüm analiz ve kayıt yerel bilgisayarda gerçekleşir.

---

## Öne Çıkan Teknolojiler (Cortex 2.0 Pro)

1. **Tek Tıkla Sektörel Kurulum Paketleri (`intelligence.py` — 6 Kurumsal Dikey)**:
   Her sektör paketi, önceden kalibre edilmiş analiz bölgesi (`ROI`), zaman çizelgesi ve kural seçimiyle tek kameraya veya tüm kameralara (`ALL`) tek tuşla uygulanabilir; ayrıca her kural doğrudan çizim stüdyosunda önizlenebilir:
   - **🏢 Site & Rezidans Güvenlik Paketi**: Nizamiye tailgating (kaçak geçiş), gece çevre bekleme (loitering), acil çıkış engeli, ortak alan çöp bırakma ve kamera sabotaj koruması.
   - **🏊 Havuz & Sosyal Tesis Paketi**: Kapalı saatlerde havuz ihlali, kapasite/kalabalık aşımı, gece havuz kenarı bekleme ve aydınlatma kaybı izleme.
   - **🏭 Fabrika & Endüstriyel Saha Paketi**: Tehlikeli makine bölgesi girişi, yasak üretim hücresinde insan varlığı (`pro_perimeter`), yaya koridorunda araç/forklift, hat duruşu ve duman/yangın tespiti.
   - **📦 Depo & Lojistik Merkezi Paketi**: Değerli stok alanında bekleme (loitering), yükleme rampası ters yön ihlali, mesai dışı ışık açılması ve kalıcı sahne/palet değişimi.
   - **🛍️ Perakende & Mağaza Analitik Paketi**: Müşteri giriş sayımı, kasa önü kuyruk/kalabalık analizi, reyon/vitrin bekleme (ilgi süresi) ve kasa arkası yetkisiz geçiş.
   - **🏛️ Ofis, Plaza & Bina Yönetimi Paketi**: Turnike/kartlı kapı tailgating tespiti, sunucu/sistem odası yasak bölge ihlali, lobi yoğunluk analizi ve mesai dışı kat hareketi.
2. **Hibrit 3-Katmanlı Yapay Zekâ ve Akıllı Takip**:
   - **12 Deterministik Piksel & Bağlantı Kuralı** (`local_rules.py`): Işık kapanması/açılması, karanlık, aşırı parlaklık, hareket, hareketsizlik, sahne değişimi, netlik kaybı, donmuş görüntü, çevrimdışı/çevrimiçi.
   - **4 Cortex Pro Akıllı Takip Kuralı** (`intelligence.py`): Bölgede uzun süre bekleme (`pro_loitering`), kalabalık/kapasite aşımı (`pro_occupancy`), tailgating / arkadan süzülme (`pro_tailgating`), yasak bölge & sınır ihlali (`pro_perimeter`).
   - **3 Geçiş Kontrol Kuralı** (`access.py`): Giriş çizgisi geçişi, ters yönde geçiş ve tek kullanımlık izinle eşleşmeyen geçiş.
   - **12 Görsel AI Şablonu + Özel Türkçe Prompt (`models.py`)**: Ollama `gemma3:4b` yerel görsel dil modeli.
3. **Profesyonel 8-Tutamaçlı Bölge (ROI) & Geçiş Hattı (Tripwire) Stüdyosu**:
   - Canlı kamera görüntüsü veya 16:9 mimari kalibrasyon sahnesi üzerinde **fareyle yeni bölge çizme**, **bölgeyi ortasından sürükleyip taşıma**, **8 köşe/kenar tutamacıyla hassas boyutlandırma** ve **hazır bölge şablonları** (`Tam Ekran`, `Merkez %70`, `Alt Geçiş`, `Üst Bölge`, `Sol Yarı`, `Sağ Yarı`).
   - **Geçiş Çizgisi (Tripwire) & Doğrulama Bandı**: Çizgiyi doğrudan fareyle sürükleme, iki taraflı doğrulama bandı (`±%`) ve giriş/ihlal yönü okları.
   - **Canlı Termal Isı Haritası (`/api/heatmap/<id>`)** ve **Tam Ekran Matrix Kamera Duvarı (2×2, 3×3, 4×4)**.
4. **SQLite FTS5 "Cortex Copilot" Doğal Dil Arama ve Adli Kanıt Paketi (`forensics.py`)**:
   - *"bugün incelenmemiş"*, *"gece havuz"*, *"tailgating"*, *"bekleme"*, *"kalabalık"* gibi doğal dil sorgularıyla saniyeler içinde olay filtreleme.
   - **Adli Kanıt Paketi (`/api/evidence-bundle/<id>.zip`)**: Olay videosu (`clip.mp4`), olay öncesi (`before.mp4`), olay karesi (`00.jpg`), JSON üstverisi ve `CHAIN_OF_CUSTODY.sha256` bütünlük sertifikasını tek ZIP dosyasında indirir.
   - **CSV Uygunluk Raporu (`/api/events-export`)**: Excel uyumlu UTF-8 BOM rapor çıktısı.
5. **Telegram Bot, HMAC-SHA256 İmzalı Kurumsal Webhook, KVKK Maskeleme ve Ticari Lisanslama**:
   - Olay anında kamera fotoğrafıyla birlikte cep telefonuna **Telegram Bot** bildirimi.
   - Slack, Discord ve SIEM sistemleriyle uyumlu **HMAC-SHA256 (`X-Cortex-Signature-256`)** imzalı webhook.
   - **KVKK / GDPR Gizlilik Maskeleme**: Analiz ve kayıt öncesinde seçili bölgeleri kalıcı olarak karartma veya bulanıklaştırma (`blur` / `solid`).
   - **Ticari Lisans & Denetim İzi**: Starter / Pro / Enterprise imzalı lisans anahtarı üretici/doğrulayıcı (`IPS-ENTERPRISE-...`) ve SHA-256 zincirli denetim günlüğü (`Audit Log`).

---

## Çalıştırma ve Doğrulama

- Sunucuyu başlatmak için: `python cortex/server.py` (veya `--no-browser`, `--portable`, `--self-test`).
- Otomatik test paketini çalıştırmak için:
  ```powershell
  python -m unittest discover -s cortex -p "test*.py"
  ```
