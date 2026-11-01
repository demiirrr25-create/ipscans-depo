import type { MetadataRoute } from "next";
import { locales, defaultLocale, type Locale } from "@/i18n/config";
import { posts } from "@/content/posts";
import { toolSlugs, toolKeys } from "@/lib/tool-routes";

const BASE_URL = "https://ipscans.com";

function altLanguages(pathFor: (locale: Locale) => string) {
  return {
    ...Object.fromEntries(locales.map((locale) => [locale, `${BASE_URL}${pathFor(locale)}`])),
    "x-default": `${BASE_URL}${pathFor(defaultLocale)}`,
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];
  for (const locale of ["tr", "en"]) {
    entries.push({ url: `${BASE_URL}/desktop/${locale}.html`, alternates: {
      languages: { tr: `${BASE_URL}/desktop/tr.html`, en: `${BASE_URL}/desktop/en.html`, "x-default": `${BASE_URL}/desktop/en.html` },
    } });
  }
  for (const page of ['about','support','contact']) for (const locale of ['tr','en']) entries.push({url:`${BASE_URL}/${locale}/${page}`,alternates:{languages:{tr:`${BASE_URL}/tr/${page}`,en:`${BASE_URL}/en/${page}`,'x-default':`${BASE_URL}/en/${page}`}}});
  for (const locale of locales) {
    const staticPaths = ["", "/scan", "/download"];
    if (posts.some((post) => post.body[locale])) staticPaths.push("/blog");
    staticPaths.push("/privacy", "/terms");

    for (const path of staticPaths) {
      const languages = altLanguages((l) => `/${l}${path}`);
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
            "x-default": `${BASE_URL}/${post.body.en ? "en" : "tr"}/blog/${post.slug}`,
          },
        },
      });
    }
  }
  return entries;
}
