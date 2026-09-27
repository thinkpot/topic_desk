import Link from "next/link";
import type { PostMeta } from "@/lib/blog";

export const meta: PostMeta = {
  slug: "is-website-visitor-tracking-legal",
  title: "Is website visitor tracking legal?",
  description:
    "Where the line sits between analytics and surveillance, what India's DPDP Act and the GDPR expect, when you need consent, and how to track visitors without collecting things you shouldn't.",
  keyword: "is website tracking legal",
  category: "Privacy & security",
  date: "2026-09-18",
  readingMinutes: 8,
};

export default function Body() {
  return (
    <>
      <p>
        Broadly, yes. Measuring how people use your website is a normal and lawful thing to do. What turns it
        into a problem is doing it silently, collecting more than you need, or quietly building a profile of a
        named individual when all you set out to do was count page views.
      </p>
      <p>
        This is a plain-English orientation, not legal advice — if you handle sensitive data or operate at scale,
        take proper advice for your jurisdiction. What follows is the general shape of the rules and a practical
        way to stay well inside them.
      </p>

      <h2>The principle underneath all of it</h2>
      <p>
        Nearly every modern privacy law rests on the same two ideas: people should know what is being collected
        about them, and in some circumstances they should be able to decide. Notice, then — where required —
        consent.
      </p>
      <p>
        Read that way, most of the compliance work is unglamorous. Write down what you collect. Tell people. Only
        collect what you have a reason for. Delete it when the reason expires. Almost every enforcement story you
        read about tracking is a failure of one of those four, not a novel legal argument.
      </p>

      <h2>India: the Digital Personal Data Protection Act, 2023</h2>
      <p>
        The DPDP Act is India&apos;s general data protection law. It applies to digital personal data — anything
        that identifies a person — and it is built around consent. Its practical expectations for a website
        owner:
      </p>
      <ul>
        <li>
          <strong>Notice.</strong> Tell people what personal data you are collecting and what you will do with
          it, in clear language, before or at the point of collection.
        </li>
        <li>
          <strong>Consent, where that is your basis.</strong> It must be free, specific, informed and
          unambiguous, given for a stated purpose — and withdrawable as easily as it was given.
        </li>
        <li>
          <strong>Purpose limitation.</strong> Use the data for what you said you would use it for. Collecting
          for support and then repurposing for advertising is exactly the move the principle exists to prevent.
        </li>
        <li>
          <strong>Individual rights.</strong> People can ask what you hold, have it corrected, and have it
          erased.
        </li>
        <li>
          <strong>A grievance route.</strong> You are expected to publish a way to raise a complaint, including a
          named contact for it.
        </li>
      </ul>
      <p>
        The Act leaves a fair amount to rules made under it, and details continue to be worked out. Treat the
        principles as settled and the procedural specifics as something to check rather than assume.
      </p>

      <h2>EU visitors: the GDPR and ePrivacy</h2>
      <p>
        If people in the EU or UK use your site, those rules can reach you regardless of where you are based. Two
        things matter most in practice.
      </p>
      <p>
        First, the ePrivacy rules govern storing or reading information on someone&apos;s device — cookies, and
        also local storage and similar techniques. Anything not strictly necessary to deliver the service the
        visitor asked for generally needs consent <em>before</em> it is set. Analytics and advertising cookies
        fall on the consent side; a cookie that keeps someone logged in does not.
      </p>
      <p>
        Second, the GDPR requires a lawful basis for processing personal data, of which consent is one. It also
        requires transparency, data minimisation, and honouring access and erasure requests. A consent banner
        that only offers &ldquo;Accept&rdquo; does not meet the standard — refusing has to be as easy as
        agreeing.
      </p>

      <h2>Aggregate measurement versus identifying a person</h2>
      <p>
        This is the distinction that decides how much of the above applies to you, and it is worth being precise
        about.
      </p>

      <h3>Aggregate measurement</h3>
      <p>
        Counting how many people viewed a page, which pages they came from, and where they left. No names, no
        attempt to recognise the same person on a later visit, nothing that singles anybody out. This is the
        lightest-touch end, and it is enough for most decisions a small site actually makes.
      </p>

      <h3>Identifying an individual</h3>
      <p>
        Attaching a persistent identifier to a person, linking visits to an email address, or enriching a session
        with details about who somebody is. Now you are processing personal data, and notice, lawful basis,
        retention limits and access rights all apply in full.
      </p>
      <p>
        Most tools sit somewhere in between, and vendors are not always clear about where. If you want to know
        what a given tool is really recording, the fields it stores tell you more than its marketing does — we
        went through them in{" "}
        <Link href="/blog/website-visitor-tracking-software">website visitor tracking software</Link>.
      </p>

      <div className="callout">
        <p>
          <strong>Why cookie banners exist — and when they stop being necessary.</strong> The banner is a
          response to ePrivacy: you are storing something on the visitor&apos;s device that is not strictly
          necessary, so you must ask first. A tool that sets no cookies changes that conversation. It does not
          exempt you from everything — if you still process personal data, notice and lawful basis still apply,
          and local storage is not automatically outside the rules either. But if nothing on your site stores
          non-essential data on a visitor&apos;s device, the specific reason for a consent banner may not arise.
        </p>
      </div>

      <h2>Are website trackers illegal?</h2>
      <p>
        No. &ldquo;Tracker&rdquo; is a broad word covering everything from a page-view counter to a cross-site
        advertising network, and the legal position differs across that range. Nothing in the category is
        prohibited outright in India or the EU. What is regulated is doing it without telling people, without
        consent where consent is required, or beyond the purpose you stated.
      </p>
      <p>
        The practical difference between analytics and surveillance is not the technology, it is scope and
        disclosure. Counting visits to your own pages, and saying so, is measurement. Following the same person
        across unrelated sites to build a profile, without their knowledge, is the thing the rules were written
        about.
      </p>

      <h2>B2B company lookup: the greyer area</h2>
      <p>
        Some tools resolve a visitor&apos;s IP address to the organisation it belongs to, so you see that
        somebody at a company visited your pricing page. The argument for it is that a company is not a person
        and this is not personal data.
      </p>
      <p>
        It is greyer than that. An IP address can be personal data in the EU, particularly when combined with
        other information, and a small company&apos;s network may effectively identify one or two individuals. It
        also tends to be unreliable — mobile networks, VPNs and home broadband produce results that are wrong
        often enough to matter. If you use it, disclose it in your privacy notice and treat the output as a weak
        signal, not a fact about a named person.
      </p>

      <h2>A practical checklist</h2>
      <ul>
        <li>
          <strong>Say what you collect</strong> in your privacy notice, specifically enough that a reader could
          verify it.
        </li>
        <li>
          <strong>Collect the minimum.</strong> Every field you do not store is a field you never have to
          protect, explain or delete.
        </li>
        <li>
          <strong>Set a retention period</strong> and actually enforce it. &ldquo;Forever&rdquo; is not a
          retention policy.
        </li>
        <li>
          <strong>Keep personal data out of URLs.</strong> Email addresses in query strings end up in referrer
          headers, server logs and every analytics tool on the page.
        </li>
        <li>
          <strong>Publish a route for deletion requests</strong> — an address that reaches a person who can act
          on it, and in India, a named grievance contact.
        </li>
        <li>
          <strong>Audit your third-party scripts.</strong> You are answerable for what they collect on your
          pages, including ones added years ago for a campaign that ended.
        </li>
        <li>
          <strong>Check what your chat widget stores</strong> alongside everything else, since it runs on every
          page — the questions to ask are in{" "}
          <Link href="/blog/is-a-live-chat-widget-safe">is a live chat widget safe</Link>.
        </li>
      </ul>

      <h2>How Chatshore does it</h2>
      <p>
        Chatshore&apos;s live visitor tracking records the current page, the referrer, scroll depth, the recent
        path through the site and the user agent. It does not do IP-to-company identification, does not identify
        visitors by name, and does not follow anyone across other websites.
      </p>
      <p>
        It sets no tracking cookies and runs no analytics or advertising trackers — the widget keeps a random
        visitor ID and the last-seen message in the browser&apos;s local storage so a conversation survives a
        page refresh. Conversations are relayed into your Telegram group, which means everyone in that group can
        read them and Telegram&apos;s privacy policy applies to the data once it arrives; worth a line in your
        own privacy notice.
      </p>

      <h2>Common questions</h2>

      <h3>Is website tracking legal?</h3>
      <p>
        Generally yes, when visitors are told what is collected and have agreed where agreement is required. The
        legal risk comes from collecting silently, collecting more than you disclosed, or keeping it
        indefinitely.
      </p>

      <h3>Are website trackers illegal?</h3>
      <p>
        No category of tracker is banned outright under India&apos;s DPDP Act or the GDPR. Specific practices are
        regulated — notably setting non-essential cookies before consent, and using data for purposes you never
        stated.
      </p>

      <h3>Can a website see who visits it?</h3>
      <p>
        Not by name, from the visit alone. A site sees an IP address, a user agent, the page requested and the
        referrer. It learns who you are when you tell it — by logging in, filling a form, or clicking a link that
        carries an identifier from an email.
      </p>

      <h3>Do I need a cookie banner?</h3>
      <p>
        It depends on whether anything on your site stores non-essential information on a visitor&apos;s device,
        and on where your visitors are. If you run advertising or analytics cookies and have EU visitors, you
        almost certainly need consent before they are set. If nothing non-essential is stored, the usual reason
        for the banner may not apply — though notice obligations remain.
      </p>

      <h3>Can I track visitors without cookies?</h3>
      <p>
        Yes. Server-side page counting and cookieless analytics both exist, and many tools that historically used
        cookies no longer need to. Cookieless is not the same as consent-free in every case, but it removes one
        of the main triggers and generally means you are collecting less. The options are covered in{" "}
        <Link href="/blog/free-website-visitor-tracking">free website visitor tracking</Link>.
      </p>
    </>
  );
}
