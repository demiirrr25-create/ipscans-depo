"use client";

export interface FAQ {
  q: string;
  a: string;
}

interface StoreLocationFAQProps {
  storeTitle: string;
  storeAddress: string;
  onlineNote: string;
  whatsappBtn: string;
  emailBtn: string;
  faqTitle: string;
  faqs: readonly FAQ[];
}

export function StoreLocationFAQ({
  storeTitle,
  storeAddress,
  onlineNote,
  whatsappBtn,
  emailBtn,
  faqTitle,
  faqs,
}: StoreLocationFAQProps) {
  return (
    <section className="my-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
      <div className="p-8 sm:p-10 rounded-3xl border border-amber-500/20 bg-gradient-to-br from-neutral-900 to-neutral-950 shadow-xl">
        <span className="text-xs uppercase tracking-widest text-amber-400 font-semibold">
          Harry Villegas Flagship
        </span>

        <h2 className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-bold text-white mt-2">
          {storeTitle}
        </h2>

        <div className="mt-6 space-y-4 text-neutral-300 text-sm">
          <div className="flex items-start gap-3">
            <span className="text-amber-400 text-lg">📍</span>
            <div>
              <p className="font-semibold text-white">{storeAddress}</p>
              <p className="text-xs text-neutral-400 mt-0.5">{onlineNote}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <span className="text-amber-400 text-lg">✉️</span>
            <p className="font-semibold text-amber-200">info@harryvillegas.shop</p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-4">
          <a
            href="https://wa.me/905000000000?text=Merhaba,%20Harry%20Villegas%20erkek%20giyim%20ve%20ozel%20dikim%20hakkinda%20bilgi%20almak%20istiyorum."
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-w-[180px] inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500 hover:text-black text-emerald-300 font-bold text-xs transition"
          >
            <span>💬</span>
            <span>{whatsappBtn}</span>
          </a>

          <a
            href="mailto:info@harryvillegas.shop"
            className="flex-1 min-w-[180px] inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500 hover:text-black text-amber-300 font-bold text-xs transition"
          >
            <span>✉️</span>
            <span>{emailBtn}</span>
          </a>
        </div>
      </div>

      <div className="p-8 sm:p-10 rounded-3xl border border-white/10 bg-neutral-900/40 backdrop-blur-md">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-white mb-6">
          {faqTitle}
        </h2>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl border border-white/5 bg-white/[0.02] text-left"
            >
              <h3 className="font-bold text-amber-200 text-sm sm:text-base">
                {faq.q}
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-neutral-300 leading-relaxed">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
