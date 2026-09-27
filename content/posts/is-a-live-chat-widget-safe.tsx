import Link from "next/link";
import type { PostMeta } from "@/lib/blog";

export const meta: PostMeta = {
  slug: "is-a-live-chat-widget-safe",
  title: "Is a live chat widget safe to put on your website?",
  description:
    "What a chat widget can see, what it can't, the real risks of putting third-party script on your pages, and the questions to ask a vendor before you install one.",
  keyword: "is live chat widget safe",
  category: "Privacy & security",
  date: "2026-09-19",
  readingMinutes: 7,
};

export default function Body() {
  return (
    <>
      <p>
        Installing a chat widget means pasting somebody else&apos;s JavaScript into your pages and letting it run
        with the same privileges as your own code. That is worth thinking about for a minute before you do it,
        and most articles on the subject skip straight to reassurance.
      </p>
      <p>
        Here is the honest version: what the risk actually is, what a well-built widget does to contain it, what
        the widget can and cannot see, and the questions that will tell you quickly whether a vendor has thought
        about any of this.
      </p>

      <h2>The real risk is supply chain</h2>
      <p>
        A chat widget is third-party code executing on your site. It is not sandboxed away from your page by
        default; it can read the DOM, it can see the URL, and it runs whenever your page loads. That is not a
        flaw in chat widgets specifically — it is true of every analytics tag, font loader and A/B testing script
        on the web — but it does mean you are extending trust.
      </p>
      <p>
        The consequence is straightforward. If the vendor&apos;s servers are compromised and somebody swaps the
        script, that modified script runs on your site, for your visitors, under your domain. This is the same
        class of problem behind the card-skimming attacks that periodically hit ecommerce sites. It is not
        hypothetical, and it is not a reason to avoid third-party scripts entirely — it is a reason to be
        deliberate about how many you run and whose they are.
      </p>
      <p>
        Practical mitigations on your side: keep the number of third-party scripts small, and know who each one
        belongs to. A Content Security Policy limits which origins can serve script to your pages, which narrows
        the blast radius if something else on your site is compromised.
      </p>

      <h2>What a well-built widget does to limit the damage</h2>

      <h3>It isolates its own interface</h3>
      <p>
        A widget&apos;s UI should be rendered in isolation from your page — typically inside a shadow root or an
        iframe — so its styles cannot leak into your layout and your styles cannot break it. The security benefit
        is the mirror image: a widget that keeps to its own container is not reaching into your page to rewrite
        buttons or read form fields. A widget that injects loose CSS into your document is telling you something
        about how carefully it was built.
      </p>

      <h3>Its key is restricted to your domains</h3>
      <p>
        The key in your script tag is a public identifier, not a credential. It should only work on domains the
        account owner has explicitly allowed, and you should be able to regenerate it immediately if you ever
        need to.
      </p>

      <h3>It holds no secrets in the browser</h3>
      <p>
        Anything genuinely sensitive — API tokens for the messaging platform, database credentials, signing keys
        — belongs on the server and must never appear in a browser payload or an API response. If you can find a
        token in the network tab that would let you act as the account, that is a real finding, not a design
        choice.
      </p>

      <div className="callout">
        <p>
          <strong>A publishable key in your page source is not a leak.</strong> People find their widget key by
          viewing source and assume something has gone wrong. It is meant to be visible — it identifies your
          account so the service knows where to route the message. What makes it safe is domain restriction: the
          key only works on the sites you listed, so copying it elsewhere achieves nothing. What would make it
          unsafe is a vendor with no domain allowlist and no way to rotate the key.
        </p>
      </div>

      <h2>What the widget can and cannot see</h2>
      <p>
        <strong>It can see:</strong> what a visitor types into the chat box, the URL of the page they are on, the
        referrer that brought them, their user agent, and whatever you deliberately pass it. If it offers visitor
        tracking it may also record scroll depth and the path through your site — the mechanics of that are in{" "}
        <Link href="/blog/website-visitor-tracking-software">website visitor tracking software</Link>.
      </p>
      <p>
        <strong>It should never see or transmit:</strong> passwords, card details, or anything typed into your
        own forms. A chat widget has no business reading your checkout fields, and one that does is doing
        something it has not told you about. It also cannot see other sites — browser origin rules mean a script
        on your domain has no access to what a visitor does elsewhere, unless the vendor runs tracking across a
        network of sites, which is a separate business model worth asking about.
      </p>
      <p>
        One thing worth saying to your own team: visitors will paste sensitive things into chat boxes regardless
        of what you tell them. Order numbers are fine. Card numbers, passwords and identity documents are not,
        and the only real defence is agents who are trained to stop the conversation and redirect it.
      </p>

      <h2>The risk on your own side of the conversation</h2>
      <p>
        This gets less attention than it deserves. Whatever route your chats take — a dashboard, a shared inbox,
        a messenger group — everyone with access to it can read every conversation. If you add a contractor to
        the support channel, they can read what customers have written.
      </p>
      <p>
        The failure mode here is mundane rather than exotic: an account that was never removed, a shared login, a
        channel that quietly accumulated people over two years. It is far less interesting than a supply-chain
        attack, and far easier to end up with.
      </p>
      <p>
        Access control is your responsibility, not the vendor&apos;s. Review who has access when people join and
        when they leave, and remember that in a group messenger, removing somebody stops them seeing new messages
        but does not unsee what they already read.
      </p>

      <h2>Are chats encrypted?</h2>
      <p>
        In transit, yes — any credible service runs over HTTPS, which means the connection between the
        visitor&apos;s browser and the server is encrypted, and again between the server and wherever the message
        is delivered. That is table stakes; a chat service on plain HTTP in 2026 should be disqualifying.
      </p>
      <p>
        End-to-end encryption is a different claim, and it is almost never what a support widget means. End-to-end
        would mean the provider cannot read the messages at all — which is incompatible with storing transcripts,
        searching history, or routing chats to an inbox. If a support vendor advertises end-to-end encryption,
        ask them directly whether they can read stored transcripts. If they can, the phrase is being used
        loosely, and it is fair to wonder what else is.
      </p>

      <h2>How Chatshore does it</h2>
      <p>
        Chatshore sets no tracking cookies — the widget keeps a random visitor ID and the last-seen message in the
        browser&apos;s local storage, runs no analytics or advertising trackers, does not identify visitors by
        name, and does not follow them across other websites. The widget&apos;s interface is isolated from your
        page, so it cannot alter your styling. The Telegram bot token stays server-side and never appears in a
        browser or an API response; the widget key is publishable, restricted to the domains you allow, and can be
        regenerated instantly. Passwords are hashed with bcrypt, and changing a password or suspending an account
        invalidates every existing session immediately.
      </p>
      <p>
        The limitation, stated plainly: messages are relayed into your Telegram group, so everyone in that group
        can read them, and once a message has been delivered there Chatshore cannot delete it — that is the
        group owner&apos;s to control, and Telegram&apos;s own privacy policy governs the data from that point.
        Chatshore also does not offer end-to-end encryption, and does not claim to.
      </p>

      <h2>Common questions</h2>

      <h3>Is a live chat widget safe?</h3>
      <p>
        From a reputable vendor, on HTTPS, with a domain-restricted key and an isolated UI, the risk is
        comparable to any other third-party script you already run. The judgement you are making is about the
        vendor, not the category.
      </p>

      <h3>Are live chats on websites safe for visitors?</h3>
      <p>
        Safe to use, yes. But visitors should treat a chat box as a channel somebody at the company will read,
        because that is what it is — fine for order numbers and questions, not for passwords or card details.
      </p>

      <h3>Is live chat encrypted?</h3>
      <p>
        In transit over HTTPS, on any service worth using. Stored transcripts are typically readable by the
        provider and by your own team, which is what makes transcripts searchable in the first place.
      </p>

      <h3>Can a chat widget steal data from my site?</h3>
      <p>
        A malicious or compromised script could read your page, which is precisely the supply-chain risk above.
        It is contained by running few third-party scripts, choosing vendors you can evaluate, and using a
        Content Security Policy.
      </p>

      <h3>What should I ask a vendor before installing?</h3>
      <p>
        Five questions, and the answers should be quick: Can I restrict the widget key to my domains, and rotate
        it myself? Is the widget&apos;s UI isolated from my page? What exactly do you store, and for how long? Who
        on your side can read my transcripts? Is any credential ever sent to the browser? Vagueness on any of
        these is itself an answer. If you are still comparing options, our roundup of{" "}
        <Link href="/blog/free-live-chat-software-for-your-website">free live chat software</Link> covers the
        trade-offs beyond security.
      </p>
    </>
  );
}
