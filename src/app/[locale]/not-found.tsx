"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { isLocale, type Locale } from "@/i18n/config";
import { toolPath } from "@/lib/tool-routes";
import { PageShell } from "@/components/PageShell";
import { Icon, type IconName } from "@/components/ds/Icon";
import { contentCopy } from "@/components/content/copy";

export default function NotFound() {
  const params = useParams<{ locale?: string }>();
  const locale: Locale = params?.locale && isLocale(params.locale) ? params.locale : "en";
  const t = contentCopy[locale];

  const cards: {
    href: string;
    icon: IconName;
    title: string;
    body: string;
  }[] = [
    {
      href: `/${locale}`,
      icon: "globe",
      title: t.nfHome,
      body: t.nfHomeBody,
    },
    {
      href: toolPath("ipLookup", locale),
      icon: "network",
      title: t.nfTools,
      body: t.nfToolsBody,
    },
    {
      href: `/${locale}/download`,
      icon: "windows",
      title: t.nfProducts,
      body: t.nfProductsBody,
    },
  ];

  return (
    <PageShell
      eyebrow={`${t.nfEyebrow} · 404`}
      title={t.nfTitle}
      subtitle={t.nfMessage}
      actions={
        <>
          <Link href={`/${locale}`} className="btn btn-primary">
            <span>{t.nfHome}</span>
            <Icon name="arrowRight" size={16} className="btn-arrow rtl-flip" />
          </Link>
          <Link href={toolPath("ipLookup", locale)} className="btn btn-secondary">
            <span>{t.nfTools}</span>
          </Link>
          <Link href={`/${locale}/download`} className="btn btn-secondary">
            <span>{t.nfProducts}</span>
          </Link>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="ds-card ds-card-interactive group flex flex-col justify-between p-7 sm:p-8"
          >
            <div>
              <span className="mb-6 grid size-11 place-items-center rounded-[13px] bg-signal-soft text-signal transition-transform duration-500 ease-out-expo group-hover:scale-105">
                <Icon name={card.icon} size={20} />
              </span>
              <h2 className="ds-h4 text-ink transition-colors group-hover:text-signal">
                {card.title}
              </h2>
              <p className="ds-body mt-2.5 text-[0.95rem]">{card.body}</p>
            </div>
            <div className="mt-8 flex items-center gap-1.5 text-sm font-medium text-ink transition-colors group-hover:text-signal">
              <span>{card.title}</span>
              <Icon
                name="arrowRight"
                size={15}
                className="rtl-flip transition-transform duration-300 ease-out-expo group-hover:translate-x-1"
              />
            </div>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}

