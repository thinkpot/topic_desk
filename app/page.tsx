import Link from "next/link";

const plans = [
  {
    name: "Basic",
    price: 1000,
    features: ["1 chatbot", "Up to 3,000 users / month", "Telegram group with topics", "Email support"],
  },
  {
    name: "Pro",
    price: 3000,
    features: ["Unlimited chatbots", "Unlimited users", "Telegram group with topics", "Priority support"],
  },
];

export default function Home() {
  return (
    <main className="min-h-screen">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-lg font-bold">ChatWidget</span>
          <nav className="flex gap-4">
            <Link href="/login" className="rounded-md px-4 py-2 text-sm font-medium hover:bg-gray-100">
              Log in
            </Link>
            <Link href="/register" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Live chat for your website, powered by Telegram
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Drop one snippet of code on your site. Every visitor conversation shows up as its own topic in your
          Telegram group — reply from your phone, no separate inbox needed.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/register" className="rounded-md bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700">
            Start free setup
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-24">
        <h2 className="mb-8 text-center text-2xl font-bold">Simple pricing</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {plans.map((plan) => (
            <div key={plan.name} className="rounded-xl border bg-white p-8 shadow-sm">
              <h3 className="text-xl font-semibold">{plan.name}</h3>
              <p className="mt-2 text-3xl font-bold">
                ₹{plan.price}
                <span className="text-base font-normal text-gray-500">/month</span>
              </p>
              <ul className="mt-6 space-y-2 text-sm text-gray-600">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="text-green-600">✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="mt-8 block rounded-md bg-gray-900 px-4 py-2 text-center text-sm font-medium text-white hover:bg-gray-800"
              >
                Choose {plan.name}
              </Link>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
