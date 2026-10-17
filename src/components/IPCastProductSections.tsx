import { uiText } from "@/i18n/ui";
import type { Locale } from "@/i18n/config";
import { ipcastProductCopy } from "@/content/ipcast-product";

export function IPCastProductSections({ locale }: { locale: Locale }) {
  const copy = ipcastProductCopy[locale];
  if (!copy) return null;
  return (
    <div className="mx-auto mt-12 max-w-5xl space-y-10">
      <section
        aria-labelledby="ipcast-whats-new"
        className="agy-surface-card p-7 sm:p-10"
      >
        <p className="agy-eyebrow">
          IPCast · {uiText(locale, "Secure Remote Access", "Güvenli Uzak Erişim")}
        </p>
        <h2 id="ipcast-whats-new" className="heading-4 mt-4">
          {copy.newTitle}
        </h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {copy.changes.map((change, index) => (
            <li
              key={change}
              className="rounded-2xl border border-white/10 bg-[#18191e] p-6 text-sm leading-7 text-neutral-200"
            >
              <span className="mb-3 block font-mono text-xs text-neutral-400">
                0{index + 1}
              </span>
              {change}
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="ipcast-security"
        className="agy-surface-card grid gap-6 p-7 sm:grid-cols-[1fr_2fr] sm:p-10"
      >
        <h2 id="ipcast-security" className="heading-5">
          {copy.securityTitle}
        </h2>
        <div className="space-y-4 text-sm leading-7 text-neutral-300">
          <p>{copy.security}</p>
          <p className="rounded-2xl border border-white/15 bg-[#18191e] p-5">
            {copy.limitations}
          </p>
        </div>
      </section>

      <section aria-labelledby="ipcast-faq" className="agy-surface-card p-7 sm:p-10">
        <h2 id="ipcast-faq" className="heading-5">
          {copy.faqTitle}
        </h2>
        <div className="mt-6 divide-y divide-white/10">
          {copy.faq.map((item) => (
            <details key={item.question} className="group py-5">
              <summary className="cursor-pointer text-base font-medium text-white">
                {item.question}
              </summary>
              <p className="mt-3 text-sm leading-7 text-neutral-300">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
