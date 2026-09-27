/**
 * Blog post registry.
 *
 * Posts are plain .tsx modules under content/posts rather than MDX, so the blog
 * adds no build step and no dependencies — the same reason public/widget.js
 * ships without a bundler. Each module exports `meta` plus a default component
 * for the body; content/posts/index.ts stitches them into POSTS.
 */
export interface PostMeta {
  slug: string;
  title: string;
  /** Meta description, and the summary shown on the index. */
  description: string;
  /** The search phrase this post is written for — kept here so it's reviewable. */
  keyword: string;
  category: "Guides" | "Comparisons" | "Privacy & security" | "Playbooks";
  /** ISO date, used for sorting and for the article structured data. */
  date: string;
  readingMinutes: number;
}

export interface Post extends PostMeta {
  Body: () => React.JSX.Element;
}

export function formatPostDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

/** Newest first, which is how both the index and the "read next" list order things. */
export function sortPosts(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => b.date.localeCompare(a.date));
}

/** Up to `count` other posts, preferring ones in the same category. */
export function relatedPosts(posts: Post[], current: Post, count = 3): Post[] {
  const others = sortPosts(posts).filter((p) => p.slug !== current.slug);
  const sameCategory = others.filter((p) => p.category === current.category);
  return [...sameCategory, ...others.filter((p) => p.category !== current.category)].slice(0, count);
}
