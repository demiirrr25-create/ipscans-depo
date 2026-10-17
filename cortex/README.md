# IPScans Cortex 1.0.0-rc.1 — V1 sürüm adayı

Windows x64 taşınabilir uygulama. AI gerektirmeyen 12 yerel kural türü ve isteğe bağlı görsel Gemma. Bu sürüm Alpha’nın yerini alan V1 kabul adayıdır; uzun süreli çok kameralı saha testleri tamamlanmadan kararlı V1 iddiası taşımaz.

## Güncelleme ve başlangıç
1. Önce eski Cortex konsolunu kapatın, yeni EXE’yi açın. Mevcut şifreli kamera/kural kayıtları korunur. Varsayılan olarak kameralar elle başlatılır; ayarlarda açılışta otomatik başlatmayı seçebilirsiniz. Bu seçenek Windows servisi/Windows açılışı değildir.
2. Kamera ekleyin: tam RTSP adresi veya ayrı kullanıcı/parola alanları. Bağlantıyı test et ile gerçek kare alındığını doğrulayın. Kaydet ve izlemeyi başlat.
3. Kütüphaneden yerel konfigürasyon seçin, kamera ve eşikleri ayarlayın. Bölgeyi yüzde olarak daraltın; bağlı kamerada önizleme üzerinde dikdörtgen görünür. Gün ve saatleri seçin. Kaydedilmiş kuralları düzenleyebilir, duraklatabilir veya silebilirsiniz.
4. Görsel AI istiyorsanız resmi https://ollama.com/download/windows adresinden Ollama’yı kendiniz kurup açın. Cortex > Ayarlar > Gemma’yı kur ve bağla. Birkaç GB indirme yapılır. İlerleme geçerli dosya katmanına aittir. İptal/tekrar deneme desteklenir; Ollama indirilen parçaları tutabilir. Önceden kurulu model tekrar indirilmez.
5. Cortex görsel model yeteneğini ve yapay bir beyaz görüntüye gerçek yanıtını test etmeden “hazır” demez. İlk yükleme RAM/GPU’ya bağlı olarak birkaç dakika sürebilir. Başarısız kurulum mevcut model ayarını değiştirmez. Model testi kamera görüntüsünü kullanmaz.
6. Olay bilgisi hemen arşive girer; klip arka planda hazırlanır. Kayıt başarısızlığı ayrı gösterilir. Örnek kare varsa açılabilir. Masaüstü bildirimleri için panelin açık ve tarayıcı izninin verilmiş olması gerekir.

## Yerel konfigürasyon kütüphanesi
| Sınıf | Kural | Ölçüm / varsayılan |
|---|---|---|
| Aydınlatma | Işık kapandı | Önce aydınlık referans; 45/255 altı, referansın %45’i altı, 9 sn |
| Aydınlatma | Işık açıldı | Önce karanlık referans; 100/255 üstü, 9 sn |
| Aydınlatma | Uzun süre karanlık | 40/255 altı, 60 sn; karanlık başlangıç da izlenir |
| Aydınlatma | Aşırı aydınlık | 225/255 üstü, 15 sn |
| Hareket ve bölge | Bölgede hareket | Piksellerin en az %8’i değişir, 6 sn |
| Hareket ve bölge | Süregelen hareket | Piksellerin en az %8’i değişir, 30 sn |
| Hareket ve bölge | Uzun süre hareketsizlik | Değişim en fazla %2, 300 sn |
| Görüntü sağlığı | Kalıcı sahne değişimi | İlk referansa göre en az %30 piksel değişimi, 30 sn |
| Görüntü sağlığı | Görüntü ayrıntısı kaybı | Başlangıç kenar ayrıntısında en az %50 azalma, 15 sn |
| Görüntü sağlığı | Değişmeyen görüntü | Ortalama gri piksel farkı en fazla 0.3, 120 sn |
| Bağlantı | Kamera bağlantısı kesildi | Görüntü alınamaması, 30 sn |
| Bağlantı | Kamera bağlantısı geri geldi | En az 15 sn doğrulanmış kesinti sonrası 6 sn görüntü |

## Ayarlama ve doğru yorumlama
- Süre, ölçüm koşulunun örneklerde kesintisiz gözlendiği zamandır; ilk başarısız örnek süreyi sıfırlar. Geciken/kaybolan görüntü bu süreye kanıt sayılmaz. Sürekli koşul tek alarm üretir; koşul ortadan kalkıp yeniden oluşunca yeniden hazırlanır. Tekrar bildirim aralığı ayrıca uygulanır.
- Hareket insan/nesne/araç tespiti değildir. Sahne değişimi nesne bırakılmasını veya kamera çevrilmesini ayıramaz. Değişmeyen görüntü gerçek yayın donmasıyla durağan sahneyi ayıramaz. Ayrıntı kaybı örtülme, netlik veya ışık değişimi olabilir. Kısa olaylar örnekler arasında kaçabilir.
- Işık kapanması kızılötesi gece görüşü ve otomatik pozlamadan etkilenir. İlk görüntü aydınlık olmalıdır. Lens örtülmesi de kararma yapabilir. Sabit karanlık ortam için Uzun süre karanlık kullanın.
- Bölge x/y/genişlik/yükseklik yüzde olarak verilir; en az %5 boyut gerekir. Görsel AI da seçili bölgenin kırpılmış karelerini alır. Bağlantı kurallarında bölge kullanılmaz.
- Saatler bilgisayarın yerel saatidir. Başlangıç=bitiş tüm gündür. 22:00–06:00 gibi aralık başladığı güne aittir. Duraklatma, zaman aralığı dışında kalma, bağlantı kaybı veya düzenleme referansı sıfırlayabilir.
- Örnek: depo kapısında hafta içi 22:00–06:00 hareket için “Bölgede hareket”, kapıyı kapsayan bölge, %8 eşik, 6 sn doğrulama seçin. Hareket etmeyen kişi varlığını bu kural belirlemez.
- Örnek: aydınlatması sürekli açık olması gereken koridorda “Uzun süre karanlık”, 40/255 eşik, 60 sn seçin. Işığın açıldığını ayrıca bildirmek için ikinci bir “Işık açıldı” kuralı oluşturun.
- En fazla 512 kural ve sekiz bekleyen/çalışan klip işi; video kuyruğu dolduğunda olay bilgisi korunur, kayıt atlandığı gösterilir. Hatalı RTSP kayıtları olay metnini kaybettirmez.
- Kamera silme bağlı kuralları siler; geçmiş olay arşivi korunur. Sürüm geçişinde eski ışık kuralları eski davranışlarıyla çalışır; düzenleyip kaydetmek süre tabanlı yeni motora geçirir.

## Gerçek işlevler ve sınırlar
- 32 kamera yapılandırma sınırı; her kamera ayrı örnekleme iş parçacığı. Aynı anda en fazla iki model isteği. Bu sayı 32 kamerada gerçek zaman garantisi değildir.
- FFmpeg ile her üç saniyede yaklaşık bir JPEG alınır. Son altı kare tek çoklu-görüntü isteğinde yerel Ollama'ya gönderilir. RTSP yeniden bağlantı maliyeti nedeniyle örnekleme aralığı uzayabilir.
- Canlı panel düşük kare hızlı JPEG önizlemesidir; tam FPS video duvarı değildir.
- ONVIF WS-Discovery aynı yerel ağda cihaz/IP keşfeder. Tam ONVIF medya profil sorgusu, PTZ ve NVR kanal otomasyonu henüz yoktur. RTSP yolu gerektiğinde elle girilir.
- AI modeli isteğe bağlıdır. Ayarlardaki kurulum düğmesi yerel Ollama üzerinden gemma3:4b indirir; EXE içine model ağırlıkları gömülmez. Doğal dil kuralları olasılıksal yorumlanır. Çöp bırakma tespitinin doğruluğu gerçek kamera ve senaryolarla henüz ölçülmedi. Model skoru kalibre edilmiş doğruluk olasılığı değildir.
- Bildirim: panel, panel açıkken izin verilmiş tarayıcı masaüstü bildirimi, isteğe bağlı HTTPS webhook JSON. Klip webhook'a yüklenmez. Telegram/e-posta/SMS entegrasyonu ve uzaktan çok tesis yönetimi henüz yoktur.
- Webhook başarısızlığı arşivde görünür. Üç deneme, 30/60 saniyelik aralıklar ve yeniden başlatmada korunan durum vardır. Idempotency-Key olay kimliğidir; alıcı tekrarları ayıklamalıdır.
- Saklama 1–30 gün; varsayılan 7. Süresi geçmiş kayıtlar başlangıçta, ayar kaydında ve beş dakikada bir temizlenir. 512 MB altı boş alanda yeni video kaydı atlanır; olay bilgisi saklanır. Disk toplam kayıt kotası henüz yoktur.
- Sunucu yalnızca 127.0.0.1:8765 dinler. Oturum cookie'si HttpOnly/SameSite Strict, POST Origin ve Host kontrolleri vardır. Site kameralarınıza doğrudan bağlanmaz.
- Kamera bilgileri `%LOCALAPPDATA%/IPScansCortex/config.enc` içinde Fernet ile şifrelenir; anahtar aynı kullanıcı veri dizinindedir. Windows hesabını/diskini ele geçiren bir saldırgana karşı ayrı bir donanım kasası koruması sağlamaz. FFmpeg süreç argümanları aynı makinedeki ayrıcalıklı kullanıcı tarafından görülebilir. Klipler yerel diskte şifrelenmemiş MP4 dosyalarıdır.
- EXE kod imzalı değildir. FFmpeg dağıtımı imageio-ffmpeg paketinden gelir; lisansları ve kaynak bağlantıları `THIRD_PARTY.md` içindedir.


## Geliştirme ve test
Python 3.14, Windows x64. `pip install -r requirements.txt`; `python server.py`.
Depo kökünde `work` klasörü oluşturduktan sonra `python -m unittest discover -s cortex -p "test_*.py"`.
Paketleme: `pyinstaller --onefile --name IPScans-Cortex --collect-all imageio_ffmpeg --add-data "ui;ui" server.py`.

## Kararlı V1 kabul kapıları
1. Gerçek hedef cihazlarda gündüz/gece/IR ve örtülme/pozlama örnekleriyle eşik kalibrasyonu; olay başına kaçırma/yanlış alarm sayıları.
2. Hedef kamera sayısıyla en az 24 saat kesintisiz çalışma: CPU/RAM, örnekleme gecikmesi, kuyruk doygunluğu ve disk kullanımı kaydı.
3. Kamera/ağ/Ollama kesintileri, uygulama yeniden açılışı ve webhook alıcısı kesintileri için saha kabulü.
4. Görsel AI ile çöp bırakma için gerçek olumlu/olumsuz sahnelerde doğruluk ölçümü. Çok kameralı performans ve kod imzalı dağıtım ayrıca tamamlanmalı.

Bu kapılar geçilmeden “dünyanın en iyisi” veya hatasız güvenlik sistemi iddiası yoktur. RC1 çalışır özellikleri sunar; saha performansını gizlemez.
