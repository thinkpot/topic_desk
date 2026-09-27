import type { Metadata } from "next";
import Link from "next/link";
import { BRAND_NAME } from "@/lib/brand";
import { LEGAL } from "@/lib/legal";
import LegalPage from "@/components/LegalPage";

export const metadata: Metadata = {
  title: `Refund and Cancellation Policy | ${BRAND_NAME}`,
  description: `${BRAND_NAME} offers a ${LEGAL.refundWindowDays}-day money-back guarantee on every payment, on top of a ${LEGAL.trialDays}-day free trial that needs no card. How to cancel and how to claim a refund.`,
};

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund and Cancellation Policy"
      summary={`Try ${BRAND_NAME} free for ${LEGAL.trialDays} days without giving us a card. If you then pay and change your mind, ask within ${LEGAL.refundWindowDays} days and we will refund you in full.`}
    >
      <h2>1. Try it before you pay</h2>
      <p>
        Every account starts with a {LEGAL.trialDays}-day free trial. It needs no credit card and no payment
        details, and nothing is charged when it ends. We would rather you tested the Service properly during the
        trial than paid and asked for the money back, so please use it.
      </p>

      <h2>2. The {LEGAL.refundWindowDays}-day money-back guarantee</h2>
      <p>
        If you pay for a plan and are not happy with it, email us within{" "}
        <strong>{LEGAL.refundWindowDays} days of that payment</strong> and we will refund it in full. You do not
        have to justify the request.
      </p>
      <ul>
        <li>It applies to each payment, including renewals — the window runs from the date of that payment.</li>
        <li>It applies to monthly and annual plans alike.</li>
        <li>You keep access until the refund is processed, after which the account returns to the free tier.</li>
      </ul>

      <h2>3. After {LEGAL.refundWindowDays} days</h2>
      <p>
        Once the window has passed, payments for that period are non-refundable, and we do not refund partial or
        unused time. You can still cancel at any point to stop the next renewal — see below.
      </p>
      <p>
        We may still refund outside the window at our discretion, for example if the Service was unavailable for a
        sustained period or you were billed in error. Ask us, and we will look at it fairly.
      </p>

      <h2>4. How to request a refund</h2>
      <p>
        Email <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a> from the address on your account,
        with the invoice number or payment reference. That is all we need.
      </p>
      <ul>
        <li>We acknowledge the request within 24 hours.</li>
        <li>We approve or respond within 3 working days.</li>
        <li>
          Approved refunds are returned by the same route you paid — normally a bank transfer — within 7 to 10
          working days. How quickly it appears then depends on your bank.
        </li>
        <li>Refunds are made in Indian Rupees for the amount received. We do not cover exchange-rate movements or your bank&apos;s transfer fees.</li>
      </ul>

      <h2>5. Cancelling</h2>
      <p>
        You can cancel at any time from your dashboard, or by emailing us. Cancelling stops the next renewal; it is
        not itself a refund request.
      </p>
      <ul>
        <li>Your plan continues to the end of the period you have already paid for.</li>
        <li>After that the account returns to the free tier and your chatbots stop serving traffic.</li>
        <li>
          Your configuration and conversation history are kept, so you can pick up where you left off if you come
          back. Deleting your account erases them permanently.
        </li>
      </ul>

      <h2>6. When we will not refund</h2>
      <ul>
        <li>Requests made more than {LEGAL.refundWindowDays} days after the payment, except at our discretion.</li>
        <li>
          Accounts terminated by us for breaching the <Link href="/terms">Terms of Service</Link>, such as spam or
          unlawful use.
        </li>
        <li>
          Problems caused entirely by services outside our control — for instance Telegram suspending your bot, or
          your own website being offline.
        </li>
        <li>Requests to refund a period during which the account was used normally and the Service worked as described.</li>
      </ul>

      <h2>7. Billing errors and duplicate payments</h2>
      <p>
        If you were charged twice, charged the wrong amount, or charged after cancelling, tell us and we will return
        the difference in full. This is not discretionary and is not limited by the{" "}
        {LEGAL.refundWindowDays}-day window.
      </p>

      <h2>8. Price changes</h2>
      <p>
        If we raise the price of a plan you are on, we will tell you before it applies to your next period. You can
        cancel rather than accept it. We do not apply a price change to a period you have already paid for.
      </p>

      <h2>9. Contact</h2>
      <p>
        {LEGAL.entity}, {LEGAL.address}. Customer care:{" "}
        <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a>. Grievance Officer:{" "}
        {LEGAL.grievanceOfficer.name},{" "}
        <a href={`mailto:${LEGAL.grievanceOfficer.email}`}>{LEGAL.grievanceOfficer.email}</a>. Complaints are
        acknowledged within 24 hours and resolved within 15 days.
      </p>
    </LegalPage>
  );
}
