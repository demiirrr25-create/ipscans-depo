# LPR Pro 1.1 preview — masaüstü ve yerel AI paneli

Sistem Ayarları → **Yerel kontrol paneli ve AI ayarları** ile tarayıcıyı açın.
Başlat menüsündeki **IPScans LPR Pro Local** kısayolu da girişten sonra paneli açar.
Masaüstünde oluşturulan kullanıcı adı ve parola kullanılır. Tarayıcı oturumu ayrıdır;
masaüstünü kilitlemek tarayıcı oturumunu kapatmaz. Ortak bilgisayarda her iki oturumu da kapatın.
Uygulama kapanınca yerel panel kapanır. Panel yalnızca 127.0.0.1 üzerinde çalışır;
LAN veya internet erişimi açmaz.

Panel son 100 olayı, kamera envanterini, kanıt görsellerini ve düzeltme geçmişini okur.
Operatörler gerekçeli plaka düzeltmesi yapabilir. Orijinal OCR korunur.
Canlı kamera duvarı, kamera kurulumu, kalibrasyon, araç/sakin kayıtları ve kapsamlı
raporlar masaüstündedir. Panel masaüstünün tüm sayfalarının tarayıcı kopyası değildir.

## Ollama / Gemma

1. Yönetici hesabıyla panelde AI desteğini etkinleştirip ayarları kaydedin.
2. Gemma 3 4B veya 12B seçin. **Motoru ve modeli hazırla** düğmesine basın.
3. İlk kullanımda resmi Ollama Windows x64 arşivi indirilir, SHA-256 özeti doğrulanır
   ve kullanıcıya özel dizine hazırlanır. Zaten çalışan yerel Ollama varsa kullanılır.
   Ayrı kurulum sihirbazı veya yönetici yetkisi gerekmez. Runtime ve model ağırlıkları
   EXE içine eklenmemiştir; otomatik hazırlama kodu EXE içindedir. İlk hazırlık internet,
   birkaç GB indirme ve yeterli boş alan gerektirir. 12B daha fazla bellek gerektirir.
4. Görsel kanıtı olan bir geçişi seçip **AI ile görseli incele** düğmesine basın.
   AI bağımsız öneri üretir. Görseli kontrol ederek doğruladığınız plakayı ve gerekçeyi girin.
5. AI desteğini kapatıp kaydettiğinizde yeni işlemler engellenir ve devam eden sonuçlar
   kullanılmaz. Ağ işlemi zaman aşımına kadar sonlanabilir; standart OCR etkilenmez.

İşlemler tek arka plan göreviyle sınırlıdır. Görseller yalnızca 127.0.0.1:11434 adresine
gönderilir. AI sonuçları geçiş izni, bariyer komutu veya otomatik plaka düzeltmesi değildir.
AI önerileri oturum belleğinde tutulur; onaylanan düzeltmeler kullanıcı ve gerekçeyle
veritabanına yazılır. Gerçek saha doğruluğu kamera açısı, aydınlatma ve hareket bulanıklığına
bağlıdır; sentetik doğrulama saha başarı oranı değildir.

API referansı: https://docs.ollama.com/api/generate
Resmi runtime: https://github.com/ollama/ollama/releases
