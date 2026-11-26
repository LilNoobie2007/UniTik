"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight, Lock, Mail, ShieldAlert, Ticket } from "lucide-react";
import { ApiError, api, type AuthResponse } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";

function failureMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return "The campus server didn't answer.";
}

export default function LoginPage() {
  const router = useRouter();
  const { status: authStatus, refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    document.title = "Sign in · UniTik";
  }, []);

  useEffect(() => {
    if (authStatus === "authenticated") {
      router.replace("/dashboard");
    }
  }, [authStatus, router]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const trimmed = email.trim().toLowerCase();
    if (trimmed === "" || password === "") {
      setError("Email and password are required.");
      return;
    }
    setPending(true);
    try {
      await api<AuthResponse>("/login.php", {
        method: "POST",
        body: JSON.stringify({ email: trimmed, password }),
      });
      await refresh();
      router.push("/dashboard");
    } catch (err) {
      setError(failureMessage(err));
      setPending(false);
    }
  }

  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-14 md:grid-cols-12 md:py-24">
      <div className="md:col-span-6">
        <p className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-muted">
          <Ticket className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} />
          Campus Pass · Sign In
        </p>

        <h1 className="mt-4 font-display text-4xl font-bold leading-[1.05] tracking-tight text-fg sm:text-5xl">
          Welcome back.
        </h1>

        <p className="mt-5 max-w-md text-base leading-relaxed text-muted">
          Sign in with your campus email. UniTik keeps the session on this browser and never stores
          your id in the page.
        </p>

        <dl className="mt-8 max-w-md divide-y divide-line border-y border-line font-mono text-xs">
          <div className="flex items-center justify-between py-3">
            <dt className="uppercase tracking-[0.16em] text-muted">Auth Mode</dt>
            <dd className="font-semibold text-fg">HTTP-Only Session</dd>
          </div>
          <div className="flex items-center justify-between py-3">
            <dt className="uppercase tracking-[0.16em] text-muted">Access</dt>
            <dd className="font-semibold text-fg">Students · Organizers · Admin</dd>
          </div>
        </dl>
      </div>

      <div className="md:col-span-6">
        <form
          onSubmit={onSubmit}
          className="border border-fg bg-surface rounded-card shadow-[4px_4px_0px_var(--fg)]"
          noValidate
        >
          <div className="flex items-center justify-between border-b border-line px-6 py-4">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-fg">
              Account Credentials
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
              Gate 01
            </span>
          </div>

          <div className="p-6 md:p-8">
            <div className="grid gap-5">
              <div>
                <label
                  htmlFor="email"
                  className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-muted"
                >
                  <Mail className="h-3.5 w-3.5 text-fg" strokeWidth={1.75} />
                  Campus Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="name@campus.edu"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 h-12 w-full rounded-card border border-line bg-bg px-4 text-base text-fg placeholder:text-muted/60 transition-colors focus:border-fg"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-muted"
                >
                  <Lock className="h-3.5 w-3.5 text-fg" strokeWidth={1.75} />
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-2 h-12 w-full rounded-card border border-line bg-bg px-4 text-base text-fg placeholder:text-muted/60 transition-colors focus:border-fg"
                  required
                />
              </div>
            </div>

            {error !== "" ? (
              <div
                role="alert"
                className="mt-5 flex items-start gap-2.5 rounded-card border border-accent bg-bg px-3.5 py-3 text-sm text-fg"
              >
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={1.75} />
                <span>{error}</span>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={pending}
              className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-card border border-fg bg-accent px-6 font-mono text-xs font-bold uppercase tracking-[0.18em] text-accent-fg shadow-[3px_3px_0px_var(--fg)] transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60"
            >
              {pending ? "Signing in…" : "Sign in"}
              {!pending ? <ArrowUpRight className="h-4 w-4" strokeWidth={1.75} /> : null}
            </button>

            <div className="mt-6 flex items-center justify-between gap-4 border-t border-dashed border-line pt-5 text-sm text-muted">
              <span>New to UniTik?</span>
              <Link
                href="/signup"
                className="inline-flex items-center gap-1 font-mono text-xs font-bold uppercase tracking-wider text-fg underline decoration-fg underline-offset-4 hover:text-accent hover:decoration-accent"
              >
                Create a pass
                <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.75} />
              </Link>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}