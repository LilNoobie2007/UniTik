"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, api, type AuthResponse } from "../../lib/api";

function failureMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return "The campus server didn't answer.";
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    document.title = "Sign in · UniTik";
  }, []);

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
      router.push("/dashboard");
    } catch (err) {
      setError(failureMessage(err));
      setPending(false);
    }
  }

  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 md:grid-cols-2 md:py-24">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-muted">Campus pass</p>
        <h1 className="mt-4 font-display text-5xl leading-tight text-fg">Welcome back.</h1>
        <p className="mt-5 max-w-md text-base leading-normal text-muted">
          Sign in with your campus email. UniTik keeps the session on this browser and never stores
          your id in the page.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="rounded-card border border-line bg-surface p-6 md:p-8"
        noValidate
      >
        <div className="grid gap-5">
          <label className="block text-sm text-fg" htmlFor="email">
            Email
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 h-12 w-full rounded-2xl border border-line bg-bg px-4 text-base text-fg"
              required
            />
          </label>
          <label className="block text-sm text-fg" htmlFor="password">
            Password
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 h-12 w-full rounded-2xl border border-line bg-bg px-4 text-base text-fg"
              required
            />
          </label>
        </div>

        {error !== "" ? (
          <p role="alert" className="mt-5 text-sm text-fg">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="mt-6 h-12 w-full rounded-full bg-accent text-base text-accent-fg disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>

        <p className="mt-5 text-sm text-muted">
          New here?{" "}
          <Link href="/signup" className="text-fg underline decoration-line underline-offset-4">
            Create a pass
          </Link>
        </p>
      </form>
    </section>
  );
}
