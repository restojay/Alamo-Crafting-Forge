"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/admin/servicebot";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push(from);
      } else {
        setError("Invalid password.");
      }
    } catch {
      setError("Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm rounded-lg border bg-white p-8 shadow-sm"
    >
      <h1 className="mb-6 text-lg font-semibold text-gray-900">Admin Access</h1>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        className="mb-4 w-full rounded border px-3 py-2 text-sm"
        autoFocus
      />
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading || !password}
        className="w-full rounded bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {loading ? "..." : "Sign in"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
