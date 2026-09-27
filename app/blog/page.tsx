import type { Metadata } from "next";
import Link from "next/link";
import { BRAND_NAME } from "@/lib/brand";
import { POSTS } from "@/content/posts";
import { formatPostDate, sortPosts } from "@/lib/blog";
import { BlogShell } from "@/components/blog/PostLayout";

export const metadata: Metadata = {
  title: `Blog — live chat, chatbots and visitor tracking | ${BRAND_NAME}`,
  description:
    "Practical guides on adding live chat to a website, building a no-code chatbot, tracking visitors, and doing all of it without upsetting anyone's privacy.",
};

export default function BlogIndexPage() {
  const posts = sortPosts(POSTS);
  const [lead, ...rest] = posts;

  return (
    <BlogShell>
      <p className="label-eyebrow">Blog</p>
      <h1 className="mt-3 text-[36px] font-semibold tracking-[-0.03em]">
        Live chat, minus the guesswork
      </h1>
      <p className="mt-4 max-w-xl text-[16.5px] leading-relaxed text-ink-2">
        How to add chat to a website, what visitor tracking can and can&apos;t see, and how to answer people
        faster — written for small teams who don&apos;t have a support department.
      </p>

      {lead && (
        <Link
          href={`/blog/${lead.slug}`}
          className="group mt-12 block rounded-xl border border-line bg-plane p-7 transition-colors hover:border-line-strong"
        >
          <span className="label-eyebrow">{lead.category} · Latest</span>
          <h2 className="mt-3 text-[24px] font-semibold leading-snug tracking-[-0.025em] group-hover:underline">
            {lead.title}
          </h2>
          <p className="mt-2.5 text-[15.5px] leading-relaxed text-ink-2">{lead.description}</p>
          <p className="mt-4 text-[13px] text-ink-3">
            {formatPostDate(lead.date)} · {lead.readingMinutes} min read
          </p>
        </Link>
      )}

      <ul className="mt-4 divide-y divide-line border-t border-line">
        {rest.map((post) => (
          <li key={post.slug}>
            <Link href={`/blog/${post.slug}`} className="group block py-7">
              <span className="label-eyebrow">{post.category}</span>
              <h2 className="mt-2.5 text-[19px] font-semibold leading-snug tracking-[-0.02em] group-hover:underline">
                {post.title}
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{post.description}</p>
              <p className="mt-3 text-[13px] text-ink-3">
                {formatPostDate(post.date)} · {post.readingMinutes} min read
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </BlogShell>
  );
}
