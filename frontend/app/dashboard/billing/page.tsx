"use client";

import { useAuth } from "@/lib/auth-context";

const plans = [
  { id: "BASIC", name: "Basic", price: 1000, features: ["1 chatbot", "Up to 3,000 users / month"] },
  { id: "PRO", name: "Pro", price: 3000, features: ["Unlimited chatbots", "Unlimited users"] },
];

export default function BillingPage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold">Billing</h1>
      <p className="mt-1 text-sm text-gray-600">
        You are currently on the <strong>{user?.plan}</strong> plan.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {plans.map((plan) => {
          const isCurrent = user?.plan === plan.id;
          return (
            <div key={plan.id} className={`rounded-xl border bg-white p-6 ${isCurrent ? "ring-2 ring-blue-600" : ""}`}>
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <p className="mt-1 text-2xl font-bold">
                ₹{plan.price}
                <span className="text-sm font-normal text-gray-500">/month</span>
              </p>
              <ul className="mt-4 space-y-1 text-sm text-gray-600">
                {plan.features.map((f) => (
                  <li key={f}>• {f}</li>
                ))}
              </ul>
              <button
                disabled={isCurrent}
                className="mt-6 w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCurrent ? "Current plan" : `Upgrade to ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-gray-500">
        Payment processing is not wired up yet — connect a gateway (e.g. Razorpay) to the &quot;Upgrade&quot; buttons
        above and update the user&apos;s plan on successful payment.
      </p>
    </div>
  );
}
