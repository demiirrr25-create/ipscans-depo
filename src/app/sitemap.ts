import type { MetadataRoute } from "next";
import { locales, defaultLocale, type Locale } from "@/i18n/config";
import { posts } from "@/content/posts";
import { toolSlugs, toolKeys } from "@/lib/tool-routes";
import { applications } from "@/content/applications";

const BASE_URL = "https://ipscans.com";

function altLanguages(pathFor: (locale: Locale) => string) {
  return {
    ...Object.fromEntries(locales.map((locale) => [locale, `${BASE_URL}${pathFor(locale)}`])),
    "x-default": `${BASE_URL}${pathFor(defaultLocale)}`,
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];
  for (const locale of locales) {
    const staticPaths = ["", "/scan", "/ip-scanner", "/download", "/download/ipcast", "/ipcast",
      ...applications.map((app) => `/applications/${app.id}`)];
    if (posts.some((post) => post.body[locale])) staticPaths.push("/blog");
    if (locale === "en" || locale === "tr") staticPaths.push("/privacy", "/terms");

    for (const path of staticPaths) {
      const languages = ["/privacy", "/terms", "/blog"].includes(path)
        ? {
            en: `${BASE_URL}/en${path}`,
            tr: `${BASE_URL}/tr${path}`,
            "x-default": `${BASE_URL}/en${path}`,
          }
        : altLanguages((l) => `/${l}${path}`);
      entries.push({ url: `${BASE_URL}/${locale}${path}`, alternates: { languages } });
    }
    for (const key of toolKeys) {
      entries.push({
        url: `${BASE_URL}/${locale}/${toolSlugs[key][locale]}`,
        alternates: { languages: altLanguages((l) => `/${l}/${toolSlugs[key][l]}`) },
      });
    }
    for (const post of posts) {
      if (!post.body[locale]) continue;
      const translated = locales.filter((l) => post.body[l]);
      entries.push({
        url: `${BASE_URL}/${locale}/blog/${post.slug}`,
        lastModified: new Date(post.date),
        alternates: {
          languages: {
            ...Object.fromEntries(translated.map((l) => [l, `${BASE_URL}/${l}/blog/${post.slug}`])),
            "x-default": `${BASE_URL}/en/blog/${post.slug}`,
          },
        },
      });
    }
  }
  return entries;
}
