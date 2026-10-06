import type { Locale } from "@/i18n/config";
import { ipcastProductCopy } from "@/content/ipcast-product";

export function IPCastProductSections({ locale }: { locale: Locale }) {
  const copy = ipcastProductCopy[locale];
  if (!copy) return null;
  return (
    <div className="mx-auto mt-12 max-w-5xl space-y-10">
      <section aria-labelledby="ipcast-whats-new" className="rounded-2xl border border-white/15 bg-white/[0.03] p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">IPCast · Secure Remote Access</p>
        <h2 id="ipcast-whats-new" className="mt-3 text-2xl font-semibold text-white">{copy.newTitle}</h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {copy.changes.map((change, index) => (
            <li key={change} className="rounded-xl border border-white/10 p-5 text-sm leading-7 text-neutral-200">
              <span className="mb-3 block font-mono text-xs text-neutral-500">0{index + 1}</span>{change}
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="ipcast-security" className="grid gap-6 sm:grid-cols-[1fr_2fr]">
        <h2 id="ipcast-security" className="text-2xl font-semibold text-white">{copy.securityTitle}</h2>
        <div className="space-y-4 text-sm leading-7 text-neutral-300">
          <p>{copy.security}</p>
          <p className="rounded-xl border border-white/15 p-4">{copy.limitations}</p>
        </div>
      </section>
      <section aria-labelledby="ipcast-faq">
        <h2 id="ipcast-faq" className="text-2xl font-semibold text-white">{copy.faqTitle}</h2>
        <div className="mt-5 divide-y divide-white/10 rounded-xl border border-white/15 px-5">
          {copy.faq.map((item) => (
            <details key={item.question} className="group py-5">
              <summary className="cursor-pointer text-sm font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">{item.question}</summary>
              <p className="mt-3 text-sm leading-7 text-neutral-400">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
