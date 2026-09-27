import Link from "next/link";
import type { PostMeta } from "@/lib/blog";

export const meta: PostMeta = {
  slug: "website-visitor-tracking-software",
  title: "Website visitor tracking software: what it actually shows you",
  description:
    "What visitor tracking software can and cannot see, the difference between analytics and live visitor tracking, and how to pick a tool without buying more than you need.",
  keyword: "website visitor tracking software",
  category: "Guides",
  date: "2026-09-26",
  readingMinutes: 7,
};

export default function Body() {
  return (
    <>
      <p>
        &ldquo;Website visitor tracking&rdquo; is one phrase covering three products that do three different
        jobs. People search for it, land on a pricing page, buy the wrong one, and conclude the
        category is oversold.
      </p>
      <p>
        This is a buyer&apos;s guide: what these tools record, the three categories and what each is good for,
        the things none of them can see, and how to match a tool to the question you are asking.
      </p>

      <h2>What visitor tracking software records</h2>
      <p>
        Nearly all of it comes from one place: a small script on your pages, plus the request headers the
        browser sends anyway. The usual fields are unglamorous.
      </p>
      <ul>
        <li>
          <strong>Pages viewed, in order,</strong> with timestamps.
        </li>
        <li>
          <strong>Referrer</strong> — the site or search engine that sent them, and any campaign parameters in
          the URL.
        </li>
        <li>
          <strong>Time</strong> on each page and on the site in total.
        </li>
        <li>
          <strong>Scroll depth,</strong> the closest thing to a reading signal you will get.
        </li>
        <li>
          <strong>Device and browser</strong> — screen size, operating system, mobile or desktop.
        </li>
        <li>
          <strong>Approximate location,</strong> from the IP address, usually no better than a city.
        </li>
      </ul>
      <p>
        That is the raw material. What separates the three categories is not what they collect but how they
        present it.
      </p>

      <h2>The three categories</h2>

      <h3>1. Aggregate analytics</h3>
      <p>
        Google Analytics and its alternatives count things: sessions last week, which pages get traffic, which
        channels convert, how the numbers moved month on month. The unit is the trend, not the person, and the
        view is retrospective — you read it the next morning, not while it is happening.
      </p>
      <p>
        Right tool for &ldquo;is our traffic growing and where from&rdquo;; wrong tool for &ldquo;who is stuck
        on the pricing page right now&rdquo;. Analytics tells you forty people read a blog post. It will not
        help you talk to any of them.
      </p>

      <h3>2. Live visitor tracking</h3>
      <p>
        A live list of the sessions open on your site right now: which page each is on, where they came from,
        how far they have scrolled, the path they took. It updates as they move.
      </p>
      <p>
        The value here is timing, not identity. You still do not know who these people are, but knowing somebody
        has been on your pricing page for four minutes after arriving from a comparison article is enough to
        start a conversation — which is why live tracking usually ships alongside a chat widget rather than as a
        product of its own.
      </p>

      <h3>3. B2B IP-to-company identification</h3>
      <p>
        Leadfeeder, Albacross, Apollo and similar look the visitor&apos;s IP address up against databases of
        corporate network ranges. If it belongs to a company&apos;s office network, the tool reports that
        company as the visitor.
      </p>
      <p>
        Two things are routinely misunderstood. First, it identifies a <em>company</em>, not a person — you get
        &ldquo;someone at Acme Ltd read three pages&rdquo;, and any contact details offered alongside come from
        separate databases of people who work there, not from your site. Second, it only works on corporate IPs.
        Home broadband, mobile connections and VPNs resolve to an internet provider or to nothing, so matches
        cover a fraction of your traffic — a much smaller fraction where most browsing happens on a phone.
      </p>

      <div className="callout">
        <p>
          <strong>The distinction that matters:</strong> analytics answers questions about yesterday in
          aggregate, live tracking answers questions about now for one session, and IP lookup tries to answer
          &ldquo;which business is this&rdquo; and often cannot. Buying the third when you wanted the second is
          the expensive mistake in this category.
        </p>
      </div>

      <h2>What none of it can see</h2>
      <p>
        Vendor copy blurs this, so it is worth being blunt. Unless a visitor tells you, or is logged in to an
        account you already have, tracking software cannot see:
      </p>
      <ul>
        <li>
          <strong>Their name or email address.</strong> A random identifier in browser storage is not an
          identity.
        </li>
        <li>
          <strong>Anything they do on other sites.</strong> A script on your domain sees your domain. Cross-site
          profiles came from third-party cookies, which browsers have spent years dismantling.
        </li>
        <li>
          <strong>Form fields they did not submit.</strong> Some session recorders do capture keystrokes, which
          is why sensible ones mask inputs by default.
        </li>
        <li>
          <strong>Whether two sessions are the same human.</strong> Different browser, different device, cleared
          storage — a new visitor as far as the tool is concerned.
        </li>
      </ul>

      <h2>How to choose</h2>
      <p>Start from the question you want answered, not the feature list.</p>
      <h3>&ldquo;Is our marketing working?&rdquo;</h3>
      <p>
        Aggregate analytics, and the free tier is almost certainly enough. See{" "}
        <Link href="/blog/free-website-visitor-tracking">free website visitor tracking</Link> for what the free
        options cover and where they stop.
      </p>
      <h3>&ldquo;Should I say something to this person?&rdquo;</h3>
      <p>
        Live visitor tracking attached to a chat widget — it is only useful if you can act on it in the same
        minute. See{" "}
        <Link href="/blog/how-to-add-live-chat-to-your-website">how to add live chat to your website</Link>.
      </p>
      <h3>&ldquo;Which companies are researching us?&rdquo;</h3>
      <p>
        IP-to-company, with realistic expectations. Worth it if you sell high-value contracts to organisations
        with office networks; a waste otherwise.
      </p>
      <p>
        Then check three things before you pay: whether it sets cookies, how long data is kept, and whether it
        slows your pages down. On the legal side, see{" "}
        <Link href="/blog/is-website-visitor-tracking-legal">is website visitor tracking legal</Link>.
      </p>

      <h2>How Chatshore does it</h2>
      <p>
        Chatshore does the second kind. The dashboard shows who is browsing now, their current page, referrer,
        scroll depth and recent path, live, before they have said anything. When they write in, the conversation
        opens as its own topic in your Telegram group and you reply from there.
      </p>
      <p>
        It sets no tracking cookies, runs no analytics or advertising trackers, and does not follow anyone
        across other sites. It does not do IP-to-company identification either.
      </p>

      <h2>Common questions</h2>

      <h3>What is website visitor tracking?</h3>
      <p>
        Recording what happens during visits to your site — pages, referrer, time, scroll, device — either
        counted in aggregate or shown per session as it happens. The phrase covers both, which is why buyers end
        up with the wrong product.
      </p>

      <h3>Can a website see who visits it?</h3>
      <p>
        Not by name. A site sees a browser: its IP address, the pages it requests and the headers it sends. It
        knows who you are only if you log in, submit a form, or arrive from an email carrying an identifier.
      </p>

      <h3>Can you track website visitors in real time?</h3>
      <p>
        Yes, with a tool built for it: the live list shows current sessions and their pages as they move.
        Analytics products have a &ldquo;realtime&rdquo; screen too, but it is a live count rather than
        something you can act on one visitor at a time.
      </p>

      <h3>Is website visitor tracking legal?</h3>
      <p>
        Generally yes, with conditions that depend on where your visitors are. In India the relevant law is the
        Digital Personal Data Protection Act, 2023; in Europe, the GDPR and the cookie rules, which is why
        cookie-free tools are easier to run. Say what you collect in a privacy notice and keep it no longer than
        you need.
      </p>
    </>
  );
}
