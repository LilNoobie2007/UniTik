"use client";

import { useState, useEffect, type FormEvent, type JSX } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export default function LoginPage(): JSX.Element {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    const existingUser = localStorage.getItem("unitik_user");
    if (existingUser) {
      router.replace("/");
    }
  }, [router]);

  const handleLogin = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/modules/auth/login.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.status === "success") {
        localStorage.setItem("unitik_user", JSON.stringify(data.user));
        window.location.href = data.user.role === "admin" ? "/admin/dashboard" : "/";
      } else {
        setError(data.message || "Invalid credentials.");
      }
    } catch (err: unknown) {
      console.error("Login network error:", err);
      setError("Failed to connect to the authentication server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-zinc-950 px-6 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900/80 p-8 backdrop-blur-xl shadow-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-cyan-400">UniTik Portal</h1>
          <p className="text-sm text-zinc-400 mt-2">Sign in to manage your campus events or tickets</p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-400">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Campus Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@unitik.campus"
              className="w-full rounded-xl border border-white/10 bg-zinc-950/60 px-4 py-3 text-sm text-white placeholder-zinc-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-white/10 bg-zinc-950/60 px-4 py-3 text-sm text-white placeholder-zinc-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 hover:opacity-95 transition-all disabled:opacity-50 mt-4 cursor-pointer"
          >
            {loading ? "Authenticating..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between text-xs text-zinc-400">
          <span>New user? <Link href="/signup" className="text-cyan-400 hover:underline font-medium">Sign Up</Link></span>
          <Link href="/admin/login" className="text-amber-400 hover:underline font-medium">Admin Portal →</Link>
        </div>
      </div>
    </main>
  );
}   