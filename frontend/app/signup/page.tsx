"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, api, type AuthResponse } from "../../lib/api";

function failureMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return "The campus server didn't answer.";
}

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    document.title = "Create a pass · UniTik";
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const name = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    if (name === "" || name.length > 100) {
      setError("Full name must be 1–100 characters.");
      return;
    }
    if (trimmedEmail === "" || trimmedEmail.length > 255 || !trimmedEmail.includes("@")) {
      setError("A valid email is required.");
      return;
    }
    if (password.length < 8 || password.length > 72) {
      setError("Password must be 8–72 characters.");
      return;
    }

    setPending(true);
    try {
      await api<AuthResponse>("/signup.php", {
        method: "POST",
        body: JSON.stringify({
          full_name: name,
          email: trimmedEmail,
          password,
        }),
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
        <p className="text-xs font-medium uppercase tracking-widest text-muted">New pass</p>
        <h1 className="mt-4 font-display text-5xl leading-tight text-fg">Open a student account.</h1>
        <p className="mt-5 max-w-md text-base leading-normal text-muted">
          One pass for lectures and nights. Event planner accounts are issued by the campus, not this form.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="rounded-card border border-line bg-surface p-6 md:p-8"
        noValidate
      >
        <div className="grid gap-5">
          <label className="block text-sm text-fg" htmlFor="full-name">
            Full name
            <input
              id="full-name"
              name="full_name"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="mt-2 h-12 w-full rounded-2xl border border-line bg-bg px-4 text-base text-fg"
              required
              maxLength={100}
            />
          </label>
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
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 h-12 w-full rounded-2xl border border-line bg-bg px-4 text-base text-fg"
              required
              minLength={8}
              maxLength={72}
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
          {pending ? "Creating…" : "Create pass"}
        </button>

        <p className="mt-5 text-sm text-muted">
          Already registered?{" "}
          <Link href="/login" className="text-fg underline decoration-line underline-offset-4">
            Sign in
          </Link>
        </p>
      </form>
    </section>
  );
}
