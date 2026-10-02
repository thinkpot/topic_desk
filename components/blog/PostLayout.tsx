import Link from "next/link";
import { BRAND_NAME } from "@/lib/brand";
import { LogoLockup } from "@/components/Logo";
import { formatPostDate, type Post } from "@/lib/blog";

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3.5">
        <Link href="/">
          <LogoLockup />
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/blog" className="btn-ghost btn-sm">
            All posts
          </Link>
          <Link href="/register" className="btn-primary btn-sm">
            Start free trial
          </Link>
        </div>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-[13px] text-ink-3">
        <span>
          © {new Date().getFullYear()} {BRAND_NAME}
        </span>
        <div className="flex gap-5">
          <Link href="/blog" className="hover:text-ink">
            Blog
          </Link>
          <Link href="/terms" className="hover:text-ink">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-ink">
            Privacy
          </Link>
          <Link href="/refunds" className="hover:text-ink">
            Refunds
          </Link>
        </div>
      </div>
    </footer>
  );
}

/** Shell for the blog index — the article shell is below. */
export function BlogShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-14">{children}</main>
      <SiteFooter />
    </div>
  );
}

export default function PostLayout({ post, related }: { post: Post; related: Post[] }) {
  const { Body } = post;

  return (
    <div className="min-h-screen bg-surface">
      <SiteHeader />

      <article className="mx-auto max-w-3xl px-6 py-14">
        <Link href="/blog" className="text-[13px] text-ink-3 hover:text-ink">
          ← All posts
        </Link>

        <p className="label-eyebrow mt-6">{post.category}</p>
        <h1 className="mt-3 text-[34px] font-semibold leading-[1.15] tracking-[-0.03em] sm:text-[40px]">
          {post.title}
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-ink-2">{post.description}</p>
        <p className="mt-5 border-t border-line pt-5 text-[13px] text-ink-3">
          {formatPostDate(post.date)} · {post.readingMinutes} min read
        </p>

        <div className="prose mt-10">
          <Body />
        </div>

        <aside className="mt-16 rounded-xl border border-line bg-plane p-7">
          <h2 className="text-[19px] font-semibold tracking-[-0.02em]">Try it on your own site</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
            {BRAND_NAME} puts a live chat widget on your website and sends every conversation to your Telegram
            group, so your team answers from the app they already have open. Free for 3 days, no card needed.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/register" className="btn-primary">
              Start free trial
            </Link>
            <Link href="/" className="btn-secondary">
              See how it works
            </Link>
          </div>
        </aside>

        {related.length > 0 && (
          <section className="mt-16 border-t border-line pt-8">
            <p className="label-eyebrow">Read next</p>
            <ul className="mt-5 space-y-5">
              {related.map((item) => (
                <li key={item.slug}>
                  <Link href={`/blog/${item.slug}`} className="group block">
                    <h3 className="text-[16.5px] font-semibold group-hover:underline">{item.title}</h3>
                    <p className="mt-1 text-[14px] leading-relaxed text-ink-2">{item.description}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>

      <SiteFooter />
    </div>
  );
}
