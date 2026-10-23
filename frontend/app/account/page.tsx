"use client";

/*
 * File: frontend/app/account/page.tsx
 * UNITIK CORE ARCHITECTURE MANDATE
 * - Frontend: Next.js / BFF
 * - Backend: PHP 8+ (PDO/PostgreSQL)
 * - DO NOT use client-side database calls.
 * - DO NOT trust client inputs. Always sanitize.
 * - Preserve existing logic during modifications.
 *
 * Signed-in password change. No reset link is sent.
 */

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

export default function AccountPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setDone(false);
    if (newPassword !== confirmPassword) {
      setError("The new passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await api("/modules/auth/password.php", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setDone(true);
    } catch (err) {
      const status = (err as { status?: number }).status;
      setError(status === 401 && err instanceof Error && err.message === "Sign in required."
        ? "Sign in before changing the password."
        : err instanceof Error
          ? err.message
          : "Could not change the password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <p className="kicker">Account</p>
      <h1>Change password</h1>
      <p className="lede">The current password is checked on the server. There is no email reset.</p>
      <form onSubmit={(event) => void onSubmit(event)} className="panel" style={{ maxWidth: 420 }}>
        {error && <p className="error">{error}</p>}
        {done && <p className="ok">Password updated. This session stays signed in.</p>}
        <label htmlFor="current">Current password</label>
        <input id="current" type="password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
        <label htmlFor="next">New password</label>
        <input id="next" type="password" required minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
        <label htmlFor="confirm">Confirm new password</label>
        <input id="confirm" type="password" required minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
        <button className="btn block" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Update password"}
        </button>
        <p className="meta">
          <Link href="/login">Sign in</Link> if this session has expired.
        </p>
      </form>
    </main>
  );
}
