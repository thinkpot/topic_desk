import Link from "next/link";
import type { PostMeta } from "@/lib/blog";

export const meta: PostMeta = {
  slug: "how-to-add-live-chat-to-your-website",
  title: "How to add live chat to your website",
  description:
    "A practical walkthrough: the three ways to add chat to a site, what the script tag actually does, and how to install it on WordPress, Shopify, Wix, Squarespace or plain HTML.",
  keyword: "how to add live chat to website",
  category: "Guides",
  date: "2026-09-27",
  readingMinutes: 8,
};

export default function Body() {
  return (
    <>
      <p>
        Adding live chat to a website is a ten-minute job. Deciding <em>where the messages go</em> is the part
        that takes thought, and it is the part that decides whether the chat box is useful or just another inbox
        nobody opens.
      </p>
      <p>
        This guide covers what you actually need, the three common approaches, and the exact install steps for the
        platforms most people are on.
      </p>

      <h2>What a live chat widget is</h2>
      <p>
        A live chat widget is the small chat launcher that sits in the corner of a website, usually bottom right.
        A visitor clicks it, types a question, and somebody on your side answers. Technically it is a script you
        add to your pages that draws the chat box and connects it to a service that stores and routes the
        messages.
      </p>
      <p>
        Everything else — chatbots, canned replies, visitor tracking, ticketing — is built on top of that one
        idea.
      </p>

      <h2>Decide where the messages should land</h2>
      <p>
        Before you install anything, answer this: when a visitor sends a message at 4pm on a Tuesday, what makes
        somebody notice within a minute? There are three realistic answers.
      </p>

      <h3>1. A dedicated support inbox</h3>
      <p>
        Tools like Intercom, Zendesk or Tawk give you a web dashboard and a mobile app. This works well when you
        have people whose actual job is support and who keep that dashboard open all day. It works badly for
        small teams, because the dashboard becomes one more tab nobody remembers to check.
      </p>

      <h3>2. A messenger you already use</h3>
      <p>
        Route chats into Telegram, Slack or WhatsApp instead. Nobody installs anything new, and the notification
        arrives on a phone that is already unlocked. The trade-off is that a group chat can get messy if every
        visitor's messages land in the same thread — which is why per-conversation threading matters.
      </p>

      <h3>3. Email</h3>
      <p>
        Cheapest, and worst for live chat. Email latency turns a live conversation into a slow exchange, and the
        visitor has usually left the site by the time you reply. Fine as a fallback for out-of-hours, not as the
        main route.
      </p>

      <div className="callout">
        <p>
          <strong>The practical test:</strong> whatever you choose, someone on your team should get a phone
          notification without installing a new app or logging in to anything. If that is not true, your median
          response time will be hours, not minutes — and a chat widget that answers in hours is worse than no
          chat widget, because it sets an expectation you then miss.
        </p>
      </div>

      <h2>What you need before you start</h2>
      <ul>
        <li>
          <strong>Access to your site&apos;s HTML or a way to inject scripts.</strong> Nearly every platform has
          this, whether it is a theme file, a plugin, or a &ldquo;custom code&rdquo; box in settings.
        </li>
        <li>
          <strong>A decision about who answers</strong> and on what device, as above.
        </li>
        <li>
          <strong>A first message.</strong> Write the greeting before you install, not after. &ldquo;Hi! How can
          we help?&rdquo; is fine; something specific to the page is better.
        </li>
      </ul>
      <p>
        You do not need a developer, and you do not need to change your site&apos;s framework. Every mainstream
        chat tool ships as a single script tag.
      </p>

      <h2>Installing the widget</h2>
      <p>
        Whatever tool you pick, you will be given a snippet that looks roughly like this — a script tag carrying
        a key that identifies your account:
      </p>
      <p>
        <code>&lt;script src=&quot;https://example.com/widget.js&quot; data-api-key=&quot;...&quot; async&gt;&lt;/script&gt;</code>
      </p>
      <p>
        It goes immediately before the closing <code>&lt;/body&gt;</code> tag, on every page you want chat to
        appear on. The <code>async</code> attribute matters: it tells the browser to carry on rendering your page
        rather than waiting for the chat script, so the widget cannot slow down your page load.
      </p>

      <h3>WordPress</h3>
      <p>
        Appearance → Theme File Editor → <code>footer.php</code>, and paste before <code>&lt;/body&gt;</code>. If
        you would rather not edit theme files — and you shouldn&apos;t, because a theme update can wipe the
        change — use a header-and-footer script plugin, or your theme&apos;s built-in &ldquo;custom
        scripts&rdquo; setting if it has one.
      </p>

      <h3>Shopify</h3>
      <p>
        Online Store → Themes → … → Edit code → <code>theme.liquid</code>. Paste before{" "}
        <code>&lt;/body&gt;</code> and save. It applies to every page of the storefront, checkout excluded on
        some plans.
      </p>

      <h3>Wix</h3>
      <p>
        Settings → Custom Code → Add Custom Code. Paste the snippet, set it to load on all pages, and choose
        &ldquo;Body — end&rdquo; as the placement.
      </p>

      <h3>Squarespace</h3>
      <p>
        Settings → Advanced → Code Injection, and paste into the Footer box. Note that code injection needs a
        paid Squarespace plan.
      </p>

      <h3>Webflow, Framer and Ghost</h3>
      <p>
        All three have a site-settings field for custom code before <code>&lt;/body&gt;</code>. In Webflow it is
        Project Settings → Custom Code → Footer Code; in Ghost it is Settings → Code injection → Site Footer.
      </p>

      <h3>Plain HTML</h3>
      <p>
        Paste it before <code>&lt;/body&gt;</code> in each page, or in whatever template or include generates
        your footer.
      </p>

      <h2>Check it actually works</h2>
      <p>Do not skip this, and do not test only on your own laptop.</p>
      <ol>
        <li>Open your site in a private browsing window, so you are treated as a new visitor.</li>
        <li>Send a message through the widget.</li>
        <li>
          Confirm it arrives wherever you decided messages should go, and that the notification is loud enough to
          notice.
        </li>
        <li>Reply, and check the reply appears in the visitor&apos;s chat window.</li>
        <li>Repeat on a phone. Most visitors are on one, and a widget that covers your checkout button on mobile costs you money.</li>
      </ol>

      <h2>Settings worth changing on day one</h2>
      <ul>
        <li>
          <strong>Restrict the widget to your own domains.</strong> Your widget key ships in your page source,
          where anybody can read it. A domain allowlist means it only works on your site.
        </li>
        <li>
          <strong>Set the greeting per page if you can.</strong> A pricing page and a blog post deserve different
          openers.
        </li>
        <li>
          <strong>Match the theme to your site.</strong> A widget in a stock colour that clashes with everything
          reads as a bolt-on and gets ignored.
        </li>
        <li>
          <strong>Decide what happens out of hours.</strong> Either say when you will reply, or collect an email
          address. Silence is the worst option.
        </li>
      </ul>

      <h2>How Chatshore does it</h2>
      <p>
        Chatshore takes the second approach above. You connect a Telegram group, paste one script tag, and every
        visitor conversation opens as its own topic inside that group — so two visitors never get tangled in one
        thread, and your team replies from Telegram on the phone they already carry.
      </p>
      <p>
        Setup is a wizard that checks your bot token, your group, whether Topics is enabled and whether the bot
        has permission to create them, all before it saves anything. If something is wrong it tells you which
        thing, rather than failing silently once a visitor is already waiting.
      </p>

      <h2>Common questions</h2>

      <h3>How do I add live chat to my website for free?</h3>
      <p>
        Most tools have a free tier, and they differ mainly in what they take away: agent seats, chat history,
        branding removal, or the number of conversations a month. Read that list before you install, because
        migrating later means changing the snippet on every page and losing your history. We go through the
        trade-offs in our guide to{" "}
        <Link href="/blog/free-live-chat-software-for-your-website">free live chat software</Link>.
      </p>

      <h3>Will a chat widget slow down my site?</h3>
      <p>
        Not measurably, provided the snippet is loaded with <code>async</code> or <code>defer</code> and placed at
        the end of the body. That way the browser renders your page first and fetches the widget afterwards. A
        widget that blocks rendering is a badly built widget.
      </p>

      <h3>Can I add live chat without any coding?</h3>
      <p>
        Yes. Pasting a script tag into a settings box is not coding, and on WordPress and Shopify there are
        plugins and apps that do even that for you.
      </p>

      <h3>Do I need a chatbot as well?</h3>
      <p>
        Only if the same handful of questions keeps arriving. A bot that answers &ldquo;where is my order&rdquo;
        and hands everything else to a human saves real time; a bot that stands between a customer and a person
        loses you the sale. See{" "}
        <Link href="/blog/live-chat-vs-chatbot">live chat vs chatbot</Link> for how to decide.
      </p>

      <h3>Where should the widget sit on the page?</h3>
      <p>
        Bottom right is the convention, and conventions are worth following — people look there. The exception is
        mobile, where you should check it does not cover a sticky &ldquo;Add to cart&rdquo; or &ldquo;Buy
        now&rdquo; button.
      </p>
    </>
  );
}
