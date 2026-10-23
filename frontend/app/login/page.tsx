"use client";

/*
 * File: frontend/app/login/page.tsx
 * UNITIK CORE ARCHITECTURE MANDATE
 * - Frontend: Next.js / BFF
 * - Backend: PHP 8+ (PDO/PostgreSQL)
 * - DO NOT use client-side database calls.
 * - DO NOT trust client inputs. Always sanitize.
 * - Preserve existing logic during modifications.
 */

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type SessionUser = {
  id: string;
  full_name: string;
  email: string;
  role: string;
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await api<SessionUser>("/modules/auth/login.php", { email, password });
      sessionStorage.setItem("unitik_profile", JSON.stringify(user));
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <p className="kicker">Student portal</p>
      <h1>Sign in</h1>
      <p className="lede">The server session is the pass. This screen does not choose a role.</p>
      <form onSubmit={(event) => void onSubmit(event)} className="panel" style={{ maxWidth: 420 }}>
        {error && <p className="error">{error}</p>}
        <label htmlFor="email">Campus email</label>
        <input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        <label htmlFor="password">Password</label>
        <input id="password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} />
        <button className="btn block" type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <p className="meta">
          New here? <Link href="/signup">Create an account</Link>
        </p>
      </form>
    </main>
  );
}
