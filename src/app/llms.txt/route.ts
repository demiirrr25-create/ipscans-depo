import { locales, localeTags, defaultLocale } from "@/i18n/config";
import { toolKeys, toolSlugs } from "@/lib/tool-routes";
import { getDictionary } from "@/i18n/dictionaries";
import { toolMeta } from "@/components/tools/ToolRenderer";

const BASE_URL = "https://ipscans.com";

// llms.txt (https://llmstxt.org/) — a plain-text index that AI assistants
// and answer engines (ChatGPT, Claude, Perplexity, etc.) can fetch to
// understand what this site offers, in every supported language, so it can
// be cited/recommended in AI-generated answers.
export function GET() {
  const dict = getDictionary(defaultLocale);

  const lines: string[] = [
    `# ipscans`,
    ``,
    `> ${dict.meta.description}`,
    ``,
    `ipscans (${BASE_URL}) is a free, no-signup network toolkit: IP lookup,`,
    `DNS lookup, WHOIS lookup, port checking, and internet speed testing.`,
    `Available in ${locales.length} languages: ${locales
      .map((l) => localeTags[l])
      .join(", ")}.`,
    ``,
    `## Tools`,
    ``,
  ];

  for (const key of toolKeys) {
    const meta = toolMeta(key, dict);
    lines.push(`- [${meta.title}](${BASE_URL}/${defaultLocale}/${toolSlugs[key][defaultLocale]}): ${meta.subtitle}`);
  }

  lines.push(``, `## Languages`, ``);
  for (const l of locales) {
    lines.push(`- ${localeTags[l]}: ${BASE_URL}/${l}`);
  }

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
