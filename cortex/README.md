# IPScans Cortex 0.1.0 Alpha

Yerel IP kamera gözlemi, doğal dille olay kuralları ve kanıt arşivi. Windows x64 taşınabilir EXE, tarayıcıda yerel panel açar. Bu ilk sürüm saha doğrulaması yapılmış bir güvenlik sistemi değildir.

## Kullanım
1. EXE'yi açın. Yerel panel otomatik açılır; konsolu kapatmak servisi kapatır.
2. https://ollama.com üzerinden Ollama kurun. Terminalde `ollama pull gemma3:4b` çalıştırın. Model indirmesi ayrıca internet ve disk alanı gerektirir. Görüntü işleme için yeterli RAM/GPU gerekir; hız gerçek cihazda ölçülmelidir.
3. Kameralar sayfasından ONVIF keşfi yapın veya RTSP adresi girin. Hikvision ve Dahua şablonları bulunur. Model/kanal/yol farklıysa adresi değiştirin. Kullanıcı adı ve parolayı ayrı alanlara yazın.
4. Olay kurallarında kamera seçin, gözlenebilir olayı tarif edin, minimum model skorunu ve tekrar bildirim aralığını ayarlayın.
5. Kamerada izlemeyi başlatın. Ayarlardan model bağlantısını doğrulayın. Yanlış tespitleri gerçek örneklerle değerlendirin.
6. Olay arşivinde tetikleme öncesi örnek kare videosunu ve tetikleme sonrası 12 saniyelik klibi açın. İncelendi olarak işaretleyin.

## Gerçek işlevler ve sınırlar
- 32 kamera yapılandırma sınırı; her kamera ayrı örnekleme iş parçacığı. Aynı anda en fazla iki model isteği. Bu sayı 32 kamerada gerçek zaman garantisi değildir.
- FFmpeg ile her üç saniyede yaklaşık bir JPEG alınır. Son altı kare tek çoklu-görüntü isteğinde yerel Ollama'ya gönderilir. RTSP yeniden bağlantı maliyeti nedeniyle örnekleme aralığı uzayabilir.
- Canlı panel düşük kare hızlı JPEG önizlemesidir; tam FPS video duvarı değildir.
- ONVIF WS-Discovery aynı yerel ağda cihaz/IP keşfeder. Tam ONVIF medya profil sorgusu, PTZ ve NVR kanal otomasyonu henüz yoktur. RTSP yolu gerektiğinde elle girilir.
- AI modeli ayrıca kurulmalıdır; EXE içine büyük model ağırlıkları gömülmez. Doğal dil kuralları olasılıksal yorumlanır. Çöp bırakma tespitinin doğruluğu gerçek kamera ve senaryolarla henüz ölçülmedi. Model skoru kalibre edilmiş doğruluk olasılığı değildir.
- Bildirim: panel, panel açıkken izin verilmiş tarayıcı masaüstü bildirimi, isteğe bağlı HTTPS webhook JSON. Klip webhook'a yüklenmez. Telegram/e-posta/SMS entegrasyonu ve uzaktan çok tesis yönetimi henüz yoktur.
- Webhook başarısızlığı arşivde görünür. Otomatik yeniden deneme kuyruğu henüz yoktur.
- Saklama 1–30 gün; varsayılan 7. Süresi geçmiş kayıtlar başlangıçta, ayar kaydında ve yeni olayda temizlenir. Disk doluluğu izlenmelidir.
- Sunucu yalnızca 127.0.0.1:8765 dinler. Oturum cookie'si HttpOnly/SameSite Strict, POST Origin ve Host kontrolleri vardır. Site kameralarınıza doğrudan bağlanmaz.
- Kamera bilgileri `%LOCALAPPDATA%/IPScansCortex/config.enc` içinde Fernet ile şifrelenir; anahtar aynı kullanıcı veri dizinindedir. Windows hesabını/diskini ele geçiren bir saldırgana karşı ayrı bir donanım kasası koruması sağlamaz. FFmpeg süreç argümanları aynı makinedeki ayrıcalıklı kullanıcı tarafından görülebilir. Klipler yerel diskte şifrelenmemiş MP4 dosyalarıdır.
- EXE kod imzalı değildir. FFmpeg dağıtımı imageio-ffmpeg paketinden gelir; lisansları ve kaynak bağlantıları `THIRD_PARTY.md` içindedir.

## Geliştirme
Python 3.14, Windows x64. `pip install -r requirements.txt`, ardından `python server.py`. Test: `python test_server.py` (çalışma dizininde work klasörü gerekir). Paketleme: `pyinstaller --onefile --name IPScans-Cortex --collect-all imageio_ffmpeg --add-data "ui;ui" server.py`.

## Sonraki aşama
Gerçek asansör veri setiyle olumlu/olumsuz senaryolar, gece/örtülme testleri; sürekli RTSP decoder ve halka kayıt tamponu; nesne izleme + hareket tetikleme; ROI ve zaman çizelgesi; bildirim retry kuyruğu; rol tabanlı uzak erişim; donanım kapasite ölçümü ve imzalı yükleyici.
