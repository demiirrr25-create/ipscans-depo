import type { MetadataRoute } from "next";
import { locales, defaultLocale, type Locale } from "@/i18n/config";
import { posts } from "@/content/posts";
import { toolSlugs, toolKeys } from "@/lib/tool-routes";

const BASE_URL = "https://ipscans.com";

function altLanguages(pathFor: (locale: Locale) => string) {
  return {
    ...Object.fromEntries(locales.map((l) => [l, `${BASE_URL}${pathFor(l)}`])),
    "x-default": `${BASE_URL}${pathFor(defaultLocale)}`,
  };
}

// One sitemap file per locale/region (Next.js emits a /sitemap.xml index
// that links to /sitemap/0.xml, /sitemap/1.xml, ...), as recommended for
// international SEO instead of a single mixed-locale file.
export function generateSitemaps() {
  return locales.map((_, id) => ({ id }));
}

export default function sitemap({
  id,
}: {
  id: number;
}): MetadataRoute.Sitemap {
  const locale = locales[id];
  const staticPaths = ["", "/scan", "/download", "/ipcast", "/pro", "/blog", "/shop", "/privacy", "/terms"];
  const entries: MetadataRoute.Sitemap = [];

  for (const path of staticPaths) {
    entries.push({
      url: `${BASE_URL}/${locale}${path}`,
      lastModified: new Date(),
      alternates: { languages: altLanguages((l) => `/${l}${path}`) },
    });
  }
  for (const key of toolKeys) {
    entries.push({
      url: `${BASE_URL}/${locale}/${toolSlugs[key][locale]}`,
      lastModified: new Date(),
      alternates: {
        languages: altLanguages((l) => `/${l}/${toolSlugs[key][l]}`),
      },
    });
  }
  for (const post of posts) {
    // Only include hreflang for locales that actually have this post translated.
    const translated = locales.filter((l) => post.title[l]);
    entries.push({
      url: `${BASE_URL}/${locale}/blog/${post.slug}`,
      lastModified: new Date(post.date),
      alternates: {
        languages: Object.fromEntries(
          translated.map((l) => [l, `${BASE_URL}/${l}/blog/${post.slug}`])
        ),
      },
    });
  }

  return entries;
}
