import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";
import { posts } from "@/content/posts";
import { toolSlugs } from "@/lib/tool-routes";

const BASE_URL = "https://ipscans.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPaths = ["", "/scan", "/download", "/blog", "/shop"];
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    for (const path of staticPaths) {
      entries.push({
        url: `${BASE_URL}/${locale}${path}`,
        lastModified: new Date(),
      });
    }
    for (const tool of Object.values(toolSlugs)) {
      entries.push({
        url: `${BASE_URL}/${locale}/${tool[locale]}`,
        lastModified: new Date(),
      });
    }
    for (const post of posts) {
      entries.push({
        url: `${BASE_URL}/${locale}/blog/${post.slug}`,
        lastModified: new Date(post.date),
      });
    }
  }

  return entries;
}
