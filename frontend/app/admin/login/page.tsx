"use client";

import { useState, useEffect, type FormEvent, type JSX } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export default function AdminLoginPage(): JSX.Element {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    const existingUser = localStorage.getItem("unitik_user");
    if (existingUser) {
      const user = JSON.parse(existingUser);
      if (user.role === "admin") {
        router.replace("/admin/dashboard");
      } else {
        router.replace("/");
      }
    }
  }, [router]);

  const handleAdminLogin = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/modules/auth/admin-login.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.status === "success") {
        localStorage.setItem("unitik_user", JSON.stringify(data.user));
        window.location.href = "/admin/dashboard";
      } else {
        setError(data.message || "Invalid administrator credentials.");
      }
    } catch (err: unknown) {
      console.error("Admin login network error:", err);
      setError("Failed to connect to the authentication server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-zinc-950 px-6 text-white">
      <div className="w-full max-w-md rounded-3xl border border-amber-500/20 bg-zinc-900/80 p-8 backdrop-blur-xl shadow-2xl">
        <div className="mb-8 text-center">
          <div className="inline-block mb-3 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-400">
            Restricted Access
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Organizer Portal</h1>
          <p className="text-sm text-zinc-400 mt-2">Sign in with authorized host credentials</p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-400">
            {error}
          </div>
        )}

        <form onSubmit={handleAdminLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Official Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@unitik.campus"
              className="w-full rounded-xl border border-white/10 bg-zinc-950/60 px-4 py-3 text-sm text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
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
              className="w-full rounded-xl border border-white/10 bg-zinc-950/60 px-4 py-3 text-sm text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 hover:opacity-95 transition-all disabled:opacity-50 mt-4 cursor-pointer"
          >
            {loading ? "Authenticating Host..." : "Access Admin Panel"}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-zinc-400">
          Looking for student login?{" "}
          <Link href="/login" className="text-cyan-400 hover:underline font-medium">
            Student Portal
          </Link>
        </div>
      </div>
    </main>
  );
} 