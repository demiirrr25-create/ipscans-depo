import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { PageShell } from "@/components/PageShell";
import { Icon } from "@/components/ds/Icon";
import { contentCopy } from "./copy";
import { prepareLegalContent } from "./format";

export function LegalDocument({
  locale,
  kind,
  rawHtml,
}: {
  locale: Locale;
  kind: "privacy" | "terms";
  rawHtml: string;
}) {
  const dict = getDictionary(locale);
  const copy = contentCopy[locale];
  const title = kind === "privacy" ? dict.footer.privacy : dict.footer.terms;
  const { html, headings, lastUpdated } = prepareLegalContent(rawHtml, locale);

  return (
    <PageShell
      eyebrow={copy.legal}
      title={title}
      subtitle={lastUpdated ? `${copy.lastUpdated}: ${lastUpdated}` : undefined}
      bodyClassName="ds-container-narrow pb-24 sm:pb-32"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-6">
        <nav aria-label={copy.breadcrumb} className="flex flex-wrap items-center gap-2 text-sm text-ink-3">
          <Link href={`/${locale}`} className="ds-link hover:text-ink">
            {copy.home}
          </Link>
          <Icon name="chevronRight" size={14} className="rtl-flip text-ink-4" />
          <span aria-current="page" className="font-medium text-ink">
            {title}
          </span>
        </nav>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/${locale}/privacy`}
            aria-current={kind === "privacy" ? "page" : undefined}
            className={`btn btn-sm ${kind === "privacy" ? "btn-primary" : "btn-secondary"}`}
          >
            {dict.footer.privacy}
          </Link>
          <Link
            href={`/${locale}/terms`}
            aria-current={kind === "terms" ? "page" : undefined}
            className={`btn btn-sm ${kind === "terms" ? "btn-primary" : "btn-secondary"}`}
          >
            {dict.footer.terms}
          </Link>
        </div>
      </div>

      {headings.length > 0 && (
        <nav
          aria-label={copy.onThisPage}
          className="ds-card-muted mt-10 p-6 sm:p-8"
        >
          <p className="ds-eyebrow mb-5">{copy.onThisPage}</p>
          <ol className="grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
            {headings.map((h, i) => (
              <li key={h.id}>
                <a
                  href={`#${h.id}`}
                  className="group flex items-baseline gap-3 py-1 text-sm text-ink-2 transition-colors hover:text-signal"
                >
                  <span className="ds-mono ds-tabular text-xs text-ink-3 transition-colors group-hover:text-signal">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="ds-link font-medium text-ink group-hover:text-signal">
                    {h.title}
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}

      <article
        className="ds-prose mt-12 max-w-[68ch]"
        // Static content authored in src/content/legal.ts, not user input.
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </PageShell>
  );
}
