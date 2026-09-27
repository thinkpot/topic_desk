import Link from "next/link";
import type { PostMeta } from "@/lib/blog";

export const meta: PostMeta = {
  slug: "telegram-bot-for-business",
  title: "Using a Telegram bot for business: what it can and can't do",
  description:
    "What Telegram bots are genuinely good at, the limits people hit, how forum topics change group support, and a walkthrough of creating a bot with BotFather.",
  keyword: "telegram bot for business",
  category: "Guides",
  date: "2026-09-21",
  readingMinutes: 8,
};

export default function Body() {
  return (
    <>
      <p>
        Telegram bots get described either as a marketing channel or as a magic automation layer, and both
        descriptions lead people into building the wrong thing. A bot is narrower than the pitch suggests, and
        more useful than most businesses realise once you know which jobs suit it.
      </p>
      <p>
        This is a practical explainer: what a bot is, the work it does well, how to create one, and the limits
        Telegram imposes that you should design around rather than discover later.
      </p>

      <h2>What a Telegram bot actually is</h2>
      <p>
        A Telegram bot is an account controlled by software rather than a person. It has a username, appears in
        chats like any other account, and can be added to groups. The difference is that nobody is typing:
        messages sent to it go to a program you run, and anything it says, that program decided to send.
      </p>
      <p>
        There is no built-in intelligence and no interface to log in to; a bot with no code behind it does
        nothing at all. Everything it does — menus, buttons, replies, alerts — is behaviour somebody wrote,
        against Telegram&apos;s API or through a product built on top of it.
      </p>

      <h2>What businesses realistically use them for</h2>

      <h3>Customer support routing</h3>
      <p>
        The most common serious use. Messages from customers, or from a website chat widget, arrive in a group
        where your team already is, and replies go back out. Nobody installs another app.
      </p>

      <h3>Notifications and alerts</h3>
      <p>
        Deployment failures, uptime checks, sign-ups, form submissions, payments. Anything that goes to an email
        nobody reads is a candidate: delivery is fast, and a group gives you a shared record of what fired and
        when.
      </p>

      <h3>Order and delivery updates</h3>
      <p>
        If your customers are on Telegram, a bot can send status changes as they happen — but the customer has
        to start the conversation first.
      </p>

      <h3>Internal tooling</h3>
      <p>
        The underrated one. A bot that answers <code>/stock ABC123</code> or takes a leave request saves
        building an internal web app three people would use.
      </p>

      <h2>Creating a bot with BotFather</h2>
      <p>BotFather is Telegram&apos;s own bot for making bots. The whole process is a short conversation.</p>
      <ol>
        <li>
          Search for <code>@BotFather</code> in Telegram, and check the verified tick — impersonators exist.
        </li>
        <li>
          Send <code>/newbot</code>.
        </li>
        <li>Give it a display name — what people see in the chat header. You can change this later.</li>
        <li>
          Give it a username. It must be unique across Telegram and end in <code>bot</code>, for example{" "}
          <code>acme_support_bot</code>. Unlike the display name, this is permanent in practice.
        </li>
        <li>
          BotFather replies with an API token, a long string with a colon in it. That is how your software
          proves it is your bot.
        </li>
      </ol>
      <p>
        While you are there, <code>/setdescription</code> and <code>/setuserpic</code> are worth doing: an
        unconfigured bot looks abandoned.
      </p>

      <div className="callout">
        <p>
          <strong>Treat the bot token as a password.</strong> Anyone holding it controls the bot completely:
          they can read its messages and send messages as you. Never paste it into a web page, a public
          repository or a screenshot. If it has ever been exposed, use <code>/revoke</code> in BotFather to
          issue a new one — the old token stops working immediately.
        </p>
      </div>

      <h3>Adding the bot to a group</h3>
      <p>
        Open the group, go to the member list, and add the bot by its username. For most business uses you
        then promote it to administrator, which is what lets it act on the group rather than sit in it — posting
        reliably, pinning, managing topics.
      </p>

      <h2>Forum topics, and why they matter</h2>
      <p>
        Topics are a supergroup feature that splits one group into separate threads, each with its own name and
        unread count. Switch it on in group settings and the group stops being one scrolling stream.
      </p>
      <p>
        This is what makes a Telegram group workable for support. Without it, ten customers messaging at once
        produce one tangled thread where replies attach to the wrong person. With it, each gets a thread that
        anyone on your team can open, read and answer.
      </p>

      <h2>The limits you need to design around</h2>

      <h3>A bot cannot message someone first</h3>
      <p>
        This is the big one, and it is deliberate. A bot can only message a user who has already started a
        conversation with it — by pressing Start, or by being in a group the bot is in. You cannot import a list
        of phone numbers and broadcast to them. Telegram is not a cold outreach channel.
      </p>

      <h3>A bot does not see everything in a group</h3>
      <p>
        By default, bots run in privacy mode: in a group they receive only commands, replies to their own
        messages, and messages that mention them. If yours needs to read everything, you turn privacy mode off
        in BotFather or make it an administrator — both choices you should be able to justify to that group.
      </p>

      <h3>There are rate limits</h3>
      <p>
        Telegram limits how fast a bot can send, with tighter limits for group messages than for one-to-one
        chats. At normal support volumes you will not notice. For anything sending to many chats at once you
        need queuing and retry handling — and read Telegram&apos;s own documentation for the current numbers.
      </p>

      <h2>How Chatshore does it</h2>
      <p>
        Chatshore uses exactly the arrangement above: you create a bot with BotFather, add it to a group with
        Topics enabled, and every conversation from your website&apos;s chat widget opens as its own topic
        there. Your team replies in Telegram and the visitor sees it within seconds.
      </p>
      <p>
        The setup wizard checks the parts people get wrong before saving anything — that the token is valid,
        that Topics is on, and that the bot is an admin able to manage topics. The token is stored server-side
        and never sent to a browser, and the install is one script tag, as described in{" "}
        <Link href="/blog/how-to-add-live-chat-to-your-website">how to add live chat to your website</Link>.
      </p>

      <h2>Common questions</h2>

      <h3>What can Telegram bots do?</h3>
      <p>
        Send and receive messages, show buttons and menus, handle commands, work inside groups and channels,
        accept files, and connect to whatever systems you give them access to. What they cannot do is act on
        their own initiative with strangers: everything starts from a user contacting the bot.
      </p>

      <h3>How to create a Telegram bot for business?</h3>
      <p>
        Message <code>@BotFather</code>, send <code>/newbot</code>, pick a name and a username ending in
        &ldquo;bot&rdquo;, and keep the token safe. That gives you the account; making it useful means writing
        code against the API or connecting it to a product that already has.
      </p>

      <h3>Is Telegram good for business?</h3>
      <p>
        Good for support, alerts and internal tooling, especially when your team is on it already. Poor as an
        acquisition channel, because you cannot message people who have not contacted you.
      </p>

      <h3>Are Telegram bots free?</h3>
      <p>
        Creating a bot and using the Bot API costs nothing. What costs money is the software behind it:
        somewhere to run it, plus development time or a subscription. If you are weighing that against a
        conventional chat dashboard,{" "}
        <Link href="/blog/free-live-chat-software-for-your-website">free live chat software</Link> covers the
        trade-offs.
      </p>
    </>
  );
}
