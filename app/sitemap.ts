import type { MetadataRoute } from "next";
import { POSTS } from "@/content/posts";
import { sortPosts } from "@/lib/blog";
import { siteUrl } from "@/lib/site";

// Static export would freeze the blog list at build time, which is fine here —
// posts are modules, so a new one always means a new build anyway.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl().origin;
  const posts = sortPosts(POSTS);
  const newestPost = posts[0]?.date;

  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/blog`, lastModified: newestPost, changeFrequency: "weekly", priority: 0.8 },
    ...posts.map((post) => ({
      url: `${base}/blog/${post.slug}`,
      lastModified: post.date,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    { url: `${base}/register`, changeFrequency: "yearly" as const, priority: 0.6 },
    { url: `${base}/login`, changeFrequency: "yearly" as const, priority: 0.3 },
    { url: `${base}/terms`, changeFrequency: "yearly" as const, priority: 0.2 },
    { url: `${base}/privacy`, changeFrequency: "yearly" as const, priority: 0.2 },
    { url: `${base}/refunds`, changeFrequency: "yearly" as const, priority: 0.2 },
  ];
}
