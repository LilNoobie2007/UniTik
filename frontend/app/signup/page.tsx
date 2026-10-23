"use client";

/*
 * File: frontend/app/signup/page.tsx
 * UNITIK CORE ARCHITECTURE MANDATE
 * - Frontend: Next.js / BFF
 * - Backend: PHP 8+ (PDO/PostgreSQL)
 * - DO NOT use client-side database calls.
 * - DO NOT trust client inputs. Always sanitize.
 * - Preserve existing logic during modifications.
 *
 * No role field. signup.php always creates a student.
 */

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/modules/auth/signup.php", {
        full_name: fullName,
        email,
        password,
        roll_number: rollNumber,
      });
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <p className="kicker">New campus pass</p>
      <h1>Create account</h1>
      <p className="lede">You join as a student. Host access is not something this form can grant.</p>
      <form onSubmit={(event) => void onSubmit(event)} className="panel" style={{ maxWidth: 420 }}>
        {error && <p className="error">{error}</p>}
        <label htmlFor="name">Full name</label>
        <input id="name" required value={fullName} onChange={(event) => setFullName(event.target.value)} />
        <label htmlFor="email">Campus email</label>
        <input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        <label htmlFor="roll">Roll number (optional)</label>
        <input id="roll" value={rollNumber} onChange={(event) => setRollNumber(event.target.value)} />
        <label htmlFor="password">Password</label>
        <input id="password" type="password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} />
        <button className="btn block" type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create account"}
        </button>
        <p className="meta">
          Already registered? <Link href="/login">Sign in</Link>
        </p>
      </form>
    </main>
  );
}
