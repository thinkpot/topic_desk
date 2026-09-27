import Link from "next/link";

// Deliberately not built on the dismissable Modal in primitives.tsx — this one
// has no close button and no backdrop-click dismissal. It's shown whenever
// accountBlockReason() returns non-null (suspended, unpaid tier, or an
// expired trial/plan) on every dashboard route except Billing, which stays
// reachable as the only way out.
export default function TrialLockOverlay({
  reason,
  trialEnded,
  pendingPlanName,
}: {
  reason: string;
  trialEnded: boolean;
  pendingPlanName: string | null;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 px-4">
      <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-6 text-center shadow-pop">
        <h2 className="text-[17px] font-semibold">
          {trialEnded ? "Your free trial has ended" : "Your account is locked"}
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{reason}</p>
        {pendingPlanName ? (
          <p className="mt-4 rounded-md border border-line bg-surface-sunken px-3 py-2.5 text-[13px] text-ink-2">
            You&apos;ve requested <span className="font-medium text-ink">{pendingPlanName}</span>. We&apos;ll switch
            your chatbots back on as soon as it&apos;s activated.
          </p>
        ) : null}
        <Link href="/dashboard/billing" className="btn-primary mt-6 w-full">
          {pendingPlanName ? "View request" : trialEnded ? "Choose a plan" : "View plans"}
        </Link>
      </div>
    </div>
  );
}
