# IPScans Windows ürün ailesi

**1 Kasım 2026 · 5.1.0-preview.1 · Windows x64**

Cargo çalışma alanında ortak çekirdek, sekiz masaüstü yürütülebilir dosyası ve yerel web/katalog aracı bulunuyor. Bu denetimin başlangıç revizyonu `3dd5390`. Ana sitede mevcut Next.js uygulaması çalışıyor. Türkçe ve İngilizce masaüstü kataloğunu Rust üretiyor. Masaüstü ekranlarını Windows’ta Edge veya Chrome çiziyor.

## Windows denetimi

| Uygulama | Bu sürümde sınanan davranış | Kararlı sürümün açık koşulu |
|---|---|---|
| IPscans+ | Kullanıcının seçtiği IPv4 aralığı, ICMP ve TCP, arayüze bağlı ARP kaydı, etiketin saklanması, filtre, SVG görünümü, CSV/JSON/HTML ve yazdırma ekranı. Tek cihazlı yerel testte 127.0.0.1/32 keşfi 1,906 sn sürdü. | Bilinen envanterli ağda çevrimdışı, ICMP’yi engelleyen, birden çok adaptörlü ve VLAN arkasındaki cihazları karşılaştır. LLDP/CDP/SNMP, IPv6 ve eski sürümdeki kamera yönetimini ayrı ayrı doğrula. |
| Network Scanner CLI | JSON çıktısı ve etkileşimli arayüz aynı gerçek TCP dinleyicisini buldu. Geçersiz port hata kodu döndürdü. | DNS ve WHOIS için yerel fixture, süre aşımı ve uluslararası alan adı regresyonları. Komutların stdout ve exit-code sözleşmesini eski tüketicilerle sınama. |
| Network Health Pro | Gerçek ağ geçidine ICMP, dış hedefe TCP, örnekleme başlat/durdur. Tek örnekte 1 ms ve 8 ms ölçüldü. | Adaptör değişimi, VPN, uyku/uyanma, bağlantı kaybı ve 24 saatlik kayıt dayanıklılığı. |
| Sentinel | İzin verilen sabit tanı raporu çalıştı. Eski serbest komut uçları reddedildi. Başsız modda yönetici aracı reddedildi. | Ayrılmış Windows VM’de güvenlik duvarı ekleme/geri alma, kısmi işlem hataları, modem eşleme sahipliği ve gerçek Ollama modeli. Fiziksel sistem üzerinde otomatik müdahale denenmedi. |
| IPCast | TCP erişilebilirliği doğrulandı. Hatalı hedef reddedildi. Uygulama bağlantıyı Windows RDP istemcisine devrediyor. | İki makinede oturum açma, kopma ve yeniden bağlanma. Özel röle, ekran aktarımı, dosya aktarımı ve ses için uçtan uca testlerle ayrı Rust geliştirmesi gerekiyor. |
| LPR Pro | Plaka normalleştirme, yinelenen kayıt, kayıt/sorgu ve yeniden başlatma sonrası kalıcılık. | Etiketli görüntü kümesinde OCR, gerçek kamera akışı ve güvenli röle/kapı geri bildirimi. Metin sorgusu OCR doğrulaması sayılmaz. |
| Cortex | Sekiz sektör paketi, ilgi bölgesi içinde/sınırında nokta testi. Örnek kamera üretimi kaldırıldı. | Yetkili ONVIF/RTSP donanımında keşif, video çözme, olay üretimi ve sahne bazında yanlış alarm ölçümü. |
| Cortex Admin | Kurum sırrıyla lisans imzalama, bağımsız HMAC ve son kullanma tarihi kontrolü, hatalı paketin reddi. | İstemcide lisans uygulama, iptal, yenileme ve anahtar rotasyonu. Dağıtılan istemcilere imzalama sırrı verilmemeli. |

Sekiz ürünün PNG’si ve çok çözünürlüklü ICO’su vardır. Her PE içindeki ikon kareleri kaynağıyla karşılaştırıldı. Katalogdaki görüntüler çalışan uygulamalardan alındı. IPCast görüntüsünde istasyonun yerel kimlikleri gizlendi.

## Geliştirme sırası ve kabul koşulları

1. **P0 · Her sürüm için tekrarlanabilir dağıtım.** Windows CI’da kilitli Cargo derlemesi, öz test, masaüstü kopyasının SHA-256 karşılaştırması ve kurulan EXE’nin yerel HTTP/PNG testi çalışsın. Temiz Windows 10/11 makinelerine OneDrive ile yönlendirilen Masaüstü, farklı indirme klasörü, kullanıcı adı Unicode, mevcut dosya çakışması, standart kullanıcı ve SmartScreen senaryolarını ekle. Kurumsal imzalama sertifikası sağlandığında Authenticode yayın kapısını ekle.
2. **P1 · IP tarayıcı özellik eşdeğerliği.** Laboratuvar yönlendiricisi, yönetilebilir anahtar, iki ağ adaptörü, ONVIF kamera ve bilinen açık/kapalı port matrisi oluştur. Her keşif için kaynak, zaman ve güven düzeyi kaydet. Cihaz türünü kanıt yokken bilinmiyor göster. 1, 16 ve 254 hedefte üçer soğuk/sıcak koşu ölç. Bulunması beklenen cihazlar, yanlış pozitifler, p50/p95 süre, tepe bellek, iptal gecikmesi ve UI yanıt süresini sürüm bazında karşılaştır. Önce ölçüm tabanı oluştur, sonra aynı donanımda performans bütçesini sabitle.
3. **P1 · Kamera, OCR ve uzak oturum.** IPCast için iki istemcili bağlantı ve izin matrisi, LPR için etiketli gündüz/gece görüntüleri ve röle simülatörü, Cortex için kayıtlı akış ve zaman damgalı beklenen olaylar hazırla. Fiziksel geri bildirim alınmadan bir bariyerin açıldığı veya bir kameranın korunduğu gösterilmesin.
4. **P1 · Yetkili işlemler ve lisans.** Sentinel’i standart kullanıcıyla çalıştır; ayrı ve dar yetkili Windows bileşenine yalnız hedefe bağlı işlemler aktar. İptal, eşzamanlı istek, kısmi hata ve geri alma senaryolarını otomatikleştir. İstemciler için açık anahtarla doğrulama, anahtar kimliği ve iptal listesi kullan.
5. **P2 · Üretim sitesinin Rust geçişi.** Önce URL, 14 dil, yönlendirme, SEO, arama, indirme, API ve zamanlanmış iş sözleşmelerini çalışan site üzerinden kaydet. Statik içeriği Rust ile üret, dinamik servisleri taşınabilir Rust ikililerine ayır. Her taşınan rotayı aynı girdilerle iki ortamda karşılaştır. Tüm sözleşmeler ve geri dönüş provası geçince üretim trafiğini geçir.

**Kararlı sürüm ölçütü.** Ürün sorumlusu desteklenen özellik listesini onaylar. Her satırın bir otomatik test veya fiziksel cihaz test kaydı, sürüm kimliği ve ölçümü olur. Eksik donanım veya eksik veriyle test edilen özellik ön sürüm olarak kalır.
