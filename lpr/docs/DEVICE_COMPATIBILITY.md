# Kamera ve Ethernet röle uyumluluğu

0.4.1 ticari onay/aktivasyon bayrağı istemez. Model dosyalarının SHA-256 bütünlüğü korunur. Üçüncü taraf lisans koşulları değişmez.

| Cihaz / protokol | Mevcut işlev | Doğrulama durumu |
|---|---|---|
| Hikvision RTSP | Ana akış adres profili, kullanıcı/parola kaçışı, DPAPI saklama, OpenCV/FFmpeg yakalama | Adres oluşturma ve yazılım akışı testli; fiziksel model/firmware test edilmedi |
| Dahua RTSP | Ana akış adres profili, kanal seçimi, aynı yerel motor | Adres oluşturma testli; fiziksel model/firmware test edilmedi |
| Diğer RTSP kameralar | Özel RTSP URL ile ortak yakalama/çıkarım yolu | Codec, akış profili ve firmware bazında saha testi gerekir |
| Hikvision/Dahua PTS kamera içi ANPR | Kamera video akışı kullanılabilir | Kamera içi tanıma olay API'leri henüz entegre değil; RTSP desteği bunlarla eşdeğer değildir |
| Modbus TCP Ethernet röle | Function 01 ile tek bobin durumunu okuma; transaction/unit/cevap doğrulama | Protokol testli; fiziksel cihaz test edilmedi; yazma/darbe gönderimi yok |
| Shelly Gen2+ RPC | Switch.GetStatus ile durum okuma | Parolasız yerel cihaz protokol yolu mevcut; fiziksel cihaz test edilmedi; çıkış sürme yok |
| Nice / ZKT bariyer | Marka bağımsız röle adaptörü için hedef | Kontrol kartı, giriş tipi, kuru kontak bağlantısı ve emniyet sensörleri doğrulanmadan doğrudan uyum iddiası yok |

Ethernet yalnız taşıma katmanıdır: bir röle HTTP, Modbus TCP, üreticiye özel TCP veya farklı bir kimlik doğrulama yöntemi kullanabilir. Aynı RJ45 konektörü, aynı komut seti anlamına gelmez. Yeni adaptör için model/firmware, protokol belgesi, kanal adresi ve cihaz üzerinde zaman sınırlı darbe desteği gerekir.

## Ortalama PC için başlangıç

Bir kamera ve CPU çıkarımıyla başlayın. Hedef okuma bölgesini ayarlayın, gerçek plaka görüntü genişliğini ve gece pozlamasını kontrol edin. Kamera sayısını kademeli artırarak capture-to-decision gecikmesini ve düşen kareleri ölçün. 16 kamera yapılandırma üst sınırıdır; ortalama PC üzerinde 16 kamera performansı ölçülmüş değildir. Gerekirse GPU için uyumlu ONNX Runtime/CUDA dağıtımı ayrıca hazırlanmalıdır; mevcut taşınabilir EXE CPU dağıtımıdır.

## Fiziksel bariyeri devreye alma için eksik bilgiler

Tam kamera modeli/firmware; örnek akış; PC CPU/RAM/GPU; Ethernet röle modeli/protokolü; Nice/ZKT kontrol kartı ve bağlantı kılavuzu; bağımsız araç varlık/fotosel kanıtı. Sadece plaka benzerliği fiziksel geçiş yetkisi oluşturmaz. Bu sürüm hiçbir fiziksel bariyer komutu göndermez.

Kaynaklar: [Hikvision Parking Integration](https://tpp.hikvision.com/tpp/ParkingIntegration), [Dahua trafik dokümanları](https://dahuawiki.com/Traffic), [Modbus protokolü](https://www.modbus.org/specifications), [Shelly Switch RPC](https://shelly-api-docs.shelly.cloud/gen2/ComponentsAndServices/Switch/).
