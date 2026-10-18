import { localeTags, type Locale } from "@/i18n/config";

export type TocHeading = { id: string; title: string };

/** Replaces `{key}` placeholders in a localized template. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match
  );
}

/**
 * Formats an ISO `YYYY-MM-DD` date for the locale. Parsed and rendered in UTC
 * so server and client output are identical (no hydration drift).
 */
export function formatDate(iso: string, locale: Locale, month: "long" | "short" = "long"): string {
  const date = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(localeTags[locale], {
    year: "numeric",
    month,
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

const entities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'", nbsp: " " };

/** Strips tags and decodes the few entities used in code-authored content. */
export function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (_, name: string) => entities[name] ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Adds stable ids to every `<h2>` in static, code-authored HTML and returns
 * the headings for a table of contents. Existing ids are preserved.
 */
export function withHeadingIds(html: string, prefix = "section"): { html: string; headings: TocHeading[] } {
  const headings: TocHeading[] = [];
  const out = html.replace(/<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/g, (_match, attrs: string | undefined, inner: string) => {
    const existing = attrs?.match(/\sid="([^"]+)"/)?.[1];
    const id = existing ?? `${prefix}-${headings.length + 1}`;
    headings.push({ id, title: plainText(inner) });
    const rest = (attrs ?? "").replace(/\sid="[^"]*"/, "");
    return `<h2 id="${id}"${rest}>${inner}</h2>`;
  });
  return { html: out, headings };
}

/**
 * Extracts a leading `<p><em>Last updated…</em></p>` line from legal HTML so it
 * can be surfaced in the page header, and attaches anchor IDs to `<h2>` tags.
 */
export function prepareLegalContent(
  rawHtml: string,
  locale: Locale
): { html: string; headings: TocHeading[]; lastUpdated: string | null } {
  let body = rawHtml;
  let lastUpdated: string | null = null;

  const leadMatch = rawHtml.match(/^\s*<p>\s*<em>([\s\S]*?)<\/em>\s*<\/p>/i);
  if (leadMatch) {
    const rawNote = plainText(leadMatch[1]);
    const isoMatch = rawNote.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    const dmyMatch = rawNote.match(/\b(\d{2})[./-](\d{2})[./-](\d{4})\b/);
    if (isoMatch) {
      lastUpdated = formatDate(isoMatch[1], locale, "long");
    } else if (dmyMatch) {
      lastUpdated = formatDate(`${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`, locale, "long");
    } else if (rawNote.includes("2026") && rawNote.includes("27")) {
      lastUpdated = formatDate("2026-09-27", locale, "long");
    } else {
      lastUpdated = rawNote;
    }
    body = rawHtml.slice(leadMatch[0].length).trimStart();
  }

  const { html, headings } = withHeadingIds(body);
  return { html, headings, lastUpdated };
}

