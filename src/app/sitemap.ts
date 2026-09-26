import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";
import { posts } from "@/content/posts";
import { products } from "@/content/products";

const BASE_URL = "https://ipscans.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["", "/ip-lookup", "/dns", "/whois", "/ports", "/speed-test", "/scan", "/download", "/blog", "/shop"];
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    for (const path of paths) {
      entries.push({
        url: `${BASE_URL}/${locale}${path}`,
        lastModified: new Date(),
      });
    }
    for (const post of posts) {
      entries.push({
        url: `${BASE_URL}/${locale}/blog/${post.slug}`,
        lastModified: new Date(post.date),
      });
    }
    for (const product of products) {
      entries.push({
        url: `${BASE_URL}/${locale}/shop/${product.slug}`,
        lastModified: new Date(),
      });
    }
  }

  return entries;
}
