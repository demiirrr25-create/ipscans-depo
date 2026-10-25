import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";

export default async function CortexAdminPage({ params }: { params: Promise<{locale:string}> }) {
  const {locale}=await params;
  if (!isLocale(locale)) notFound();
  const tr=locale==="tr";
  const cards=tr ? [
    ["01", "Müşteriler ve istasyonlar", "Müşteri hesaplarını, kamera kapasitesini ve istasyon durumunu yerel yönetim merkezinden takip edin."],
    ["02", "Paketler ve lisanslar", "PRO, PLUS ve ULTRA paketleri; açık kapasite sınırları ve tek bir yönetim akışı."],
    ["03", "Olaylar ve denetim", "Olay arşivi, inceleme durumu ve yönetim kayıtları aynı çalışma düzeninde."],
  ] : [
    ["01", "Customers and stations", "Manage customer accounts, camera capacity and station status in the local administration center."],
    ["02", "Plans and licenses", "PRO, PLUS and ULTRA plans with clear capacity limits and a consistent administration workflow."],
    ["03", "Events and audit", "Event history, review status and administration records in one organized workspace."],
  ];
  return <main className="min-h-screen bg-bg pt-32 pb-24 text-ink">
    <div className="mx-auto max-w-6xl px-6">
      <Link href={`/${locale}/cortex`} className="text-sm text-muted hover:text-ink">← Cortex</Link>
      <div className="mt-12 grid items-center gap-12 lg:grid-cols-[1fr_300px]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-muted">CORTEX / {tr?"YÖNETİM":"ADMINISTRATION"}</p>
          <h1 className="mt-5 max-w-3xl text-5xl font-medium tracking-tight sm:text-6xl">{tr?"Her istasyon için net bir kontrol.":"Clear control for every station."}</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted">{tr?"Hesaplar, lisanslar ve saha operasyonları. Cortex Yönetim Merkezi bilgisayarınızda çalışır; müşteri verileri bu web sayfasında tutulmaz.":"Accounts, licenses and site operations. Cortex Administration runs on your computer; customer data is not stored on this web page."}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="http://127.0.0.1:8766" className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-bg">{tr?"Yerel yönetim merkezini aç ↗":"Open local administration ↗"}</a>
            <a href="http://127.0.0.1:8765" className="rounded-full border border-line px-6 py-3 text-sm font-semibold">{tr?"Cortex istasyonunu aç":"Open Cortex station"}</a>
          </div>
          <p className="mt-4 text-sm text-muted">{tr?"Önce Başlat menüsünden Cortex Yönetim Merkezi’ni çalıştırın. Yönetici girişi yerel uygulamada yapılır.":"First launch Cortex Administration from the Start menu. Sign in within the local application."}</p>
        </div>
        <div className="flex flex-col items-center gap-6 rounded-3xl border border-line bg-surface p-10">
          <Image src="/cortex-mark.svg" alt="Cortex" width={180} height={180} unoptimized priority />
          <span className="text-sm text-muted">{tr?"Bir ipscans.com projesi":"A project by ipscans.com"}</span>
        </div>
      </div>
      <div className="mt-16 grid gap-5 md:grid-cols-3">{cards.map(([number,title,body])=><section key={number} className="rounded-2xl border border-line bg-surface p-7">
        <span className="font-mono text-xs text-muted">{number}</span><h2 className="mt-5 text-xl font-medium">{title}</h2><p className="mt-3 text-sm leading-7 text-muted">{body}</p>
      </section>)}</div>
      <div className="mt-8 rounded-2xl border border-line p-7"><h2 className="font-medium">{tr?"Tarayıcı kapansa da istasyon çalışır.":"Your station keeps running after the browser closes."}</h2><p className="mt-2 text-sm leading-7 text-muted">{tr?"Windows kurulumundaki arka plan başlatma seçeneği, bilgisayar açıldığında izlemeyi kullanıcı oturumu beklemeden başlatır. Bilgisayar açık kalmalıdır; görsel model gerektiren kurallar için Ollama’nın da çalışması gerekir.":"The Windows installer’s background startup option resumes monitoring at boot without waiting for sign-in. The computer must remain on; vision model rules also require Ollama to be running."}</p></div>
    </div>
  </main>;
}
