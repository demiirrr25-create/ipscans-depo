import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { lprRelease } from "@/content/lpr-release";

export async function generateMetadata({params}:{params:Promise<{locale:string}>}):Promise<Metadata>{
  const {locale}=await params;
  if(!isLocale(locale)) return {};
  return {title:"IPScans LPR Pro · Windows Beta",description:locale==="tr"?"Yerel plaka tanıma ve kayıt inceleme için Windows değerlendirme sürümü.":"Windows evaluation release for local plate recognition and record review.",robots:locale==='tr'||locale==='en'?undefined:{index:false,follow:true},alternates:{canonical:`/${locale==='tr'?'tr':'en'}/lpr-pro`,languages:{tr:'/tr/lpr-pro',en:'/en/lpr-pro','x-default':'/en/lpr-pro'}}};
}

export default async function LprPage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;
  if(!isLocale(locale)) notFound();
  const tr=locale==="tr";
  const features=tr?[
    ["Yerel tanıma","Görüntü ve kayıtlı videoda ONNX plaka tespiti, OCR ve ardışık kare uzlaşması. Görüntüler buluta yüklenmez."],
    ["Kayıt ve inceleme","Plaka arama, gerekçeli düzeltme, CSV/XLSX/PDF geçiş raporları, yerel denetim kaydı ve saklama süresi."],
    ["Kontrollü erişim","Yönetici, operatör ve denetçi rolleri; ziyaretçi, personel ve araç izinleri için kural simülatörü."],
    ["Kamera bağlantısı","Hikvision ve Dahua ana akış RTSP profilleri, özel RTSP adresi ve Windows DPAPI ile korunan kamera parolaları."],
    ["Çoklu kamera ve plaka","1–16 kamera için ortak motor, ayrı plaka izleri, kameraya özel okuma bölgesi ve 1–120 dakika gözlem. Kapasite donanıma bağlıdır; saha performansı henüz ölçülmedi."],
    ["Çizgi ve araç geçişleri","Canlı görüntüde birden fazla çizgi oluşturma, taşıma ve kaydetme; araç takibiyle yönlü geçiş kayıtları. Araç modeli ayrıca gerekir. Okunamayan plakalar belirsiz olarak saklanır."],
    ["Otopark defteri","Operatörün doğruladığı giriş/çıkışlar, doluluk, kapasite ve tekrar giriş denetimi. Tanıma sonucu otomatik bariyer komutu oluşturmaz."],
    ["Doğrulanmış yedek","Yöneticiye özel SQLite yedeği ve bütünlük kontrolü. Kamera parolaları aynı Windows kullanıcı hesabına bağlı kalır."],
    ["Ölçülebilir geliştirme","144 regresyon testi; sentetik fotoğraf/video ile paket içi ONNX kontrolü. Benchmark raporlarında gündüz/gece gibi koşulları ayrı değerlendirin."],
  ]:[
    ["Local recognition","ONNX plate detection, OCR and frame consensus on images and recorded video. Images are not uploaded."],
    ["Review and records","Plate search, corrections with reasons, CSV/XLSX/PDF passage exports, local audit log and retention controls."],
    ["Access rules","Administrator, operator and auditor roles; a rule simulator for visitors, staff and vehicle permissions."],
    ["Camera connections","Hikvision and Dahua main-stream RTSP profiles, custom RTSP addresses and Windows DPAPI-protected camera credentials."],
    ["Multiple cameras and plates","Shared inference for 1–16 cameras, separate plate tracks, per-camera regions and 1–120 minute observation. Capacity depends on hardware; field throughput is not yet measured."],
    ["Lines and vehicle passages","Draw, move and save multiple lines on live video; vehicle tracking creates directional passage records. A separate vehicle model is required. Unread plates remain explicitly unresolved."],
    ["Parking ledger","Operator-confirmed entries and exits, occupancy, capacity and anti-passback checks. Recognition does not automatically actuate a barrier."],
    ["Verified backup","Administrator-only SQLite snapshots with integrity verification. Camera credentials remain tied to the same Windows account."],
    ["Measured development","144 regression tests and packaged ONNX checks on synthetic image/video fixtures. Benchmark reports can separate conditions such as day and night."],
  ];
  return <article lang={tr?"tr":"en"} className="mx-auto max-w-6xl px-5 pb-24 pt-24 sm:px-8">
    <Link href={`/${locale}/download`} className="text-sm text-neutral-400 underline underline-offset-4">← {tr?"Tüm uygulamalar":"All applications"}</Link>
    <div className="mt-12 border-b border-white/15 pb-12">
      <p className="font-mono text-xs uppercase tracking-[.22em] text-neutral-400">WINDOWS x64 / {lprRelease.version}</p>
      <h1 className="mt-6 text-5xl font-semibold tracking-tight sm:text-7xl">IPScans LPR Pro<span className="text-neutral-500">.</span></h1>
      <p className="mt-6 max-w-2xl text-xl leading-relaxed text-neutral-300">{tr?"Plakaları yerelde okuyun. Sonuçları inceleyin. Erişim kurallarınızı sınayın.":"Read plates locally. Review results. Test your access rules."}</p>
      <p className="mt-4 max-w-2xl leading-relaxed text-neutral-400">{tr?"Bu sürüm saha değerlendirmesi içindir. Ticari üretim ve fiziksel bariyer kontrolü için hazır değildir. IPscans+ ve IPCast uygulamalarından bağımsızdır.":"This release is for evaluation. It is not ready for commercial production or physical barrier control. It is independent of IPscans+ and IPCast."}</p>
      <div className="mt-8 flex flex-wrap items-center gap-5">
        <a href={lprRelease.url} className="inline-flex min-h-12 items-center rounded-lg bg-white px-6 py-3 font-semibold text-black hover:bg-neutral-200">{tr?"Windows kurulumunu indir · EXE":"Download Windows installer · EXE"} ↓</a>
        <a href={lprRelease.releaseUrl} className="underline underline-offset-4">{tr?"Sürüm notları ve kaynak":"Release notes and source"} ↗</a>
      </div>
      <p className="mt-4 text-sm text-neutral-400">{(lprRelease.bytes/1_000_000).toFixed(1)} MB · {tr?"Windows 10/11 x64 için kullanıcı hesabına kurulan geliştirme önizlemesi. Paket imzalanmamıştır. Python veya Node.js kurulumu gerekmez.":"Development preview installer for Windows 10/11 x64, installed for the current user. The package is unsigned. Python and Node.js are not required."}</p>
    </div>
    <figure className="mt-10 overflow-hidden rounded-xl border border-white/20">
      <Image src="/lpr-pro-preview.png" alt={tr?"LPR Pro 0.5.0.dev4 araç geçişleri ekranında sentetik test kayıtları":"LPR Pro 0.5.0.dev4 passage screen with synthetic test records"} width={1440} height={950} className="h-auto w-full" />
      <figcaption className="border-t border-white/15 p-4 text-sm text-neutral-400">{tr?"Gerçek uygulama ekranı; sentetik örnek. Güven puanı saha doğruluk oranı değildir.":"Actual application screenshot; synthetic example. Confidence is not a field accuracy rate."}</figcaption>
    </figure>
    <div className="mt-14 grid gap-8 sm:grid-cols-2">{features.map(([title,body])=><section key={title} className="border-t border-white/20 pt-6"><h2 className="text-2xl font-semibold">{title}</h2><p className="mt-3 leading-relaxed text-neutral-400">{body}</p></section>)}</div>
    <section className="mt-14 rounded-xl border border-white/20 p-6 sm:p-8"><h2 className="text-2xl font-semibold">{tr?"İlk kullanım":"Getting started"}</h2>
      <ol className="mt-5 list-decimal space-y-3 ps-6 text-neutral-300">
        <li>{tr?"Kurulum EXE dosyasını çalıştırın. Masaüstü kısayolunu seçebilirsiniz; Windows ile otomatik başlatma varsayılan olarak kapalıdır. İlk açılışta en az 12 karakterli yönetici parolası oluşturun.":"Run the installer. A desktop shortcut is optional; Windows sign-in startup is off by default. Create an administrator password of at least 12 characters at first launch."}</li>
        <li>{tr?"Ayarlar bölümünden yaklaşık 11 MB değerlendirme modelini indirin veya kendi model manifestinizi seçin.":"Download about 11 MB of evaluation models in Settings, or select your own model manifest."}</li>
        <li>{tr?"Tanıma bölümünde kullanma izniniz olan bir görüntü veya video seçin. Sonuçları Geçmiş bölümünde inceleyin.":"Select an image or video you are authorized to use in Recognition. Review results in History."}</li>
      </ol>
      <p className="mt-6 text-sm leading-relaxed text-neutral-400">{tr?"Yerel modeller görüntü, video ve canlı RTSP ile kullanılabilir. Ticari onay veya aktivasyon bayrağı istenmez; dosya bütünlüğü SHA-256 ile doğrulanır. Üçüncü taraf model lisans koşulları geçerlidir.":"Local models can process images, video and live RTSP. No commercial approval or activation flag is required; file integrity is verified with SHA-256. Third-party model license terms apply."}</p>
      <p className="mt-4 text-sm leading-relaxed text-neutral-400">{tr?"QtCore DLL uyarısı devam ederse Windows için resmi Microsoft Visual C++ x64 paketini yükleyip uygulamayı yeniden açın.":"If a QtCore DLL error persists, install Microsoft's official Visual C++ x64 package for Windows and reopen the app."} <a className="underline underline-offset-4" href="https://aka.ms/vs/17/release/vc_redist.x64.exe">{tr?"Microsoft x64 paketi":"Microsoft x64 package"} ↗</a></p>
    </section>
    <section className="mt-12"><h2 className="text-2xl font-semibold">{tr?"Cihaz uyumluluğunun sınırları":"Device compatibility limits"}</h2>
      <p className="mt-4 leading-relaxed text-neutral-400">{tr?"Hikvision/Dahua RTSP adres profilleri mevcuttur; fiziksel model ve firmware doğrulaması yapılmadı. IPv4 ONVIF keşfi, profil seçimi ve H.264 ana/alt akış Mercusys MC510 üzerinde sınandı. TCP/UDP canlı görüntü testleri yapıldı. H.265, donanım çözme ve güvenilir MJPEG desteği henüz doğrulanmadı. Kameranın kendi ANPR olaylarını alma tamamlanmadı. Modbus TCP tek bobin okuma ve Shelly RPC durum sorgulama araçları bulunur; röle çıkışı ve otomatik bariyer açma kapalıdır. Tüm Ethernet rölelerle uyumluluk iddiası yoktur.":"Hikvision/Dahua RTSP address profiles are included; physical models and firmware have not been validated. IPv4 ONVIF discovery, profile selection and H.264 main/sub streams were tested with a Mercusys MC510, together with TCP/UDP live preview. H.265, hardware decode and reliable MJPEG are not yet qualified. Native camera ANPR events are not implemented. Read-only Modbus TCP single-coil and Shelly RPC status tools are included; relay actuation and automatic barrier opening are disabled. Universal Ethernet relay compatibility is not claimed."}</p>
      <p className="mt-4 leading-relaxed text-neutral-400">{tr?"Gerçek Türk plaka saha veri seti, gece/yağmur testleri, çok kameralı kapasite ölçümü, imzalı ticari lisans sistemi ve kod imzalama tamamlanmadan üretim sürümü olarak kullanmayın.":"Field validation with real Turkish plates, night/rain tests, multi-camera capacity measurements, signed commercial licensing and code signing remain outstanding."}</p>
    </section>
    <p className="mt-10 break-all border-t border-white/20 pt-6 text-sm text-neutral-400">{tr?"Sürüm dosyası SHA-256":"Release file SHA-256"}: {lprRelease.sha256}</p>
  </article>;
}
