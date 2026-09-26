import Link from "next/link";

// Deliberately not built on the dismissable Modal in primitives.tsx — this one
// has no close button and no backdrop-click dismissal. It's shown whenever
// accountBlockReason() returns non-null (suspended, unpaid tier, or an
// expired trial/plan) on every dashboard route except Billing, which stays
// reachable as the only way out.
export default function TrialLockOverlay({ reason }: { reason: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 px-4">
      <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-6 text-center shadow-pop">
        <h2 className="text-[17px] font-semibold">Your account is locked</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-2">{reason}</p>
        <Link href="/dashboard/billing" className="btn-primary mt-6 w-full">
          View plans
        </Link>
      </div>
    </div>
  );
}
