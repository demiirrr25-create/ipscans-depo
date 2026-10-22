# IPScans büyüme ve kalite planı

## Bu teslimat

Beş uygulama için ortak Signal simge ailesi: koyu yüzey, mavi–camgöbeği–mor çizgiler, küçük boyutlarda okunabilen farklı işaretler. Windows ICO dosyaları 16–256 piksel katmanları içerir; kaynak SVG ve PNG dosyaları depodadır. Açık/koyu temaların yüzey, metin, vurgu ve odak renkleri siteyle uyumlu hale getirildi.

Cortex 1.2 sürüm adayı: 18 yerel ölçüm kuralı, 3 pilot geçiş kuralı, 32 Gemma şablonu; şablon arama, kural kopyalama, olay arama ve inceleme filtresi; üç AI istek aralığı; aynı kare ve bölge için ortak görüntü ön işleme. Yeni masaüstü kısayolu simgeyi EXE kaynağından alır. NVR kanal keşfi, otomatik saat kontrolü ve Ollama hazırlığı korunur.

## 1 — Güvenilir kamera filosu

- ONVIF Media2 ve üreticiye özgü kanal adaptörleri; Hikvision, Dahua ve farklı firmware sürümleri için gerçek cihaz uyumluluk matrisi.
- Kanal başına düşük/yüksek çözünürlük seçimi: analiz alt akıştan, kanıt ana akıştan.
- Saat sapması geçmişi, NTP modu seçimi, saat dilimi yönetimi ve kesinti sonrası yeniden deneme.
- Kamera başına gecikme, düşen kare, tekrar bağlanma ve disk kullanım göstergeleri.

Kabul ölçütü: her desteklenen cihazda keşif → kimlik doğrulama → canlı görüntü → olay kaydı → yeniden bağlantı testi; 72 saatlik kesintisiz deneme ve saat geri okuma doğrulaması.

## 2 — Havuz ve tesis erişim pilotu

- Kart, QR veya turnike sisteminden imzalı geçiş izinleri; tekrar kullanım koruması ve izin/geçiş zaman eşleştirmesi.
- Yetkisiz geçiş şüphesi, ters yön, bir izinle iki kişinin geçişi ve bölge kapasitesi kuralları.
- Mevcut HOG pilotunun yerine lisansı incelenmiş kişi dedektörü ve izleyici; GPU varsa kullanma, CPU geri dönüşü.
- Gündüz/gece, üstten kamera, örtüşme ve kalabalık için ayrı kalibrasyon profilleri.

Kabul ölçütü: insan tarafından etiketlenmiş gerçek saha videolarında yanlış alarm/saat, kaçırılan geçiş oranı ve olay gecikmesi raporu. Güvenlik görevlisinin kaldırılması kararı bu doğrulama olmadan verilmemeli. Kamera tek başına üyelik veya ödeme durumunu belirleyemez.

## 3 — Daha güçlü yerel AI

- Gemma şablon paketleri: perakende, depo, otopark, otel, tesis ve kamera sağlığı.
- Her şablon için örnek olumlu/olumsuz görüntüler ve ölçülmüş başarım; belirsiz durumlarda alarm üretmeme.
- Kullanıcının “doğru / yanlış alarm” geri bildirimi; etiketli yerel değerlendirme arşivi. Geri bildirim otomatik olarak modeli eğitiyor gibi gösterilmemeli.
- Önce ucuz hareket/nesne süzgeci, sonra gerekli bölgelerde Gemma; adil kamera sıralaması, kaynak bütçesi ve ölçülmüş kuyruk gecikmesi.
- Donanıma uygun model önerisi, disk/RAM kontrolü, doğrulanan indirme ve çevrimdışı paket seçeneği.

Kabul ölçütü: aynı test kümesinde önceki sürümle karşılaştırma; 4/16/32 kamera profillerinde CPU, GPU, RAM, kare yaşı ve uçtan uca olay gecikmesi. Bu teslimattaki ön işleme mikro ölçümü tüm uygulamanın hızlanma oranı değildir.

## 4 — Ortak ürün platformu

- Tüm uygulamalarda ortak ayar düzeni, erişilebilir klavye gezinmesi, tema ve dil tercihi.
- İmzalı güncelleme paketleri, geri dönüş, sürüm geçmişi ve yarım kalan indirmeden devam.
- Çoklu tesis envanteri ve rol bazlı yönetim; kamera parolalarının merkezileştirilmesi ayrı güvenlik tasarımı gerektirir.
- Opt-in tanılama paketi: hassas bilgileri ayıklama ve göndermeden önce kullanıcıya gösterme.
- Yeni cihaz kurulum sihirbazı, gerçek donanım kabul testleri ve desteklenen sürümler matrisi.

Kabul ölçütü: temiz Windows 10/11 sanal makinelerinde kurulum, güncelleme, kaldırma ve kısayol testleri; açık/koyu mod, %100–200 ölçekleme ve klavye kullanım testleri.

## Yayın ilkesi

“Dünyanın en iyisi” yerine ölçülebilir hedefler: kararlılık, düşük yanlış alarm, düşük kaynak kullanımı, kolay kurulum ve anlaşılır arayüz. Cortex ve LPR önizleme etiketleri saha kabulü tamamlanana kadar korunur. Yeni Gemma şablonları hazır kural metinleridir; doğrulukları gerçek kamera koşullarında henüz ölçülmüş değildir.
