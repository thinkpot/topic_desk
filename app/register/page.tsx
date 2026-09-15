"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiErrorMessage } from "@/lib/api";

export default function RegisterPage() {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(name, email, password);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-xl border bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold">Create your account</h1>
        {error && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="mt-4 space-y-3">
          <input
            required
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
          <input
            type="password"
            required
            minLength={8}
            placeholder="Password (min 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="mt-5 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Creating account..." : "Sign up"}
        </button>
        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-blue-600">
            Log in
          </Link>
        </p>
      </form>
    </main>
  );
}
