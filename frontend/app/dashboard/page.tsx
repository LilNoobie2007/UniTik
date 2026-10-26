"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, api, type AuthResponse, type User } from "../../lib/api";

const ROLE_LABEL: Record<User["role"], string> = {
  student: "Student",
  organizer: "Event planner",
  admin: "Event planner",
};

function formatJoined(value: string): string {
  const date = new Date(value);
  if (value === "" || Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "signed-out" | "error">("loading");
  const [error, setError] = useState("");
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    document.title = "Your pass · UniTik";
    let cancelled = false;

    api<AuthResponse>("/me.php")
      .then((data) => {
        if (cancelled) return;
        setUser(data.user);
        setStatus("ready");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          setStatus("signed-out");
          return;
        }
        setError(err instanceof ApiError ? err.message : "The campus server didn't answer.");
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function signOut() {
    setLeaving(true);
    setError("");
    try {
      await api<{ ok: true }>("/logout.php", { method: "POST" });
      router.push("/login");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The campus server didn't answer.");
      setLeaving(false);
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-5 py-16 md:py-24">
      <p className="text-xs font-medium uppercase tracking-widest text-muted">Your pass</p>

      {status === "loading" ? (
        <h1 className="mt-4 font-display text-5xl leading-tight text-fg">Checking this browser…</h1>
      ) : null}

      {status === "signed-out" ? (
        <div className="mt-4 max-w-xl">
          <h1 className="font-display text-5xl leading-tight text-fg">This browser isn't signed in.</h1>
          <p className="mt-5 text-base leading-normal text-muted">
            Your pass lives in the session, not in this page. Sign in to open it.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-flex h-12 items-center rounded-full bg-accent px-6 text-accent-fg"
          >
            Sign in
          </Link>
        </div>
      ) : null}

      {status === "error" ? (
        <div className="mt-4 max-w-xl">
          <h1 className="font-display text-5xl leading-tight text-fg">The pass didn't load.</h1>
          <p role="alert" className="mt-5 text-base leading-normal text-muted">
            {error}
          </p>
        </div>
      ) : null}

      {status === "ready" && user !== null ? (
        <div className="mt-4 grid items-start gap-10 md:grid-cols-2">
          <div>
            <h1 className="font-display text-5xl leading-tight text-fg">{user.full_name}</h1>
            <p className="mt-5 max-w-md text-base leading-normal text-muted">
              This is the account on the current session. Nothing here is written into browser storage.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={user.role === "student" ? "/wallet" : "/events"}
                className="inline-flex h-12 items-center rounded-full bg-accent px-6 text-accent-fg"
              >
                {user.role === "student" ? "Open wallet" : "Manage events"}
              </Link>
              {user.role === "student" ? (
                <Link
                  href="/apply"
                  className="inline-flex h-12 items-center rounded-full border border-line px-6 text-fg"
                >
                  Apply to plan
                </Link>
              ) : null}
              {user.role === "admin" ? (
                <Link
                  href="/admin"
                  className="inline-flex h-12 items-center rounded-full border border-line px-6 text-fg"
                >
                  Review requests
                </Link>
              ) : null}
            </div>
          </div>

          <article className="rounded-card border border-line bg-surface p-6 md:p-8">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs font-medium uppercase tracking-widest text-muted">Campus pass</p>
              <p className="rounded-full border border-line px-3 py-1 text-sm text-fg">
                {ROLE_LABEL[user.role] ?? user.role}
              </p>
            </div>
            <dl className="mt-8 grid gap-5">
              <div>
                <dt className="text-xs uppercase tracking-widest text-muted">Email</dt>
                <dd className="mt-1 text-lg text-fg">{user.email}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-widest text-muted">Member since</dt>
                <dd className="mt-1 text-lg text-fg">{formatJoined(user.created_at)}</dd>
              </div>
            </dl>
            <div className="my-6 border-t border-dashed border-line" />
            {error !== "" ? (
              <p role="alert" className="mb-4 text-sm text-fg">
                {error}
              </p>
            ) : null}
            <button
              type="button"
              onClick={signOut}
              disabled={leaving}
              className="h-11 rounded-full border border-line px-5 text-fg disabled:opacity-60"
            >
              {leaving ? "Signing out…" : "Sign out"}
            </button>
          </article>
        </div>
      ) : null}
    </section>
  );
}
