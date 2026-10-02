import Link from "next/link";
import type { PostMeta } from "@/lib/blog";

export const meta: PostMeta = {
  slug: "free-live-chat-software-for-your-website",
  title: "Free live chat software: what the free plans actually cost you",
  description:
    "Free live chat tiers are real, but they are capped somewhere. Here is where each one bites — branding, agent seats, chat history, monthly conversations — and how to tell which limit will hit you first.",
  keyword: "free live chat software for website",
  category: "Comparisons",
  date: "2026-09-24",
  readingMinutes: 8,
};

export default function Body() {
  return (
    <>
      <p>
        Free live chat plans are not a trick. Several well-known tools have run one for years, and for a site with
        a handful of conversations a week a free tier is genuinely all you need. But every free plan is capped
        somewhere, and vendors differ in <em>which</em> lever they pull.
      </p>
      <p>
        The useful question is not &ldquo;which free plan is best&rdquo; but &ldquo;which cap will I hit first,
        and what happens when I do&rdquo;. Here are the levers, the cost of picking wrong, and a short way to
        work out the answer for your own site.
      </p>

      <h2>The levers vendors use</h2>
      <p>
        A free tier has to be useful enough to adopt and limited enough to outgrow. There are about six ways to do
        that, and most tools use two or three together.
      </p>

      <h3>Agent seats</h3>
      <p>
        The most common limit: free usually means one seat, sometimes two. Fine for a solo founder, awkward for a
        team of three, because sharing a login leaves no record of who answered what.
      </p>

      <h3>Chat history retention</h3>
      <p>
        Free plans often keep transcripts for a fixed window — 30, 60 or 90 days is typical — then hide or delete
        anything older. This is the limit people notice last and regret most: transcripts are how you find the
        question everyone asks, and how you check what you promised a customer in June.
      </p>

      <h3>Vendor branding on the widget</h3>
      <p>
        A &ldquo;Powered by&rdquo; line in the chat box. Cosmetic, and for many sites acceptable. It matters if
        you sell to businesses who read it as a signal about your size.
      </p>

      <h3>Monthly conversation caps</h3>
      <p>
        Some plans meter conversations rather than seats. The detail that matters is the behaviour at the cap:
        some disable the widget for the rest of the month, some queue, some bill you. A widget that vanishes
        mid-month is worse than no widget.
      </p>

      <h3>Integrations and automation</h3>
      <p>
        Chatbots, triggers, canned replies and webhooks are the usual paid features. If your plan for volume is
        &ldquo;a bot will handle the repeats&rdquo;, check the bot is publishable on free — often the builder is
        visible but publishing is not.
      </p>

      <h3>Mobile notifications</h3>
      <p>
        Some free tiers give you the dashboard and not the mobile push, which quietly turns live chat into slow
        email. If nobody gets a phone notification, your response time is whatever your tab-checking habit is.
      </p>

      <h2>A table of limit types</h2>
      <p>
        Specific plans change every few months, so the useful comparison is between kinds of limit rather than
        between vendors. Work out which row bites hardest for you.
      </p>

      <table>
        <thead>
          <tr>
            <th>Limit</th>
            <th>Who it bites</th>
            <th>How it shows up</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Agent seats</td>
            <td>Any team of two or more</td>
            <td>Shared logins, no idea who replied, no handover</td>
          </tr>
          <tr>
            <td>History retention</td>
            <td>Anyone doing support over months</td>
            <td>Old transcripts disappear; rarely exportable on free</td>
          </tr>
          <tr>
            <td>Vendor branding</td>
            <td>B2B and premium brands</td>
            <td>A &ldquo;Powered by&rdquo; line you cannot remove</td>
          </tr>
          <tr>
            <td>Monthly conversations</td>
            <td>Sites with traffic spikes</td>
            <td>Widget disabled, queued or billed at the cap</td>
          </tr>
          <tr>
            <td>Automation and integrations</td>
            <td>Teams planning to scale with bots</td>
            <td>Flow builder visible but not publishable</td>
          </tr>
          <tr>
            <td>Mobile push</td>
            <td>Small teams without a support desk</td>
            <td>Replies take hours because nobody is watching a tab</td>
          </tr>
        </tbody>
      </table>

      <h2>What migrating actually costs</h2>
      <p>
        People treat the choice as low-stakes because the price is zero. The switching cost is not. The first
        part is mechanical: you change the script tag on every page or template that carries it, then check
        the new widget loads and the old one is gone. Ten minutes on one site; an afternoon across a marketing
        site, a docs subdomain and a storefront, with a forgotten page still showing a dead chat box.
      </p>
      <p>
        The second hurts more: your chat history usually does not come with you. Export is commonly a paid
        feature, and where it exists on free it tends to be a flat file with attachments dropped. You lose your
        record of what you told customers, and the raw material for deciding what to automate.
      </p>

      <div className="callout">
        <p>
          <strong>Ask two questions before you install anything free:</strong> can I export my transcripts on this
          plan, and what happens to the widget when I hit the cap? If the answers are &ldquo;no&rdquo; and
          &ldquo;it stops&rdquo;, treat the tool as a trial rather than a decision.
        </p>
      </div>

      <h2>Work out which cap you hit first</h2>
      <p>Two numbers decide this, and you can estimate both in about five minutes.</p>

      <h3>1. Monthly conversation volume</h3>
      <p>
        If you already have chat, read it off the dashboard. If not, count a month of email and contact-form
        enquiries and assume chat produces more, because a chat box lowers the effort of asking.
      </p>

      <h3>2. How many people will answer</h3>
      <p>
        Not the headcount — how many will actually reply to a visitor. If the answer is one, seat limits are
        irrelevant and you can ignore a whole column of comparison tables. If it is three, a one-seat plan is
        already the wrong tool.
      </p>

      <h3>3. Then check the two you cannot see coming</h3>
      <p>
        Retention and export — invisible on day one, expensive in month four. Everything else you notice at once
        and can react to.
      </p>

      <h2>When free is the right answer</h2>
      <p>
        If you are one person getting a few conversations a week and do not mind a vendor logo in the corner, a
        free plan is correct and paying would be a waste. Same for a site still finding out whether visitors want
        to chat at all — install something free, leave it a month, read the transcripts.
      </p>
      <p>
        It stops being right at a clear point: when a second person needs to answer, when you want last
        quarter&apos;s conversations back, or when the widget goes quiet mid-month. For the install side see{" "}
        <Link href="/blog/how-to-add-live-chat-to-your-website">how to add live chat to your website</Link>, and
        for making it worth having,{" "}
        <Link href="/blog/live-chat-best-practices">live chat best practices</Link>.
      </p>

      <h2>How Chatshore does it</h2>
      <p>
        Chatshore has a three-day free trial with no card — one chatbot, 500 conversations, two live visitors.
        That is deliberately a trial rather than a permanent free tier; paid plans start at ₹499 a month.
      </p>
      <p>
        The seat question works out differently here: conversations land in your Telegram group as separate
        topics, and anyone in that group can answer. There is no per-agent charge to reason about.
      </p>

      <h2>Common questions</h2>

      <h3>Is live chat free?</h3>
      <p>
        The software often is, at low volume. What is never free is somebody being available to answer. If nobody
        can reply within a few minutes, the plan matters far less than the staffing.
      </p>

      <h3>What is the best free live chat software?</h3>
      <p>
        There is no single answer, because the plans differ in which limit they impose rather than in quality.
        Decide whether seats, history, branding or volume binds you first, then pick the tool that is generous
        on that one.
      </p>

      <h3>Best free live chat software for a small website?</h3>
      <p>
        With one person answering, almost any free tier works, so optimise for the thing you cannot change later:
        whether you can export your transcripts. That keeps the exit cheap if you outgrow it.
      </p>

      <h3>Do free plans track visitors too?</h3>
      <p>
        Sometimes, usually with a cap on concurrent visitors. We go through what that gives you in{" "}
        <Link href="/blog/free-website-visitor-tracking">free website visitor tracking</Link>.
      </p>
    </>
  );
}
