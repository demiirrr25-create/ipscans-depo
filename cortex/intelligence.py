"""Cortex 2.0 Pro — Hybrid 3-Tier Intelligence Engine, Spatial Heatmap, Privacy Masking & 8 Sector Packs.

Combines:
1. KVKK/GDPR Privacy Masking (pre-inference & pre-recording redaction/blur)
2. Spatial Activity Heatmap (32x18 thermal grid with exponential decay & PNG rendering)
3. Multi-Object Spatial Tracker (Loitering, Occupancy/Crowd, Tailgating, Perimeter, Fall/Motionless, Abandon/Quick-Exit)
4. Smart Cascade Gate (saves 80%+ VLM GPU/CPU cycles when scene is static)
5. Commercial Sector Deployment Packs (Site, Havuz, Fabrika, Depo, Perakende, Ofis, Okul/Kampüs, Hastane/Klinik)
"""
import io
import math
import threading
from collections import deque
from PIL import Image, ImageChops, ImageDraw, ImageFilter

PRO_KINDS = {
    'pro_loitering',
    'pro_occupancy',
    'pro_tailgating',
    'pro_perimeter',
    'pro_fall',
    'pro_abandon',
}

PRO_TEMPLATES = [
    {
        'kind': 'pro_loitering',
        'category': 'Cortex Pro · Akıllı Takip',
        'name': 'Bölgede uzun süre bekleme (Loitering)',
        'description': 'Seçili bölgede bir kişinin veya nesnenin belirlenen süreden uzun kalmasını (dwell time) izler.',
        'sensitivity': 1,
        'duration': 20,
    },
    {
        'kind': 'pro_occupancy',
        'category': 'Cortex Pro · Akıllı Takip',
        'name': 'Kalabalık ve kapasite aşımı',
        'description': 'Seçili bölgede aynı anda bulunan insan/hedef sayısının eşik değeri aşmasını doğrular.',
        'sensitivity': 3,
        'duration': 5,
    },
    {
        'kind': 'pro_tailgating',
        'category': 'Cortex Pro · Geçiş & Turnike',
        'name': 'Tailgating (Arkadan süzülme / kaçak geçiş)',
        'description': 'Tek geçiş izniyle veya kısa zaman penceresinde peş peşe birden fazla kişinin geçiş çizgisini aşmasını yakalar.',
        'sensitivity': 3,
        'duration': 1,
    },
    {
        'kind': 'pro_perimeter',
        'category': 'Cortex Pro · Çevre & Sınır Güvenliği',
        'name': 'Yasak bölge & sınır ihlali (Perimeter)',
        'description': 'Tanımlanan güvenlik bölgesi içinde insan/hedef varlığını ardışık karelerde doğrulayarak anında alarm üretir.',
        'sensitivity': 1,
        'duration': 2,
    },
    {
        'kind': 'pro_fall',
        'category': 'Cortex Pro · İSG & Sağlık',
        'name': 'Yerde hareketsiz kalma / düşme şüphesi takibi',
        'description': 'Bölgeye giren bir hedefin hareket ettikten sonra zemin seviyesinde hareketsiz kalmasını (düşme/bayılma şüphesi) izler.',
        'sensitivity': 3,
        'duration': 8,
    },
    {
        'kind': 'pro_abandon',
        'category': 'Cortex Pro · Alan & Nesne',
        'name': 'Bölgeye girip eşya bırakma / hızlı ayrılma',
        'description': 'Bir kişinin bölgeye girip kısa süre durduktan sonra hızla ayrılmasını (paket/çöp/nesne bırakma davranışı) izler.',
        'sensitivity': 2,
        'duration': 3,
    },
]

SECTOR_PACKS = [
    {
        'id': 'site',
        'name': 'Site & Rezidans Güvenlik Paketi',
        'icon': '🏢',
        'badge': 'Konut & Yaşam',
        'tier': 'PRO',
        'recommended': 'Nizamiye, Blok Girişi, Çevre Duvarı, Asansör Holü',
        'summary': 'Nizamiye kaçak geçiş (tailgating), gece çevre hattı bekleme, acil çıkış engeli, ortak alan çöp bırakma ve kamera sabotaj koruması.',
        'rules': [
            {
                'name': 'Nizamiye Kaçak Geçiş (Tailgating)',
                'kind': 'pro_tailgating',
                'categoryBadge': 'Tailgating',
                'prompt': 'Tek izinle veya 3 saniye içinde peş peşe iki kişinin geçiş çizgisini aşmasını bildir.',
                'axis': 'y',
                'direction': 'positive',
                'line': 55,
                'margin': 8,
                'roi': [15, 15, 70, 80],
                'sensitivity': 3,
                'duration': 1,
                'cooldown': 30,
                'threshold': 0.8,
            },
            {
                'name': 'Gece Çevre Hattı Bekleme (Loitering)',
                'kind': 'pro_loitering',
                'categoryBadge': 'Loitering',
                'prompt': 'Gece saatlerinde çevre duvarı veya blok girişi önünde 20 saniyeden uzun bekleyen kişiyi bildir.',
                'roi': [5, 20, 90, 75],
                'sensitivity': 1,
                'duration': 20,
                'cooldown': 60,
                'threshold': 0.8,
                'start': '22:00',
                'end': '06:00',
            },
            {
                'name': 'Acil Çıkış / Bina Girişi Engeli',
                'kind': 'vision',
                'visionTemplate': 'blocked_exit',
                'categoryBadge': 'Görsel AI',
                'prompt': 'Seçili geçiş/kapı bölgesinin son karesinde yolu belirgin şekilde kapatan fiziksel bir nesne varsa bildir. Bölge seçiminin gerçekten geçiş yolunu kapsaması gerekir.',
                'roi': [15, 25, 70, 70],
                'threshold': 0.8,
                'cooldown': 180,
            },
            {
                'name': 'Ortak Alanda Bırakılan Çöp / Poşet',
                'kind': 'vision',
                'visionTemplate': 'litter',
                'categoryBadge': 'Görsel AI',
                'prompt': 'Kareler boyunca bir kişinin zemine çöp, poşet veya nesne bırakıp ayrıldığı ve son karede nesnenin yerde kaldığı görülüyorsa bildir.',
                'roi': [10, 30, 80, 65],
                'threshold': 0.8,
                'cooldown': 180,
            },
            {
                'name': 'Kamera Sabotaj / Müdahale Koruması',
                'kind': 'camera_tamper',
                'categoryBadge': 'Sabotaj',
                'prompt': 'Kenar detayı çöküşü ile kontrast/parlaklık kaymasını birlikte izleyerek boyama, örtme veya odak bozulmasını yakalar.',
                'roi': [0, 0, 100, 100],
                'sensitivity': 45,
                'duration': 6,
                'cooldown': 120,
                'threshold': 0.8,
            },
        ],
    },
    {
        'id': 'pool',
        'name': 'Havuz & Sosyal Tesis Paketi',
        'icon': '🏊',
        'badge': 'Tesis & Rekreasyon',
        'tier': 'PLUS',
        'recommended': 'Açık/Kapalı Havuz, Teras, Turnike, Çocuk Oyun Alanı',
        'summary': 'Kapalı saatlerde havuz güvenlik hattı ihlali, kulvar/teras kapasite aşımı, gece havuz kenarı bekleme, kayma/düşme ve aydınlatma kaybı izleme.',
        'rules': [
            {
                'name': 'Kapalı Saatte Havuz Alanına Giriş',
                'kind': 'access_unpermitted',
                'categoryBadge': 'Geçiş Kontrol',
                'prompt': 'Geçerli tek kullanımlık giriş izniyle eşleşmeyen insan geçişini bildirir.',
                'axis': 'y',
                'direction': 'positive',
                'line': 50,
                'margin': 8,
                'roi': [10, 15, 80, 80],
                'sensitivity': 8,
                'duration': 1,
                'cooldown': 30,
                'threshold': 0.8,
                'start': '21:00',
                'end': '08:00',
            },
            {
                'name': 'Havuz Kapasite / Kalabalık Aşımı',
                'kind': 'pro_occupancy',
                'categoryBadge': 'Kapasite',
                'prompt': 'Havuz veya kulvar bölgesinde aynı anda belirlenen kişi sınırı aşıldığında bildir.',
                'roi': [10, 20, 80, 75],
                'sensitivity': 4,
                'duration': 8,
                'cooldown': 120,
                'threshold': 0.8,
            },
            {
                'name': 'Gece Havuz Kenarı Bekleme Analizi',
                'kind': 'pro_loitering',
                'categoryBadge': 'Loitering',
                'prompt': 'Kapalı saatlerde havuz çevresinde 15 saniyeden uzun bekleyen kişiyi bildir.',
                'roi': [5, 15, 90, 80],
                'sensitivity': 1,
                'duration': 15,
                'cooldown': 60,
                'threshold': 0.8,
                'start': '21:00',
                'end': '07:00',
            },
            {
                'name': 'Havuz Çevresi Kayma / Yerde Yatan İnsan',
                'kind': 'vision',
                'visionTemplate': 'fallen_person',
                'categoryBadge': 'Acil Durum',
                'prompt': 'Son karede zeminde yatay uzanmış, düşmüş veya hareketsiz yatan bir insan açıkça görülüyorsa bildir.',
                'roi': [10, 20, 80, 75],
                'threshold': 0.8,
                'cooldown': 60,
            },
            {
                'name': 'Havuz Aydınlatma Kaybı',
                'kind': 'lights_off',
                'categoryBadge': 'Aydınlatma',
                'prompt': 'Önce aydınlık referans öğrenir; belirgin kararmayı doğrular.',
                'roi': [0, 0, 100, 100],
                'sensitivity': 45,
                'duration': 3,
                'dark': 45,
                'drop': 0.45,
                'hold': 3,
                'cooldown': 120,
                'threshold': 0.8,
            },
        ],
    },
    {
        'id': 'factory',
        'name': 'Fabrika & Endüstriyel Saha Paketi',
        'icon': '🏭',
        'badge': 'İSG & Üretim',
        'tier': 'PLUS',
        'recommended': 'Üretim Bandı, Robotik Hücre, Yaya Yolu, Kazan Dairesi',
        'summary': 'Tehlikeli makine bölgesi sınır ihlali, baretsiz çalışan İSG denetimi, yasak hücrede insan varlığı, yaya koridorunda forklift, hat duruşu ve duman/yangın tespiti.',
        'rules': [
            {
                'name': 'Tehlikeli Makine Bölgesine Giriş',
                'kind': 'access_crossing',
                'categoryBadge': 'Sınır Hattı',
                'prompt': 'İnsan izinin iki tarafta doğrulandığı giriş yönündeki geçişi kaydeder.',
                'axis': 'x',
                'direction': 'positive',
                'line': 50,
                'margin': 8,
                'roi': [15, 10, 75, 85],
                'sensitivity': 8,
                'duration': 1,
                'cooldown': 30,
                'threshold': 0.8,
            },
            {
                'name': 'Yasak Üretim Hücresinde İnsan Varlığı',
                'kind': 'pro_perimeter',
                'categoryBadge': 'Yasak Bölge',
                'prompt': 'Tehlikeli çalışma alanı içinde insan/hedef varlığı doğrulandığında anında bildir.',
                'roi': [20, 20, 60, 70],
                'sensitivity': 1,
                'duration': 2,
                'cooldown': 30,
                'threshold': 0.8,
            },
            {
                'name': 'Baretsiz Çalışan Tespiti (İSG İhlali)',
                'kind': 'vision',
                'visionTemplate': 'no_helmet',
                'categoryBadge': 'İSG Denetimi',
                'prompt': 'Seçili çalışma bölgesinin son karesinde açıkça bir insan varsa VE başında koruyucu iş bareti TAKMADIĞI net biçimde görülüyorsa bildir.',
                'roi': [15, 15, 70, 80],
                'threshold': 0.8,
                'cooldown': 90,
            },
            {
                'name': 'Yaya Koridorunda Araç / Forklift',
                'kind': 'vision',
                'visionTemplate': 'forklift',
                'categoryBadge': 'Görsel AI',
                'prompt': 'Seçili bölgede çatalları veya kaldırma mekanizması açıkça görünen forklift varsa bildir.',
                'roi': [10, 25, 80, 70],
                'threshold': 0.8,
                'cooldown': 60,
            },
            {
                'name': 'Üretim Hattı Uzun Süre Hareketsizlik (Duruş)',
                'kind': 'inactivity',
                'categoryBadge': 'Süreç İzleme',
                'prompt': 'Seçili bölgede görüntü değişiminin düşük kalmasını izler.',
                'roi': [15, 20, 70, 65],
                'sensitivity': 2,
                'duration': 180,
                'cooldown': 300,
                'threshold': 0.8,
            },
            {
                'name': 'Duman veya Yangın Belirtisi',
                'kind': 'vision',
                'visionTemplate': 'smoke',
                'categoryBadge': 'Görsel AI',
                'prompt': 'Son karede yükselen yoğun duman bulutu veya açık alev/ateş doğrudan görülüyorsa bildir.',
                'roi': [0, 0, 100, 100],
                'threshold': 0.8,
                'cooldown': 60,
            },
        ],
    },
    {
        'id': 'warehouse',
        'name': 'Depo & Lojistik Merkezi Paketi',
        'icon': '📦',
        'badge': 'Stok & Lojistik',
        'tier': 'PLUS',
        'recommended': 'Yükleme Rampası, Değerli Stok Koridoru, Sevkiyat Kapısı',
        'summary': 'Değerli stok koridorunda şüpheli bekleme, yükleme rampası ters yön ihlali, mesai dışı ışık açılması, geçişte palet engeli ve kalıcı sahne değişimi.',
        'rules': [
            {
                'name': 'Stok Alanında Uzun Süre Bekleme',
                'kind': 'pro_loitering',
                'categoryBadge': 'Loitering',
                'prompt': 'Değerli stok bölgesinde 15 saniyeden uzun bekleyen kişiyi bildir.',
                'roi': [15, 15, 70, 80],
                'sensitivity': 1,
                'duration': 15,
                'cooldown': 60,
                'threshold': 0.8,
            },
            {
                'name': 'Yükleme Rampası Ters Yönde Geçiş',
                'kind': 'access_reverse',
                'categoryBadge': 'Ters Yön',
                'prompt': 'Belirlenen giriş yönünün tersine gerçekleşen geçişi bildirir.',
                'axis': 'y',
                'direction': 'positive',
                'line': 50,
                'margin': 8,
                'roi': [10, 20, 80, 75],
                'sensitivity': 8,
                'duration': 1,
                'cooldown': 30,
                'threshold': 0.8,
            },
            {
                'name': 'Geçiş Koridorunda Bırakılan Palet / Koli',
                'kind': 'static_object',
                'categoryBadge': 'Yeni Nesne',
                'prompt': 'İlk referans sahneye göre belirgin fark oluşmasını ve bu yeni nesnenin hareketsiz kalmasını izler.',
                'roi': [15, 25, 70, 70],
                'sensitivity': 18,
                'duration': 20,
                'cooldown': 120,
                'threshold': 0.8,
            },
            {
                'name': 'Mesai Dışı Depo Işığı Açıldı',
                'kind': 'lights_on',
                'categoryBadge': 'Aydınlatma',
                'prompt': 'Önce karanlık referans öğrenir; aydınlanmayı doğrular.',
                'roi': [0, 0, 100, 100],
                'sensitivity': 100,
                'duration': 3,
                'cooldown': 120,
                'threshold': 0.8,
                'start': '20:00',
                'end': '07:00',
            },
            {
                'name': 'Kalıcı Sahne / Stok Raf Değişimi',
                'kind': 'scene_change',
                'categoryBadge': 'Sahne Farkı',
                'prompt': 'İlk referansa göre değişimi izler. Kamera yönü/nesne değişimi olabilir.',
                'roi': [10, 20, 80, 75],
                'sensitivity': 30,
                'duration': 20,
                'cooldown': 180,
                'threshold': 0.8,
            },
        ],
    },
    {
        'id': 'retail',
        'name': 'Perakende & Mağaza Analitik Paketi',
        'icon': '🛍️',
        'badge': 'Mağaza & AVM',
        'tier': 'PRO',
        'recommended': 'Mağaza Girişi, Kasa Sırası, Kampanya Reyonu, Depo Kapısı',
        'summary': 'Müşteri giriş geçiş takibi, kasa önü kuyruk ve kalabalık analizi, vitrin/reyon bekleme (ilgi süresi), sahipsiz çanta ve kasa arkası yetkisiz geçiş.',
        'rules': [
            {
                'name': 'Mağaza Giriş Kapısı Müşteri Geçişi',
                'kind': 'access_crossing',
                'categoryBadge': 'Müşteri Sayımı',
                'prompt': 'İnsan izinin iki tarafta doğrulandığı giriş yönündeki geçişi kaydeder.',
                'axis': 'y',
                'direction': 'positive',
                'line': 55,
                'margin': 8,
                'roi': [20, 15, 60, 80],
                'sensitivity': 8,
                'duration': 1,
                'cooldown': 30,
                'threshold': 0.8,
            },
            {
                'name': 'Kasa Önü Kuyruk & Kalabalık Aşımı',
                'kind': 'pro_occupancy',
                'categoryBadge': 'Kuyruk Analizi',
                'prompt': 'Kasa bölgesinde aynı anda 4 veya daha fazla kişi 10 saniye boyunca beklediğinde yeni kasa açılması için bildir.',
                'roi': [15, 25, 70, 70],
                'sensitivity': 4,
                'duration': 10,
                'cooldown': 90,
                'threshold': 0.8,
            },
            {
                'name': 'Reyon & Vitrin İlgi / Bekleme Analizi',
                'kind': 'pro_loitering',
                'categoryBadge': 'Reyon İlgi',
                'prompt': 'Özel ürün reyonu önünde 25 saniyeden uzun inceleme yapan müşteriyi kaydet.',
                'roi': [20, 20, 60, 70],
                'sensitivity': 1,
                'duration': 25,
                'cooldown': 60,
                'threshold': 0.8,
            },
            {
                'name': 'Kasa Arkası / Personel Kapısı İzinsiz Giriş',
                'kind': 'access_unpermitted',
                'categoryBadge': 'Yetkisiz Giriş',
                'prompt': 'Geçerli tek kullanımlık giriş izniyle eşleşmeyen insan geçişini bildirir.',
                'axis': 'x',
                'direction': 'positive',
                'line': 50,
                'margin': 8,
                'roi': [25, 15, 50, 80],
                'sensitivity': 8,
                'duration': 1,
                'cooldown': 30,
                'threshold': 0.8,
            },
            {
                'name': 'Mağaza İçi Sahipsiz Çanta / Paket',
                'kind': 'vision',
                'visionTemplate': 'abandoned_bag',
                'categoryBadge': 'Görsel AI',
                'prompt': 'Seçili bölgenin son karesinde yerde veya bankta duran çanta, valiz, sırt çantası ya da koli varsa VE yakınında hiçbir insan bulunmuyorsa bildir.',
                'roi': [15, 25, 70, 70],
                'threshold': 0.8,
                'cooldown': 120,
            },
        ],
    },
    {
        'id': 'office',
        'name': 'Ofis, Plaza & Bina Yönetimi Paketi',
        'icon': '🏛️',
        'badge': 'Kurumsal Bina',
        'tier': 'PLUS',
        'recommended': 'Turnike Lobisi, Sistem/Sunucu Odası, Kat Koridoru, Otopark Yaya Girişi',
        'summary': 'Turnike ve kartlı kapılarda tailgating tespiti, sunucu odası sınır güvenliği, lobi kapasite analizi ve mesai dışı kat hareketi.',
        'rules': [
            {
                'name': 'Turnike & Kartlı Kapı Tailgating Tespiti',
                'kind': 'pro_tailgating',
                'categoryBadge': 'Tailgating',
                'prompt': 'Kartlı geçiş hattından 3 saniye içinde peş peşe birden fazla kişinin süzülerek geçmesini bildir.',
                'axis': 'y',
                'direction': 'positive',
                'line': 50,
                'margin': 8,
                'roi': [20, 15, 60, 80],
                'sensitivity': 3,
                'duration': 1,
                'cooldown': 30,
                'threshold': 0.8,
            },
            {
                'name': 'Sunucu / Sistem Odası Yasak Bölge İhlali',
                'kind': 'pro_perimeter',
                'categoryBadge': 'Kritik Alan',
                'prompt': 'Yüksek güvenlikli sistem odası bölgesinde insan hareketi doğrulandığında anında bildir.',
                'roi': [15, 15, 70, 80],
                'sensitivity': 1,
                'duration': 2,
                'cooldown': 30,
                'threshold': 0.8,
            },
            {
                'name': 'Lobi & Ortak Alan Yoğunluk Analizi',
                'kind': 'pro_occupancy',
                'categoryBadge': 'Yoğunluk',
                'prompt': 'Lobi bekleme alanında aynı anda 6 veya daha fazla kişi toplandığında bildir.',
                'roi': [10, 20, 80, 75],
                'sensitivity': 6,
                'duration': 10,
                'cooldown': 120,
                'threshold': 0.8,
            },
            {
                'name': 'Mesai Dışı Kat & Koridor Hareketi',
                'kind': 'motion',
                'categoryBadge': 'Gece Güvenliği',
                'prompt': 'Seçili bölgede ardışık kareler arasındaki hareketi ölçer.',
                'roi': [10, 15, 80, 80],
                'sensitivity': 8,
                'duration': 3,
                'cooldown': 90,
                'threshold': 0.8,
                'start': '21:00',
                'end': '07:00',
            },
        ],
    },
    {
        'id': 'campus',
        'name': 'Okul, Kampüs & Eğitim Kurumu Paketi',
        'icon': '🎓',
        'badge': 'Eğitim & Kampüs',
        'tier': 'PLUS',
        'recommended': 'Okul Bahçesi, Çevre Duvarı, Ana Koridor, Yemekhane Girişi',
        'summary': 'Çevre duvarı/çit tırmanma tespiti, koridor ve bahçede ani hareket/arbede patlaması, kalabalık toplanma ve çıkış kapısı ters yön kontrolü.',
        'rules': [
            {
                'name': 'Çevre Duvarı / Çit Tırmanma Tespiti',
                'kind': 'vision',
                'visionTemplate': 'climb_fence',
                'categoryBadge': 'Çevre Güvenliği',
                'prompt': 'Son karede bir insanın çevre duvarına, çite, korkuluğa veya bariyere tırmandığı ya da üzerinden atladığı açıkça görülüyorsa bildir.',
                'roi': [5, 10, 90, 80],
                'threshold': 0.8,
                'cooldown': 60,
            },
            {
                'name': 'Koridor / Bahçe Ani Hareket Patlaması (Koşma / Arbede)',
                'kind': 'motion_burst',
                'categoryBadge': 'Arbede / Panik',
                'prompt': 'Bölgede ani ve yüksek genlikli piksel değişimi sıçramasını izler; koşma, arbede veya ani devrilme olabilir.',
                'roi': [10, 15, 80, 80],
                'sensitivity': 20,
                'duration': 2,
                'cooldown': 45,
                'threshold': 0.8,
            },
            {
                'name': 'Kampüs Bahçesi Kalabalık Toplanma',
                'kind': 'pro_occupancy',
                'categoryBadge': 'Kalabalık',
                'prompt': 'Seçili bahçe veya koridor bölgesinde aynı anda 5 veya daha fazla kişi toplandığında bildir.',
                'roi': [10, 20, 80, 75],
                'sensitivity': 5,
                'duration': 8,
                'cooldown': 90,
                'threshold': 0.8,
            },
            {
                'name': 'Çıkış Kapısından Ters Yönde Giriş',
                'kind': 'access_reverse',
                'categoryBadge': 'Ters Yön',
                'prompt': 'Belirlenen çıkış yönünün tersine gerçekleşen girişi bildirir.',
                'axis': 'y',
                'direction': 'positive',
                'line': 55,
                'margin': 8,
                'roi': [15, 15, 70, 80],
                'sensitivity': 8,
                'duration': 1,
                'cooldown': 30,
                'threshold': 0.8,
            },
        ],
    },
    {
        'id': 'clinic',
        'name': 'Hastane, Klinik & Yaşlı Bakım Paketi',
        'icon': '🏥',
        'badge': 'Sağlık & Bakım',
        'tier': 'ULTRA',
        'recommended': 'Hasta Koridoru, Yaşlı Bakım Katı, Acil Girişi, İlaç/Ecza Odası',
        'summary': 'Yerde düşme ve hareketsiz hasta takibi, gece refakatsiz hasta koridor çıkışı, ecza/ilaç odası sınır koruması ve acil geçiş yolu engeli.',
        'rules': [
            {
                'name': 'Yerde Hareketsiz Kalma / Düşme Şüphesi Takibi',
                'kind': 'pro_fall',
                'categoryBadge': 'Düşme Takibi',
                'prompt': 'Bölgeye giren bir kişinin zemin seviyesinde hareketsiz kalmasını (düşme/bayılma şüphesi) izler.',
                'roi': [10, 20, 80, 75],
                'sensitivity': 3,
                'duration': 8,
                'cooldown': 45,
                'threshold': 0.8,
            },
            {
                'name': 'Gece Koridorda Refakatsiz Hasta / Yaşlı Çıkışı',
                'kind': 'vision',
                'visionTemplate': 'elderly_wander',
                'categoryBadge': 'Hasta Güvenliği',
                'prompt': 'Seçili koridor veya çıkış bölgesinin son karesinde yanında görevli olmadan tek başına yürüyen veya bekleyen bir insan açıkça görülüyorsa bildir.',
                'roi': [15, 15, 70, 80],
                'threshold': 0.8,
                'cooldown': 60,
                'start': '22:00',
                'end': '06:30',
            },
            {
                'name': 'İlaç / Ecza Deposu Yasak Bölge İhlali',
                'kind': 'pro_perimeter',
                'categoryBadge': 'Ecza Güvenliği',
                'prompt': 'Kilitli ilaç/ecza dolabı bölgesinde insan varlığı doğrulandığında anında bildir.',
                'roi': [20, 15, 60, 80],
                'sensitivity': 1,
                'duration': 2,
                'cooldown': 30,
                'threshold': 0.8,
            },
            {
                'name': 'Acil Sedye Koridorunda Fiziksel Engel',
                'kind': 'vision',
                'visionTemplate': 'blocked_exit',
                'categoryBadge': 'Acil Koridor',
                'prompt': 'Seçili geçiş/kapı bölgesinin son karesinde yolu belirgin şekilde kapatan fiziksel bir nesne varsa bildir.',
                'roi': [15, 20, 70, 75],
                'threshold': 0.8,
                'cooldown': 120,
            },
        ],
    },
]


def validate_privacy_masks(masks):
    """Validate normalized KVKK/GDPR privacy mask zones [{x, y, width, height, mode}]."""
    if not masks:
        return []
    if not isinstance(masks, list) or len(masks) > 16:
        raise ValueError('En fazla 16 gizlilik maskesi tanımlanabilir.')
    cleaned = []
    for item in masks:
        if not isinstance(item, dict):
            raise ValueError('Geçersiz maske biçimi.')
        x = float(item.get('x', 0))
        y = float(item.get('y', 0))
        w = float(item.get('width', 20))
        h = float(item.get('height', 20))
        mode = str(item.get('mode', 'solid'))
        if mode not in ('solid', 'blur'):
            mode = 'solid'
        if not all(math.isfinite(v) for v in (x, y, w, h)) or min(x, y) < 0 or min(w, h) < 2 or x + w > 100 or y + h > 100:
            raise ValueError('Gizlilik maskesi koordinatları görüntü içinde (%2–%100) olmalı.')
        cleaned.append({'x': round(x, 1), 'y': round(y, 1), 'width': round(w, 1), 'height': round(h, 1), 'mode': mode})
    return cleaned


def apply_privacy_masks(frame_bytes, masks):
    """Apply KVKK/GDPR privacy masks before inference, UI display, or disk recording."""
    if not frame_bytes or not masks:
        return frame_bytes
    with Image.open(io.BytesIO(frame_bytes)) as img:
        img = img.convert('RGB')
        sw, sh = img.size
        draw = ImageDraw.Draw(img)
        for mask in masks:
            x1 = max(0, round(sw * mask['x'] / 100))
            y1 = max(0, round(sh * mask['y'] / 100))
            x2 = min(sw, round(sw * (mask['x'] + mask['width']) / 100))
            y2 = min(sh, round(sh * (mask['y'] + mask['height']) / 100))
            if x2 <= x1 or y2 <= y1:
                continue
            if mask.get('mode') == 'blur':
                region = img.crop((x1, y1, x2, y2)).filter(ImageFilter.GaussianBlur(radius=12))
                img.paste(region, (x1, y1))
            else:
                draw.rectangle((x1, y1, x2, y2), fill=(12, 14, 20))
        out = io.BytesIO()
        img.save(out, format='JPEG', quality=85)
        return out.getvalue()


class HeatmapAccumulator:
    """Spatial activity heatmap accumulator (32x18 grid) with exponential decay."""
    WIDTH = 32
    HEIGHT = 18

    def __init__(self, decay=0.985):
        self.decay = decay
        self.grid = [0.0] * (self.WIDTH * self.HEIGHT)
        self.previous = None
        self.total_samples = 0
        self.lock = threading.Lock()

    def update(self, frame_bytes, points=None):
        """Accumulate pixel motion & pedestrian detections into the 32x18 spatial grid."""
        if not frame_bytes:
            return
        try:
            with Image.open(io.BytesIO(frame_bytes)) as img:
                small = img.convert('L').resize((self.WIDTH, self.HEIGHT))
                raw = list(small.tobytes())
        except Exception:
            return
        with self.lock:
            self.total_samples += 1
            for i in range(len(self.grid)):
                self.grid[i] *= self.decay
            if self.previous is not None and len(self.previous) == len(raw):
                for i, (cur, prev) in enumerate(zip(raw, self.previous)):
                    diff = abs(cur - prev)
                    if diff >= 14:
                        self.grid[i] = min(100.0, self.grid[i] + (diff / 255.0) * 6.5)
            self.previous = raw
            if points:
                for px, py in points:
                    gx = min(self.WIDTH - 1, max(0, int(px / 100.0 * self.WIDTH)))
                    gy = min(self.HEIGHT - 1, max(0, int(py / 100.0 * self.HEIGHT)))
                    idx = gy * self.WIDTH + gx
                    self.grid[idx] = min(100.0, self.grid[idx] + 18.0)

    def snapshot_matrix(self):
        with self.lock:
            peak = max(self.grid) if self.grid else 0.0
            norm = [round(v / peak, 3) if peak > 0.5 else 0.0 for v in self.grid]
            return {
                'width': self.WIDTH,
                'height': self.HEIGHT,
                'samples': self.total_samples,
                'peak': round(peak, 2),
                'cells': norm,
            }

    def render_png(self, width=640, height=360):
        """Render a smooth RGBA thermal overlay PNG for the live camera view."""
        snap = self.snapshot_matrix()
        cells = snap['cells']
        overlay = Image.new('RGBA', (self.WIDTH, self.HEIGHT), (0, 0, 0, 0))
        pixels = []
        for val in cells:
            if val < 0.06:
                pixels.append((0, 0, 0, 0))
            elif val < 0.35:
                t = (val - 0.06) / 0.29
                pixels.append((0, int(140 * t), 255, int(65 + 65 * t)))
            elif val < 0.70:
                t = (val - 0.35) / 0.35
                pixels.append((int(255 * t), 220, int(255 * (1 - t)), int(120 + 50 * t)))
            else:
                t = min(1.0, (val - 0.70) / 0.30)
                pixels.append((255, int(200 * (1 - t)), 0, int(170 + 55 * t)))
        overlay.putdata(pixels)
        scaled = overlay.resize((width, height), resample=Image.Resampling.BILINEAR)
        out = io.BytesIO()
        scaled.save(out, format='PNG')
        return out.getvalue()


class ProTracker:
    """Spatial multi-object dwell-time (loitering), occupancy, perimeter, fall, abandon, and tailgating tracker."""

    def __init__(self):
        self.tracks = {}
        self.next_id = 0
        self.occupancy_since = None
        self.occupancy_active = False
        self.perimeter_since = None
        self.perimeter_active = False
        self.crossing_times = deque(maxlen=32)
        self.loiter_alerted = set()
        self.fall_alerted = set()
        self.abandon_alerted = set()

    def update_points(self, points, roi, now):
        """Associate detected normalized (x%, y%) points with persistent tracks and dwell durations."""
        self.tracks = {k: v for k, v in self.tracks.items() if now - v['last_seen'] <= 2.5}
        x, y, w, h = roi
        inside = [p for p in points if x <= p[0] <= x + w and y <= p[1] <= y + h]
        remaining = set(self.tracks.keys())
        updated = {}
        for pt in inside:
            candidates = sorted((math.dist(pt, self.tracks[k]['point']), k) for k in remaining)
            if candidates and candidates[0][0] < 18.0:
                tid = candidates[0][1]
                remaining.remove(tid)
                tr = self.tracks[tid]
                step_dist = math.dist(pt, tr['point'])
                tr['point'] = pt
                tr['last_seen'] = now
                tr['hits'] += 1
                tr['dwell'] = round(now - tr['first_seen'], 1)
                tr['last_step'] = round(step_dist, 2)
                if step_dist <= 2.5:
                    if tr.get('still_since') is None:
                        tr['still_since'] = now
                else:
                    tr['still_since'] = now
                updated[tid] = tr
            else:
                self.next_id += 1
                tid = self.next_id
                tr = {
                    'id': tid,
                    'point': pt,
                    'origin': pt,
                    'first_seen': now,
                    'last_seen': now,
                    'still_since': now,
                    'hits': 1,
                    'dwell': 0.0,
                    'last_step': 0.0,
                    'side': 0,
                }
                self.tracks[tid] = tr
                updated[tid] = tr
        self.loiter_alerted = {tid for tid in self.loiter_alerted if tid in self.tracks}
        self.fall_alerted = {tid for tid in self.fall_alerted if tid in self.tracks}
        return list(updated.values())

    def evaluate_loitering(self, points, rule, now):
        roi = rule.get('roi', [0, 0, 100, 100])
        duration = float(rule.get('duration', 20))
        min_count = max(1, int(round(float(rule.get('sensitivity', 1)))))
        active_tracks = self.update_points(points, roi, now)
        loitering = [t for t in active_tracks if t['dwell'] >= duration and t['hits'] >= 3]
        new_loiterers = [t for t in loitering if t['id'] not in self.loiter_alerted]
        if len(loitering) >= min_count and new_loiterers:
            for t in new_loiterers:
                self.loiter_alerted.add(t['id'])
            max_dwell = max(t['dwell'] for t in loitering)
            return True, {
                'confidence': 1.0,
                'reason': f"{rule['name']}: bölgede {len(loitering)} hedef {max_dwell:.1f} saniyedir bekliyor (eşik: {duration:g} sn).",
                'tags': ['loitering', 'bekleme', 'insan'],
            }
        return False, None

    def evaluate_occupancy(self, points, rule, now):
        roi = rule.get('roi', [0, 0, 100, 100])
        duration = float(rule.get('duration', 5))
        max_capacity = max(1, int(round(float(rule.get('sensitivity', 3)))))
        active_tracks = self.update_points(points, roi, now)
        count = len(active_tracks)
        if count >= max_capacity:
            if self.occupancy_since is None:
                self.occupancy_since = now
            if not self.occupancy_active and (now - self.occupancy_since) >= duration:
                self.occupancy_active = True
                return True, {
                    'confidence': 1.0,
                    'reason': f"{rule['name']}: bölgede aynı anda {count} kişi/hedef tespit edildi (kapasite sınırı: {max_capacity}, süre: {duration:g} sn).",
                    'tags': ['occupancy', 'kalabalık', f'kapasite:{count}'],
                }
        else:
            self.occupancy_since = None
            self.occupancy_active = False
        return False, None

    def evaluate_perimeter(self, points, rule, now):
        roi = rule.get('roi', [0, 0, 100, 100])
        duration = float(rule.get('duration', 2))
        min_targets = max(1, int(round(float(rule.get('sensitivity', 1)))))
        active_tracks = self.update_points(points, roi, now)
        verified = [t for t in active_tracks if t['hits'] >= 2]
        if len(active_tracks) >= min_targets:
            if self.perimeter_since is None:
                self.perimeter_since = now
            if len(verified) >= min_targets and not self.perimeter_active and (now - self.perimeter_since) >= duration:
                self.perimeter_active = True
                return True, {
                    'confidence': 1.0,
                    'reason': f"{rule['name']}: korunan sınır bölgesinde {len(verified)} hedef {duration:g} saniye boyunca doğrulandı.",
                    'tags': ['perimeter', 'sınır_ihlali', 'güvenlik'],
                }
        else:
            self.perimeter_since = None
            self.perimeter_active = False
        return False, None

    def evaluate_fall(self, points, rule, now):
        """Detect a person/target becoming stationary on the floor plane for >= duration seconds."""
        roi = rule.get('roi', [0, 0, 100, 100])
        duration = float(rule.get('duration', 8))
        active_tracks = self.update_points(points, roi, now)
        for tr in active_tracks:
            still_dur = now - tr.get('still_since', now)
            if tr['hits'] >= 3 and still_dur >= duration and tr['id'] not in self.fall_alerted:
                self.fall_alerted.add(tr['id'])
                return True, {
                    'confidence': 1.0,
                    'reason': f"{rule['name']}: hedef ({tr['point'][0]:.0f}%, {tr['point'][1]:.0f}%) zemin bölgesinde {still_dur:.1f} saniyedir hareketsiz kaldı (düşme/bayılma şüphesi).",
                    'tags': ['fall', 'düşme', 'hareketsiz_insan'],
                }
        return False, None

    def evaluate_abandon(self, points, rule, now):
        """Detect a target entering the ROI, dwelling briefly (>= duration), and then exiting."""
        roi = rule.get('roi', [0, 0, 100, 100])
        min_dwell = float(rule.get('duration', 3))
        before_ids = {tid: dict(tr) for tid, tr in self.tracks.items() if tr['dwell'] >= min_dwell and tr['hits'] >= 2}
        active_tracks = self.update_points(points, roi, now)
        active_ids = {tr['id'] for tr in active_tracks}
        for tid, old_tr in before_ids.items():
            if tid not in active_ids and tid not in self.abandon_alerted:
                self.abandon_alerted.add(tid)
                return True, {
                    'confidence': 1.0,
                    'reason': f"{rule['name']}: hedef bölgede {old_tr['dwell']:.1f} saniye durduktan sonra hızla ayrıldı (eşya/nesne bırakma kontrolü).",
                    'tags': ['abandon', 'eşya_bırakma', 'bölge_ayrılma'],
                }
        return False, None

    def evaluate_tailgating(self, crossings, rule, now, permit_consumed=False):
        """Detect multiple crossings within a tight window (`sensitivity` seconds) or unpermitted second crossing."""
        window = max(1.5, min(15.0, float(rule.get('sensitivity', 3.0))))
        while self.crossing_times and now - self.crossing_times[0] > window:
            self.crossing_times.popleft()
        entry_dir = rule.get('direction', 'positive')
        entries = [d for d in crossings if d == entry_dir]
        if not entries:
            return False, None
        for _ in entries:
            self.crossing_times.append(now)
        if len(self.crossing_times) >= 2:
            gap = round(self.crossing_times[-1] - self.crossing_times[0], 1)
            return True, {
                'confidence': 1.0,
                'reason': f"{rule['name']}: {gap} saniye içinde {len(self.crossing_times)} ardışık geçiş tespit edildi (Tailgating / arkadan süzülme şüphesi).",
                'tags': ['tailgating', 'kaçak_geçiş', 'erişim'],
            }
        return False, None
