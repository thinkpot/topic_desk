import type { Metadata } from "next";
import { BRAND_NAME } from "@/lib/brand";
import { LEGAL } from "@/lib/legal";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: `Privacy Policy | ${BRAND_NAME}`,
  description: `How ${BRAND_NAME} collects, uses and protects personal data for account holders and for visitors who chat through the widget.`,
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      summary={`This policy explains what ${BRAND_NAME} collects, why, who else can see it, and what you can ask us to do with it. It covers two different groups: our customers, and the visitors who chat through a customer's widget.`}
    >
      <h2>1. Who we are</h2>
      <p>
        {BRAND_NAME} is operated by {LEGAL.entity}, {LEGAL.address}.
        {LEGAL.gstin && <> GSTIN: {LEGAL.gstin}.</>} For anything in this policy, write to{" "}
        <a href={`mailto:${LEGAL.privacyEmail}`}>{LEGAL.privacyEmail}</a>.
      </p>
      <p>
        {BRAND_NAME} is a live chat widget. A website owner installs it on their site, and every visitor
        conversation is relayed into that owner&apos;s Telegram group so their team can reply from Telegram.
      </p>

      <h2>2. Our two roles</h2>
      <p>
        <strong>For our customers&apos; account data</strong> we decide what is collected and why, so we are the
        Data Fiduciary (controller).
      </p>
      <p>
        <strong>For the data of visitors who chat through a widget</strong> we are only the Data Processor. The
        website owner who installed the widget decides what is asked and why, and they are the Data Fiduciary. We
        handle that data on their instructions. If you are a visitor who chatted on somebody&apos;s website and
        want your data removed, contact that website owner first — if you contact us, we will pass the request on
        to them.
      </p>

      <h2>3. What we collect</h2>
      <h3>From customers</h3>
      <ul>
        <li>
          <strong>Account details:</strong> your name, email address and a one-way hash of your password. We never
          store the password itself.
        </li>
        <li>
          <strong>Optional business details:</strong> company name and website address, if you enter them at signup.
        </li>
        <li>
          <strong>Chatbot configuration:</strong> your Telegram bot token, group chat ID, allowed domains and widget
          settings. The bot token is stored on our servers and is never sent to a browser or included in any API
          response.
        </li>
        <li>
          <strong>Billing records:</strong> which plan you are on, when it expires, and the plan requests you make.
          We do not take card payments in the app, so we hold no card numbers.
        </li>
      </ul>
      <h3>From visitors, on behalf of our customers</h3>
      <ul>
        <li>
          <strong>A random visitor ID</strong> generated in the browser, so a returning visitor keeps the same
          conversation. It is not linked to a name or an account.
        </li>
        <li>
          <strong>Message content</strong> — everything typed into the chat, and anything the chatbot flow is
          configured to ask for, such as a name, phone number or order number.
        </li>
        <li>
          <strong>Page context:</strong> the page URL being viewed, the referring URL, scroll depth, browser user
          agent, and the recent pages visited on that site.
        </li>
        <li>
          <strong>Aggregate counts</strong> of how often the widget was shown and opened, held as daily totals with
          no personal data attached.
        </li>
      </ul>
      <p>
        We briefly hold visitor IP addresses in memory to apply rate limits and block abuse. They are not written to
        our database.
      </p>

      <h2>4. What we do not do</h2>
      <ul>
        <li>
          <strong>No tracking cookies.</strong> The widget uses your browser&apos;s local storage to remember a
          visitor ID and which messages have been seen. It sets no cookies and does not track anyone across other
          websites.
        </li>
        <li>
          <strong>No advertising trackers and no social pixels</strong>, anywhere.
        </li>
        <li>
          <strong>Nothing third-party inside the chat widget.</strong> The widget we put on our customers&apos;
          websites loads no analytics and sets no cookies — so visitors to their sites are not measured by us at
          all. That is a deliberate product decision, not just a policy.
        </li>
        <li>
          <strong>We never sell personal data</strong>, and we do not share it for anyone else&apos;s marketing.
        </li>
        <li>
          <strong>We do not read your conversations</strong> to train models or build profiles.
        </li>
      </ul>

      <h2>5. Analytics and cookies on this website</h2>
      <p>
        We use Google Analytics on chatshore.vercel.app to understand how people find us and where they get stuck —
        which pages are read, which buttons are used, and how many visitors go on to start a trial. It sets cookies
        in your browser and sends Google your IP address, the pages you view and basic device information.
      </p>
      <p>
        We never send Google your name, your email address or anything typed into a chat. We do not use it for
        advertising and we do not combine it with your account to build a profile of you.
      </p>
      <p>
        You can opt out with Google&apos;s{" "}
        <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer">
          browser add-on
        </a>
        , or by blocking the script — the site works normally either way, and nothing we do depends on it.
      </p>

      <h2>6. Who else receives data</h2>
      <p>Running the service means a small number of other companies necessarily handle data:</p>
      <ul>
        <li>
          <strong>Telegram</strong> — this is the core of the product. Every visitor message is sent to the
          customer&apos;s Telegram group, and Telegram&apos;s own privacy policy governs it from that point. Anyone
          in that Telegram group can read those conversations.
        </li>
        <li>
          <strong>Our hosting and database providers</strong> — they store the data at rest and process it in transit
          so the service can run.
        </li>
        <li>
          <strong>A public script CDN</strong> — the widget loads its real-time connection library from a public
          content delivery network, so a visitor&apos;s browser contacts that CDN. It receives the request itself,
          not the conversation.
        </li>
        <li>
          <strong>Authorities</strong> — only where we are legally required to disclose, and we will tell you unless
          the law prevents us.
        </li>
      </ul>
      <p>
        Some of these providers operate servers outside {LEGAL.jurisdictionCountry}, so your data may be processed
        abroad.
      </p>

      <h2>7. How long we keep it</h2>
      <ul>
        <li>
          <strong>Account and chatbot data</strong> — for as long as the account exists.
        </li>
        <li>
          <strong>Conversations and visitor records</strong> — until deleted. Deleting a chatbot deletes its
          conversations, messages and live-visitor records; closing an account deletes all of it.
        </li>
        <li>
          <strong>Records we must keep by law</strong>, such as invoices, are retained for the statutory period even
          after an account closes.
        </li>
      </ul>
      <p>
        Messages already delivered into a Telegram group stay in that group. We cannot delete them for you — the
        group&apos;s owner controls that.
      </p>

      <h2>8. How we protect it</h2>
      <ul>
        <li>Passwords are stored using bcrypt, and are never recoverable in plain text.</li>
        <li>All traffic runs over HTTPS.</li>
        <li>
          Changing a password, or an account being suspended, immediately invalidates every existing login session
          and disconnects live connections.
        </li>
        <li>
          Each widget key works only on the website domains its owner has allowed, and can be regenerated instantly
          if it leaks.
        </li>
        <li>Login, signup and widget endpoints are rate limited to resist brute force and abuse.</li>
      </ul>
      <p>
        No system is perfectly secure. If a breach affects your personal data, we will notify you and the Data
        Protection Board as the law requires.
      </p>

      <h2>9. Your rights</h2>
      <p>
        Under the Digital Personal Data Protection Act, 2023, you may ask us to give you a copy of your personal
        data, correct anything inaccurate, erase it, or nominate someone to exercise these rights if you die or
        become incapacitated. You may also withdraw consent at any time, though we may then be unable to keep
        providing the service.
      </p>
      <p>
        Email <a href={`mailto:${LEGAL.privacyEmail}`}>{LEGAL.privacyEmail}</a> and we will respond within 30 days.
        You can delete most data yourself at any time from your dashboard.
      </p>

      <h2>10. Children</h2>
      <p>
        {BRAND_NAME} is a business tool and is not directed at children. We do not knowingly collect personal data
        from anyone under 18. If you believe a child&apos;s data has reached us, write to us and we will delete it.
      </p>

      <h2>11. Changes</h2>
      <p>
        We will update this page when our practices change, and revise the date at the top. If a change materially
        affects your rights we will email account holders before it takes effect.
      </p>

      <h2>12. Grievances</h2>
      <p>
        Our Grievance Officer under the Digital Personal Data Protection Act, 2023 and the Information Technology
        Act, 2000 is {LEGAL.grievanceOfficer.name},{" "}
        <a href={`mailto:${LEGAL.grievanceOfficer.email}`}>{LEGAL.grievanceOfficer.email}</a>, at {LEGAL.entity},{" "}
        {LEGAL.address}. Complaints are acknowledged within 24 hours and resolved within 15 days. If you are not
        satisfied with our response, you may complain to the Data Protection Board of India.
      </p>
    </LegalPage>
  );
}
