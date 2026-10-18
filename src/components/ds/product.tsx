import Image from "next/image";
import type { ReactNode } from "react";
import { Reveal } from "./Reveal";
import { Icon, type IconName } from "./Icon";
import { CopyButton } from "./CopyButton";
import { SignalField } from "./SignalField";

/* ------------------------------------------------------------------------ */
/* SectionHeader                                                             */
/* ------------------------------------------------------------------------ */
export function SectionHeader({
  eyebrow,
  title,
  lead,
  align = "start",
  tone = "light",
  className = "",
  as = "h2",
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  align?: "start" | "center";
  tone?: "light" | "dark";
  className?: string;
  as?: "h1" | "h2" | "h3";
}) {
  const Tag = as;
  return (
    <Reveal className={`${align === "center" ? "mx-auto text-center" : ""} max-w-[760px] ${className}`}>
      {eyebrow && (
        <p className={`ds-eyebrow mb-5 ${tone === "dark" ? "text-on-stage-2" : ""}`}>{eyebrow}</p>
      )}
      <Tag className={`ds-h2 ${tone === "dark" ? "text-on-stage" : "text-ink"}`}>{title}</Tag>
      {lead && (
        <p
          className={`ds-lead mt-5 ${align === "center" ? "mx-auto" : ""} max-w-[640px] ${
            tone === "dark" ? "!text-on-stage-2" : ""
          }`}
        >
          {lead}
        </p>
      )}
    </Reveal>
  );
}

/* ------------------------------------------------------------------------ */
/* ScreenshotFrame — presents a real product screenshot                       */
/* ------------------------------------------------------------------------ */
export function ScreenshotFrame({
  src,
  alt,
  width,
  height,
  priority = false,
  caption,
  tone = "light",
  className = "",
  sizes = "(min-width: 1320px) 1240px, 94vw",
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  caption?: string;
  tone?: "light" | "dark";
  className?: string;
  sizes?: string;
}) {
  return (
    <figure className={className}>
      <div
        className={`overflow-hidden rounded-xl p-2 sm:p-3 ${
          tone === "dark" ? "border border-stage-line bg-white/[0.04]" : "border border-line bg-surface-dim shadow-float"
        }`}
      >
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          priority={priority}
          sizes={sizes}
          className="h-auto w-full rounded-[22px]"
        />
      </div>
      {caption && (
        <figcaption className={`mt-4 text-center text-sm ${tone === "dark" ? "text-on-stage-3" : "text-ink-3"}`}>
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

/* ------------------------------------------------------------------------ */
/* FeatureGrid                                                               */
/* ------------------------------------------------------------------------ */
export type Feature = { title: string; body: string; icon?: IconName };

export function FeatureGrid({
  features,
  columns = 3,
  tone = "light",
}: {
  features: Feature[];
  columns?: 2 | 3;
  tone?: "light" | "dark";
}) {
  return (
    <div className={`grid gap-4 sm:grid-cols-2 ${columns === 3 ? "lg:grid-cols-3" : ""}`}>
      {features.map((f, i) => (
        <Reveal
          key={f.title}
          delay={(i % 3) * 90}
          className={`${tone === "dark" ? "ds-stage-card" : "ds-card ds-card-interactive"} p-7 sm:p-8`}
        >
          {f.icon && (
            <span
              className={`mb-6 grid size-11 place-items-center rounded-[13px] ${
                tone === "dark" ? "bg-white/8 text-white" : "bg-signal-soft text-signal"
              }`}
            >
              <Icon name={f.icon} size={20} />
            </span>
          )}
          <h3 className={`ds-h4 ${tone === "dark" ? "text-on-stage" : "text-ink"}`}>{f.title}</h3>
          <p className={`mt-3 text-[0.98rem] leading-relaxed ${tone === "dark" ? "text-on-stage-2" : "text-ink-2"}`}>
            {f.body}
          </p>
        </Reveal>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* ReleaseDetails — the ONLY place versions / hashes / sizes should appear   */
/* ------------------------------------------------------------------------ */
export type ReleaseFile = {
  label: string; // e.g. "Installer" / "Portable"
  href: string;
  bytes?: number;
  sha256?: string;
};

export function formatBytes(bytes: number) {
  return bytes >= 1_000_000_000
    ? `${(bytes / 1_000_000_000).toFixed(2)} GB`
    : `${(bytes / 1_000_000).toFixed(1)} MB`;
}

export function ReleaseDetails({
  title,
  rows,
  files,
  copyLabel,
  copiedLabel,
  downloadLabel,
  releaseNotes,
}: {
  title: string;
  rows: { label: string; value: string }[];
  files: ReleaseFile[];
  copyLabel: string;
  copiedLabel?: string;
  downloadLabel: string;
  releaseNotes?: { href: string; label: string };
}) {
  return (
    <Reveal className="ds-card-muted p-6 sm:p-10">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr]">
        <div>
          <h3 className="ds-h3 text-ink">{title}</h3>
          <dl className="mt-6">
            {rows.map((r) => (
              <div key={r.label} className="ds-kv">
                <dt>{r.label}</dt>
                <dd>{r.value}</dd>
              </div>
            ))}
          </dl>
          {releaseNotes && (
            <a
              href={releaseNotes.href}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink"
            >
              <span className="ds-link">{releaseNotes.label}</span>
              <Icon name="arrowUpRight" size={15} />
            </a>
          )}
        </div>
        <ul className="grid gap-3">
          {files.map((f) => (
            <li key={f.href} className="rounded-md border border-line bg-surface p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-ink">{f.label}</p>
                  {f.bytes ? <p className="ds-caption mt-0.5">{formatBytes(f.bytes)}</p> : null}
                </div>
                <a href={f.href} className="btn btn-secondary btn-sm">
                  <Icon name="download" size={15} />
                  {downloadLabel}
                </a>
              </div>
              {f.sha256 && (
                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4">
                  <code className="ds-mono min-w-0 flex-1 break-all text-[0.78rem] leading-relaxed text-ink-3">
                    SHA-256 {f.sha256}
                  </code>
                  <CopyButton value={f.sha256} label={copyLabel} copiedLabel={copiedLabel} />
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </Reveal>
  );
}

/* ------------------------------------------------------------------------ */
/* DownloadStage — dark closing CTA panel                                    */
/* ------------------------------------------------------------------------ */
export function DownloadStage({
  title,
  lead,
  children,
  note,
}: {
  title: string;
  lead?: string;
  children: ReactNode; // buttons (btn-inverse / btn-inverse-secondary)
  note?: ReactNode;
}) {
  return (
    <Reveal variant="scale" className="ds-stage px-6 py-20 sm:px-14 sm:py-28 lg:py-36">
      <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-70">
        <SignalField variant="stage" />
      </div>
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(60%_80%_at_20%_50%,rgb(7_8_11/0.92)_30%,transparent_80%)]"
      />
      <div className="max-w-[620px]">
        <h2 className="ds-h2 text-on-stage">{title}</h2>
        {lead && <p className="ds-lead mt-5 !text-on-stage-2">{lead}</p>}
        <div className="mt-10 flex flex-wrap items-center gap-3">{children}</div>
        {note && <div className="mt-6 text-sm text-on-stage-3">{note}</div>}
      </div>
    </Reveal>
  );
}
