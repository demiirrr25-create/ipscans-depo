import Link from "next/link";
import { locales, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { applications, platformCopy } from "@/content/applications";
import { toolKeys, toolPath, type ToolKey } from "@/lib/tool-routes";
import { PageShell } from "./PageShell";
import { Icon, type IconName } from "./ds/Icon";
import { contentCopy } from "./content/copy";
import { infoCopy } from "./content/info-copy";

export const informationTitles = Object.fromEntries(
  locales.map((l) => [l, infoCopy[l].titles])
) as Record<Locale, { about: string; support: string; contact: string }>;

const toolIcons: Record<ToolKey, IconName> = {
  ipLookup: "globe",
  dns: "dns",
  whois: "search",
  ports: "plug",
  speedTest: "gauge",
};

export function InformationPage({
  locale,
  page,
}: {
  locale: Locale;
  page: "about" | "support" | "contact";
}) {
  const dict = getDictionary(locale);
  const copy = contentCopy[locale];
  const t = infoCopy[locale];
  const pCopy = platformCopy[locale];

  return (
    <PageShell
      eyebrow={t.eyebrow[page]}
      title={t.titles[page]}
      subtitle={t.subtitle}
    >
      {/* Breadcrumb */}
      <div className="mb-12 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-6">
        <nav
          aria-label={copy.breadcrumb}
          className="flex flex-wrap items-center gap-2 text-sm text-ink-3"
        >
          <Link href={`/${locale}`} className="ds-link hover:text-ink">
            {copy.home}
          </Link>
          <Icon name="chevronRight" size={14} className="rtl-flip text-ink-4" />
          <span aria-current="page" className="font-medium text-ink">
            {t.eyebrow[page]}
          </span>
        </nav>

        <div className="flex flex-wrap items-center gap-2">
          {(["about", "support", "contact"] as const).map((p) => (
            <Link
              key={p}
              href={`/${locale}/${p}`}
              aria-current={page === p ? "page" : undefined}
              className={`btn btn-sm ${page === p ? "btn-primary" : "btn-secondary"}`}
            >
              {t.eyebrow[p]}
            </Link>
          ))}
        </div>
      </div>

      {page === "about" && (
        <div className="space-y-16">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="ds-card p-7 sm:p-10">
              <span className="mb-6 grid size-11 place-items-center rounded-[13px] bg-signal-soft text-signal">
                <Icon name="sparkle" size={20} />
              </span>
              <h2 className="ds-h3 text-ink">{t.about.storyTitle}</h2>
              <div className="ds-prose mt-5">
                <p>{t.about.storyP1}</p>
                <p>{t.about.storyP2}</p>
              </div>
            </div>

            <div className="ds-card-muted flex flex-col justify-between p-7 sm:p-10">
              <div>
                <p className="ds-eyebrow">{t.about.limitsEyebrow}</p>
                <h2 className="ds-h3 mt-5 text-ink">{t.about.limitsTitle}</h2>
                <p className="ds-body mt-5 text-[1.02rem] leading-relaxed">
                  {t.about.limitsBody}
                </p>
              </div>
              <div className="mt-8 pt-4">
                <Link href={`/${locale}/download`} className="btn btn-primary">
                  <span>{t.about.exploreCta}</span>
                  <Icon
                    name="arrowRight"
                    size={16}
                    className="btn-arrow rtl-flip"
                  />
                </Link>
              </div>
            </div>
          </div>

          {/* Desktop applications & Web tools overview */}
          <section aria-labelledby="about-ecosystem-heading">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="ds-eyebrow mb-3">{pCopy.eyebrow}</p>
                <h2 id="about-ecosystem-heading" className="ds-h3 text-ink">
                  {pCopy.applications} & {dict.experience.networkTools}
                </h2>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {applications.map((app) => (
                <Link
                  key={app.id}
                  href={`/${locale}/applications/${app.id}`}
                  className="ds-card ds-card-interactive group flex flex-col justify-between p-7 sm:p-8"
                >
                  <div>
                    <div className="flex items-center gap-3.5">
                      <span className="grid size-12 shrink-0 place-items-center rounded-[14px] border border-line bg-surface shadow-soft transition-transform duration-500 ease-out-expo group-hover:scale-105">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={app.icon}
                          alt=""
                          width={26}
                          height={26}
                          className="size-[26px]"
                        />
                      </span>
                      <div>
                        <span className="ds-caption block">
                          {pCopy.applications}
                        </span>
                        <h3 className="ds-h4 text-ink transition-colors group-hover:text-signal">
                          {app.name}
                        </h3>
                      </div>
                    </div>
                    <p className="ds-body mt-4 text-[0.95rem]">
                      {app.description[locale]}
                    </p>
                  </div>
                  <div className="mt-7 flex items-center gap-1.5 text-sm font-medium text-ink transition-colors group-hover:text-signal">
                    <span>{pCopy.details}</span>
                    <Icon
                      name="arrowRight"
                      size={15}
                      className="rtl-flip transition-transform duration-300 ease-out-expo group-hover:translate-x-1"
                    />
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {toolKeys.map((key) => (
                <Link
                  key={key}
                  href={toolPath(key, locale)}
                  className="ds-card ds-card-interactive group flex flex-col justify-between p-6"
                >
                  <div>
                    <span className="mb-4 grid size-10 place-items-center rounded-[12px] bg-signal-soft text-signal">
                      <Icon name={toolIcons[key]} size={18} />
                    </span>
                    <h3 className="font-medium text-ink transition-colors group-hover:text-signal">
                      {dict[key].title}
                    </h3>
                    <p className="ds-caption mt-1.5 line-clamp-2">
                      {dict[key].subtitle}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}

      {page === "support" && (
        <div className="space-y-12">
          {/* Product & Field Notes cards (no version numbers on cards) */}
          <div className="grid gap-5 md:grid-cols-3">
            {applications.map((app) => (
              <Link
                key={app.id}
                href={`/${locale}/applications/${app.id}`}
                className="ds-card ds-card-interactive group flex flex-col justify-between p-7 sm:p-8"
              >
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-[13px] border border-line bg-surface shadow-soft transition-transform duration-500 ease-out-expo group-hover:scale-105">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={app.icon}
                        alt=""
                        width={24}
                        height={24}
                        className="size-6"
                      />
                    </span>
                    <span className="ds-chip">{pCopy.applications}</span>
                  </div>
                  <h2 className="ds-h4 mt-6 text-ink transition-colors group-hover:text-signal">
                    {app.name}
                  </h2>
                  <p className="ds-body mt-3 text-[0.95rem]">
                    {app.description[locale]}
                  </p>
                </div>
                <div className="mt-8 flex items-center gap-1.5 border-t border-line pt-5 text-sm font-medium text-ink transition-colors group-hover:text-signal">
                  <span>{pCopy.details}</span>
                  <Icon
                    name="arrowRight"
                    size={15}
                    className="rtl-flip transition-transform duration-300 ease-out-expo group-hover:translate-x-1"
                  />
                </div>
              </Link>
            ))}

            <Link
              href={`/${locale}/blog`}
              className="ds-card ds-card-interactive group flex flex-col justify-between p-7 sm:p-8"
            >
              <div>
                <div className="flex items-center justify-between gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-[13px] bg-signal-soft text-signal transition-transform duration-500 ease-out-expo group-hover:scale-105">
                    <Icon name="book" size={20} />
                  </span>
                  <span className="ds-chip">{copy.blogEyebrow}</span>
                </div>
                <h2 className="ds-h4 mt-6 text-ink transition-colors group-hover:text-signal">
                  {dict.blog.title}
                </h2>
                <p className="ds-body mt-3 text-[0.95rem]">
                  {dict.blog.subtitle}
                </p>
              </div>
              <div className="mt-8 flex items-center gap-1.5 border-t border-line pt-5 text-sm font-medium text-ink transition-colors group-hover:text-signal">
                <span>{copy.allArticles}</span>
                <Icon
                  name="arrowRight"
                  size={15}
                  className="rtl-flip transition-transform duration-300 ease-out-expo group-hover:translate-x-1"
                />
              </div>
            </Link>
          </div>

          {/* Installation & verification steps */}
          <section className="ds-card-muted p-7 sm:p-10">
            <h2 className="ds-h3 text-ink">{t.support.installTitle}</h2>
            <ol className="mt-8 grid gap-5 md:grid-cols-3">
              {t.support.installSteps.map((step, i) => (
                <li
                  key={i}
                  className="rounded-md border border-line bg-surface p-6"
                >
                  <span className="ds-mono ds-tabular inline-flex size-8 items-center justify-center rounded-full bg-signal-soft text-xs font-semibold text-signal">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="ds-body mt-4 text-[0.95rem] text-ink">{step}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* Frequently asked questions */}
          <section className="ds-card p-7 sm:p-10">
            <h2 className="ds-h3 mb-6 text-ink">{t.support.faqTitle}</h2>
            <div className="divide-y divide-line">
              {dict.experience.faq.map((entry) => (
                <details key={entry.question} className="group py-5 first:pt-2 last:pb-0">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[1.06rem] font-medium text-ink">
                    <span>{entry.question}</span>
                    <Icon
                      name="chevronDown"
                      size={18}
                      className="shrink-0 text-ink-3 transition-transform duration-300 group-open:rotate-180"
                    />
                  </summary>
                  <p className="ds-body mt-3 max-w-[68ch] text-[0.96rem]">
                    {entry.answer}
                  </p>
                </details>
              ))}
            </div>
          </section>
        </div>
      )}

      {page === "contact" && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Technical issues & product feedback */}
          <div className="ds-card flex flex-col justify-between p-7 sm:p-10">
            <div>
              <span className="mb-6 grid size-11 place-items-center rounded-[13px] bg-signal-soft text-signal">
                <Icon name="external" size={20} />
              </span>
              <h2 className="ds-h3 text-ink">{t.contact.issueTitle}</h2>
              <div className="ds-prose mt-5">
                <p>{t.contact.issueP1}</p>
                <p>{t.contact.issueP2}</p>
              </div>
            </div>
            <div className="mt-8 pt-4">
              <a
                href="https://github.com/demiirrr25-create/ipscans-depo/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                <span>{t.contact.issueCta}</span>
                <Icon name="arrowUpRight" size={16} />
              </a>
            </div>
          </div>

          {/* Privacy & legal inquiries */}
          <div className="ds-card-muted flex flex-col justify-between p-7 sm:p-10">
            <div>
              <span className="mb-6 grid size-11 place-items-center rounded-[13px] bg-signal-soft text-signal">
                <Icon name="mail" size={20} />
              </span>
              <h2 className="ds-h3 text-ink">{t.contact.privacyTitle}</h2>
              <p className="ds-body mt-4">{t.contact.privacyBody}</p>

              <dl className="mt-6 rounded-md border border-line bg-surface px-5 py-2">
                <div className="ds-kv">
                  <dt>{dict.footer.privacy}</dt>
                  <dd>
                    <a
                      href="mailto:privacy@ipscans.com"
                      className="ds-link ds-mono text-signal"
                    >
                      privacy@ipscans.com
                    </a>
                  </dd>
                </div>
                <div className="ds-kv">
                  <dt>{dict.footer.terms}</dt>
                  <dd>
                    <a
                      href="mailto:legal@ipscans.com"
                      className="ds-link ds-mono text-signal"
                    >
                      legal@ipscans.com
                    </a>
                  </dd>
                </div>
              </dl>
            </div>

            <div className="mt-8 flex flex-wrap gap-3 pt-4">
              <a
                href="mailto:privacy@ipscans.com"
                className="btn btn-primary"
              >
                <Icon name="mail" size={16} />
                <span>privacy@ipscans.com</span>
              </a>
              <Link
                href={`/${locale}/privacy`}
                className="btn btn-secondary"
              >
                <span>{dict.footer.privacy}</span>
              </Link>
              <Link
                href={`/${locale}/terms`}
                className="btn btn-secondary"
              >
                <span>{dict.footer.terms}</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
