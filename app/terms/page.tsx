import type { Metadata } from "next";
import Link from "next/link";
import { BRAND_NAME } from "@/lib/brand";
import { LEGAL } from "@/lib/legal";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: `Terms of Service | ${BRAND_NAME}`,
  description: `The agreement between you and ${BRAND_NAME}: free trial, plans and billing, acceptable use, your responsibilities as a website owner, and liability.`,
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      summary={`These terms are the agreement between you and ${LEGAL.entity} for the use of ${BRAND_NAME}. By creating an account you accept them, so please read them.`}
    >
      <h2>1. Definitions</h2>
      <p>
        <strong>&ldquo;We&rdquo;, &ldquo;us&rdquo;</strong> means {LEGAL.entity}.{" "}
        <strong>&ldquo;You&rdquo;</strong> means the person or business holding an account.{" "}
        <strong>&ldquo;Service&rdquo;</strong> means the {BRAND_NAME} chat widget, dashboard and API.{" "}
        <strong>&ldquo;Visitor&rdquo;</strong> means a person who chats through a widget you have installed.{" "}
        <strong>&ldquo;Visitor Data&rdquo;</strong> means the messages and context those visitors generate.
      </p>

      <h2>2. Your account</h2>
      <ul>
        <li>You must be at least 18 and able to enter a binding contract.</li>
        <li>You must give accurate details and keep them current.</li>
        <li>
          You are responsible for everything done under your account, and for keeping your password and widget keys
          confidential. Tell us promptly if you suspect unauthorised access.
        </li>
        <li>One person or business per account. Do not share login credentials.</li>
      </ul>

      <h2>3. Free trial</h2>
      <p>
        New accounts get a {LEGAL.trialDays}-day free trial. We ask for no card and no payment details, and nothing
        is charged when it ends. When the trial expires your chatbots stop serving traffic and the dashboard locks
        until you move to a paid plan. Your configuration and conversation history are retained, not deleted.
      </p>
      <p>We may limit trials to one per person or business, and withdraw a trial we believe is being abused.</p>

      <h2>4. Plans, billing and taxes</h2>
      <ul>
        <li>
          Plan prices, limits and features are shown on our pricing page and may change. If we change the price of a
          plan you are on, we will give you notice before it applies to your next period.
        </li>
        <li>
          <strong>We do not take card payments inside the app.</strong> You request a plan, we activate it and
          invoice you separately. Payment is due on the invoice terms.
        </li>
        <li>
          Prices are in Indian Rupees and are exclusive of GST and any other applicable taxes, which are added to
          the invoice.
        </li>
        <li>
          Plans run for the period you buy, monthly or annually, and do not auto-renew through a stored payment
          method. We will contact you about renewal.
        </li>
        <li>
          If an invoice goes unpaid, or a plan expires without renewal, your chatbots stop serving traffic until it
          is settled.
        </li>
      </ul>
      <p>
        Refunds are covered by our <Link href="/refunds">Refund Policy</Link>, which forms part of these terms.
      </p>

      <h2>5. Plan limits</h2>
      <p>
        Each plan caps the number of chatbots, the visitor conversations per month, and how many live visitors you
        can see at once. If you exceed a limit we may ask you to upgrade, and we may decline to serve traffic beyond
        it. We do not bill you for overage without telling you first.
      </p>

      <h2>6. Your responsibilities to your visitors</h2>
      <p>This matters more than anything else in these terms.</p>
      <ul>
        <li>
          <strong>You are the Data Fiduciary for Visitor Data.</strong> We only process it on your instructions.
        </li>
        <li>
          <strong>You must tell your visitors</strong>, in your own privacy notice, that a chat widget is in use,
          that their messages are relayed to a Telegram group, and what you collect through it. You must obtain any
          consent the law requires of you.
        </li>
        <li>
          <strong>You control who is in your Telegram group.</strong> Everyone in that group can read every visitor
          conversation. Managing that access is your responsibility, not ours.
        </li>
        <li>
          <strong>Do not use chatbot flows to collect sensitive data</strong> such as card numbers, passwords,
          government identifiers or health information. The Service is not built or certified for it.
        </li>
        <li>You must answer your visitors&apos; data requests, and we will help you where we reasonably can.</li>
      </ul>

      <h2>7. Acceptable use</h2>
      <p>You may not use the Service to:</p>
      <ul>
        <li>break any law, or infringe anyone&apos;s rights;</li>
        <li>send spam or unsolicited bulk messages, or run deceptive or fraudulent schemes;</li>
        <li>publish or transmit malware, or anything unlawful, harassing, hateful or obscene;</li>
        <li>impersonate anybody, or misrepresent who you are;</li>
        <li>
          probe, overload or interfere with the Service, circumvent its limits, or reverse engineer it, except where
          the law expressly allows;
        </li>
        <li>resell or white-label the Service without our written agreement.</li>
      </ul>
      <p>
        You must also comply with Telegram&apos;s own terms of service and bot policies. Breaching them can get your
        bot disabled by Telegram, which we cannot reverse.
      </p>

      <h2>8. Telegram and other dependencies</h2>
      <p>
        The Service relays messages through Telegram, which we neither own nor control. If Telegram changes its API,
        rate-limits your bot, suspends it, or becomes unavailable, parts of the Service will stop working. We are
        not liable for that, though we will make reasonable efforts to adapt.
      </p>

      <h2>9. Ownership</h2>
      <p>
        We own the Service, its software, design and brand. You own your content and your Visitor Data. You grant us
        only the licence needed to host, process and transmit that data to run the Service for you. Nothing here
        transfers ownership either way.
      </p>
      <p>
        If you send us feedback or suggestions, we may use them to improve the Service without any obligation to
        you.
      </p>

      <h2>10. Availability</h2>
      <p>
        We work to keep the Service available, but we do not currently offer a guaranteed uptime commitment. The
        Service may be unavailable for maintenance, upgrades, or causes beyond our control. We may change or
        discontinue features; if we discontinue something material, we will give reasonable notice.
      </p>

      <h2>11. Suspension and termination</h2>
      <ul>
        <li>
          <strong>You</strong> may stop using the Service and close your account at any time from the dashboard or
          by writing to us.
        </li>
        <li>
          <strong>We</strong> may suspend or terminate an account that breaches these terms, that goes unpaid, or
          that puts the Service or other users at risk. Where practical we will warn you first; for serious breaches
          we may act immediately.
        </li>
        <li>
          On termination your access ends and your data is deleted, except anything we must keep by law. Export
          anything you need before closing your account.
        </li>
      </ul>

      <h2>12. Disclaimers</h2>
      <p>
        The Service is provided &ldquo;as is&rdquo;. To the extent the law allows, we disclaim all implied
        warranties, including merchantability, fitness for a particular purpose and non-infringement. We do not
        warrant that the Service will be uninterrupted, error free, or that messages will always be delivered — in
        particular, delivery depends on Telegram and on your visitors&apos; network conditions.
      </p>

      <h2>13. Limitation of liability</h2>
      <p>
        To the extent the law allows, neither party is liable for indirect, incidental, special or consequential
        loss, or for lost profits, revenue, goodwill or data, even if warned it was possible.
      </p>
      <p>
        Our total liability arising out of or relating to the Service, in aggregate, will not exceed the total fees
        you paid us in the three months immediately before the event giving rise to the claim. If you have paid us
        nothing, our liability is limited to ₹1,000.
      </p>
      <p>Nothing here excludes liability that cannot lawfully be excluded, such as for fraud.</p>

      <h2>14. Indemnity</h2>
      <p>
        You will indemnify us against claims, damages and reasonable costs arising from your use of the Service in
        breach of these terms, from your content or Visitor Data, or from your failure to give your visitors the
        notices and choices the law requires of you.
      </p>

      <h2>15. Changes to these terms</h2>
      <p>
        We may update these terms. We will revise the date at the top and, for material changes, email account
        holders in advance. Continuing to use the Service after a change means you accept it. If you do not, stop
        using the Service and close your account.
      </p>

      <h2>16. Governing law</h2>
      <p>
        These terms are governed by the laws of {LEGAL.jurisdictionCountry}. The courts at{" "}
        {LEGAL.jurisdictionCity} have exclusive jurisdiction, and both parties submit to it. We will each try in
        good faith to resolve a dispute informally before starting proceedings.
      </p>

      <h2>17. General</h2>
      <p>
        If any provision is held unenforceable, the rest stands. Not enforcing a right is not a waiver of it. You
        may not assign this agreement without our written consent; we may assign it as part of a merger or sale of
        the business. These terms, with the Privacy Policy and Refund Policy, are the entire agreement between us.
      </p>

      <h2>18. Contact</h2>
      <p>
        {LEGAL.entity}, {LEGAL.address}. Customer care:{" "}
        <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a>. Grievance Officer:{" "}
        {LEGAL.grievanceOfficer.name},{" "}
        <a href={`mailto:${LEGAL.grievanceOfficer.email}`}>{LEGAL.grievanceOfficer.email}</a>.
      </p>
    </LegalPage>
  );
}
