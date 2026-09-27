import Link from "next/link";
import type { PostMeta } from "@/lib/blog";

export const meta: PostMeta = {
  slug: "free-website-visitor-tracking",
  title: "Free website visitor tracking: what you actually get",
  description:
    "Google Analytics, free tiers and self-hosted options compared — what each one gives you for nothing, where the limits bite, and when paying is genuinely worth it.",
  keyword: "free website visitor tracking",
  category: "Guides",
  date: "2026-09-25",
  readingMinutes: 7,
};

export default function Body() {
  return (
    <>
      <p>
        You can track visitors to a website without paying anybody. The question is what &ldquo;free&rdquo;
        means in each case, because it means three different things: funded elsewhere, free up to a cap, and
        free because you do the work yourself.
      </p>
      <p>
        Here is what each option actually gives you, where the limit shows up, and the point at which paying
        stops being optional.
      </p>

      <h2>Google Analytics 4</h2>
      <p>
        The default, and for aggregate measurement hard to beat at the price: sessions, sources, campaigns,
        events, conversions, and a reporting interface that answers most marketing questions.
      </p>
      <p>What it is not:</p>
      <ul>
        <li>
          <strong>It is aggregate, not per-person.</strong> The realtime view is a live count and a breakdown
          of what is being viewed. You cannot pick out one visitor, and you certainly cannot speak to them.
        </li>
        <li>
          <strong>Reports can be sampled and thresholded.</strong> On larger date ranges and custom queries you
          are reading an estimate, and rows with small counts can be withheld entirely.
        </li>
        <li>
          <strong>It is retrospective.</strong> By the time a session appears in a standard report, the visit
          is long over.
        </li>
        <li>
          <strong>It brings consent obligations.</strong> It sets cookies and sends data to a third party, so
          in many places you need a banner and a working &ldquo;no&rdquo; — and every visitor who says no is
          missing from your numbers.
        </li>
      </ul>

      <h2>Free tiers of paid tools</h2>
      <p>
        Most chat, heatmap and session-recording products have one. They are real, and they are marketing: the
        tier is sized so a site with any traction outgrows it.
      </p>
      <p>The cap is usually one of these, so find out which before you install:</p>
      <ul>
        <li>
          <strong>Monthly visitors or sessions.</strong> Pass it and you either upgrade or stop collecting
          until the month resets.
        </li>
        <li>
          <strong>Data retention.</strong> Seven, fourteen or thirty days of history. Fine for spotting a broken
          page, useless for comparing quarters.
        </li>
        <li>
          <strong>Seats.</strong> One user, so nobody else on the team can look.
        </li>
        <li>
          <strong>Branding.</strong> The vendor&apos;s name on your widget until you pay.
        </li>
      </ul>
      <p>
        None of that is unreasonable. It is only a problem when you build a process on a free tier and discover
        the ceiling during a month that matters.
      </p>

      <h2>Self-hosted and open source</h2>
      <p>
        Matomo, Umami and Plausible all have open-source versions you can run yourself. The software costs
        nothing; you supply a server, a database, certificates, backups, upgrades and the hour or two a month
        that keeps it all working.
      </p>
      <p>
        The advantages are real: the data stays on infrastructure you control, several of these tools work
        without cookies, and there is no sampling because it is your database. The cost is that you now run a
        service. If nobody on your team is comfortable doing that, the same vendor&apos;s hosted plan is cheaper
        once you price your own time honestly.
      </p>

      <h2>Server logs</h2>
      <p>
        Your web server already records every request: URL, timestamp, IP, referrer, user agent. Point GoAccess
        or a similar log analyser at it and you have basic traffic reporting for nothing.
      </p>
      <p>
        Logs see requests, not people. Bots are a large share of them, cached pages may never reach your
        server, and there is no scroll depth or time on page because those events happen in the browser. A
        sanity check against your analytics, not a replacement.
      </p>

      <h2>The options side by side</h2>
      <table>
        <thead>
          <tr>
            <th>Option</th>
            <th>What you get free</th>
            <th>Where it stops</th>
            <th>Real cost</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Google Analytics 4</td>
            <td>Full aggregate reporting, campaigns, events</td>
            <td>No per-visitor live view; sampling; consent banner</td>
            <td>Your visitor data sits with a third party</td>
          </tr>
          <tr>
            <td>Free tier of a paid tool</td>
            <td>The full product, briefly</td>
            <td>Visitor cap, short retention, one seat, branding</td>
            <td>Migration pain when you outgrow it</td>
          </tr>
          <tr>
            <td>Self-hosted (Matomo, Umami, Plausible)</td>
            <td>All the data, often cookie-free, no sampling</td>
            <td>Nothing, if you keep the server healthy</td>
            <td>Hosting fees and your own maintenance time</td>
          </tr>
          <tr>
            <td>Server logs</td>
            <td>Every request, already recorded</td>
            <td>No scroll, no time on page, heavy bot noise</td>
            <td>Setup and interpretation effort</td>
          </tr>
        </tbody>
      </table>

      <div className="callout">
        <p>
          <strong>The honest summary:</strong> free visitor tracking is either capped, sampled, or paid for with
          your own labour. That is fine — pick the trade you would rather make. What is not fine is assuming a
          free analytics tool will one day show you who is on your pricing page right now, because none of them
          are built to do that.
        </p>
      </div>

      <h2>What free tools will not give you</h2>
      <p>
        Two things, consistently. A live, per-visitor view you can act on — current page, referrer, scroll
        depth, updating as they browse. And anything joining that view to a way of replying, so noticing a
        hesitating visitor and saying something are one action rather than two products.
      </p>
      <p>
        Nothing on the free list above will identify an anonymous visitor either, and neither will the paid ones.
        That limit is explained in our guide to{" "}
        <Link href="/blog/website-visitor-tracking-software">website visitor tracking software</Link>.
      </p>

      <h2>How Chatshore does it</h2>
      <p>
        Chatshore includes live visitor tracking: who is browsing right now, their current page, referrer,
        scroll depth and recent path, updated live before they say anything. When they write in, the
        conversation becomes its own topic in your Telegram group and your team replies from there.
      </p>
      <p>
        There is a three-day trial with no card: one chatbot, 500 conversations a month, two live visitors.
        Paid plans start at ₹499 a month for ten live visitors; Pro at ₹999 raises that to a hundred and lets
        you reply from the dashboard and message a visitor first. No tracking cookies, no advertising
        trackers.
      </p>

      <h2>Common questions</h2>

      <h3>Is website visitor tracking free?</h3>
      <p>
        Aggregate analytics effectively is. Live per-visitor tracking generally is not beyond a small free
        tier, because it costs the vendor an open connection per session rather than a batch of events.
      </p>

      <h3>How do I track visitors to my website?</h3>
      <p>
        Add a tracking script to every page, usually just before the closing body tag, then read the dashboard
        the tool gives you. It is the same installation step as a chat widget — the walkthrough in{" "}
        <Link href="/blog/how-to-add-live-chat-to-your-website">how to add live chat to your website</Link>{" "}
        covers WordPress, Shopify, Wix and the rest.
      </p>

      <h3>Can you track website visitors without cookies?</h3>
      <p>
        Yes. Several tools count visits without any client-side identifier, and others use browser local storage
        instead of a cookie. It matters legally as well as technically: no cookies usually means no cookie
        banner.
      </p>

      <h3>Is website tracking legal?</h3>
      <p>
        Broadly yes, subject to the rules where your visitors live. In India that is the Digital Personal Data
        Protection Act, 2023; in Europe, the GDPR and the cookie rules. Publish a privacy notice saying what you
        collect and why. More in{" "}
        <Link href="/blog/is-website-visitor-tracking-legal">is website visitor tracking legal</Link>.
      </p>

      <h3>When is it worth paying?</h3>
      <p>
        When the free version costs you more than the paid one: when you are losing sales you could have saved
        by speaking to someone mid-visit, or spending an afternoon a month keeping a self-hosted install
        alive.
      </p>
    </>
  );
}
