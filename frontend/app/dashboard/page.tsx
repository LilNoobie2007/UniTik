"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Calendar,
  LogOut,
  Mail,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  Ticket,
  UserCheck,
} from "lucide-react";
import { ApiError, api, type User } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";

const ROLE_LABEL: Record<User["role"], string> = {
  student: "Student",
  organizer: "Event planner",
  admin: "Super-admin",
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
  const { user, status: authStatus, error: authError, clearSession } = useAuth();
  const [signOutError, setSignOutError] = useState("");
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    document.title = "Your pass · UniTik";
  }, []);

  async function signOut() {
    setLeaving(true);
    setSignOutError("");
    try {
      await api<{ ok: true }>("/logout.php", { method: "POST" });
      clearSession();
      router.push("/login");
    } catch (err) {
      setSignOutError(err instanceof ApiError ? err.message : "The campus server didn't answer.");
      setLeaving(false);
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-5 py-12 md:py-20">
      <p className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-muted">
        <Ticket className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} />
        Your Pass · Account Desk
      </p>

      {authStatus === "loading" ? (
        <div className="mt-6 border-t border-line pt-8">
          <h1 className="font-display text-4xl font-bold tracking-tight text-fg md:text-5xl">
            Checking this browser…
          </h1>
          <p className="mt-3 font-mono text-xs uppercase tracking-wider text-muted">
            Reading active campus session
          </p>
        </div>
      ) : null}

      {authStatus === "signed-out" ? (
        <div className="mt-6 max-w-xl border border-fg bg-surface p-8 rounded-card shadow-[4px_4px_0px_var(--fg)]">
          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-fg">
            This browser isn&apos;t signed in.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted">
            Your pass lives in the session, not in this page. Sign in to open it.
          </p>
          <Link
            href="/login"
            className="mt-7 inline-flex h-11 items-center gap-2 rounded-card border border-fg bg-accent px-6 font-mono text-xs font-bold uppercase tracking-[0.18em] text-accent-fg shadow-[3px_3px_0px_var(--fg)] transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            Sign in
            <ArrowUpRight className="h-4 w-4" strokeWidth={1.75} />
          </Link>
        </div>
      ) : null}

      {authStatus === "error" ? (
        <div className="mt-6 max-w-xl border border-accent bg-surface p-8 rounded-card">
          <div className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-accent">
            <ShieldAlert className="h-4 w-4" strokeWidth={1.75} />
            Connection Error
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-fg">
            The pass didn&apos;t load.
          </h1>
          <p role="alert" className="mt-3 text-sm leading-relaxed text-muted">
            {authError}
          </p>
        </div>
      ) : null}

      {authStatus === "authenticated" && user !== null ? (
        <div className="mt-5 space-y-10">
          <div className="flex flex-col gap-6 border-b border-line pb-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="font-display text-4xl font-bold leading-none tracking-tight text-fg md:text-5xl">
                {user.full_name}
              </h1>
              <p className="mt-3 max-w-lg text-base leading-relaxed text-muted">
                This is the account on the current session. Nothing here is written into browser
                storage.
              </p>
            </div>

            <div className="grid grid-cols-2 divide-x divide-line border border-line bg-surface rounded-card sm:w-auto">
              <div className="px-4 py-3 sm:px-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                  Session State
                </p>
                <p className="mt-1 inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-stamp">
                  <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Verified
                </p>
              </div>
              <div className="px-4 py-3 sm:px-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                  Account Tier
                </p>
                <p className="mt-1 font-mono text-xs font-bold uppercase tracking-wider text-fg">
                  {user.role}
                </p>
              </div>
            </div>
          </div>

          <div className="grid items-start gap-8 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-6">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                Available Desks
              </p>

              <div className="grid gap-4">
                <Link
                  href={user.role === "student" ? "/wallet" : "/events"}
                  className="group flex items-center justify-between gap-4 border border-fg bg-accent p-5 rounded-card text-accent-fg shadow-[4px_4px_0px_var(--fg)] transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                >
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] opacity-85">
                      Primary Workspace
                    </p>
                    <p className="mt-1 font-display text-2xl font-bold tracking-tight">
                      {user.role === "student" ? "Open wallet" : "Manage events"}
                    </p>
                  </div>
                  <ArrowUpRight className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                </Link>

                {user.role === "organizer" || user.role === "admin" ? (
                  <Link
                    href="/scan"
                    className="group flex items-center justify-between gap-4 border border-fg bg-surface p-5 rounded-card text-fg shadow-[3px_3px_0px_var(--fg)] transition-colors hover:bg-fg hover:text-bg"
                  >
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted group-hover:text-bg/70">
                        Gate Operations
                      </p>
                      <p className="mt-1 inline-flex items-center gap-2 font-display text-xl font-bold tracking-tight">
                        <ScanLine className="h-5 w-5 text-accent" strokeWidth={1.75} />
                        Open door scanner
                      </p>
                    </div>
                    <ArrowUpRight className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                  </Link>
                ) : null}

                {user.role === "student" ? (
                  <Link
                    href="/apply"
                    className="group flex items-center justify-between gap-4 border border-fg bg-surface p-5 rounded-card text-fg shadow-[3px_3px_0px_var(--fg)] transition-colors hover:bg-fg hover:text-bg"
                  >
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted group-hover:text-bg/70">
                        Role Upgrade
                      </p>
                      <p className="mt-1 font-display text-xl font-bold tracking-tight">
                        Apply to plan events
                      </p>
                    </div>
                    <ArrowUpRight className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                  </Link>
                ) : null}

                {user.role === "admin" ? (
                  <Link
                    href="/admin"
                    className="group flex items-center justify-between gap-4 border border-fg bg-surface p-5 rounded-card text-fg shadow-[3px_3px_0px_var(--fg)] transition-colors hover:bg-fg hover:text-bg"
                  >
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted group-hover:text-bg/70">
                        Super-Admin Queue
                      </p>
                      <p className="mt-1 font-display text-xl font-bold tracking-tight">
                        Review organizer requests
                      </p>
                    </div>
                    <ArrowUpRight className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                  </Link>
                ) : null}
              </div>
            </div>

            <article className="border border-fg bg-surface rounded-card shadow-[4px_4px_0px_var(--fg)] lg:col-span-6">
              <div className="flex items-center justify-between bg-fg px-6 py-3.5 text-bg">
                <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em]">
                  Campus Pass
                </span>
                <span className="inline-flex items-center gap-1.5 border border-bg/30 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em]">
                  <UserCheck className="h-3 w-3 text-accent" strokeWidth={1.75} />
                  {ROLE_LABEL[user.role] ?? user.role}
                </span>
              </div>

              <dl className="divide-y divide-line px-6 py-2">
                <div className="py-4">
                  <dt className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                    <Mail className="h-3.5 w-3.5 text-fg" strokeWidth={1.75} />
                    Email
                  </dt>
                  <dd className="mt-1.5 break-all font-mono text-sm font-semibold text-fg">
                    {user.email}
                  </dd>
                </div>

                <div className="py-4">
                  <dt className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                    <Calendar className="h-3.5 w-3.5 text-fg" strokeWidth={1.75} />
                    Member Since
                  </dt>
                  <dd className="mt-1.5 font-mono text-sm font-semibold tabular-nums text-fg">
                    {formatJoined(user.created_at)}
                  </dd>
                </div>
              </dl>

              <div className="relative flex items-center">
                <span
                  aria-hidden="true"
                  className="absolute -left-[1px] h-5 w-2.5 rounded-r-full border-y border-r border-fg bg-bg"
                />
                <div className="w-full border-t border-dashed border-line" />
                <span
                  aria-hidden="true"
                  className="absolute -right-[1px] h-5 w-2.5 rounded-l-full border-y border-l border-fg bg-bg"
                />
              </div>

              <div className="p-6">
                {signOutError !== "" ? (
                  <div
                    role="alert"
                    className="mb-4 flex items-start gap-2.5 rounded-card border border-accent bg-bg px-3.5 py-2.5 text-sm text-fg"
                  >
                    <ShieldAlert
                      className="mt-0.5 h-4 w-4 shrink-0 text-accent"
                      strokeWidth={1.75}
                    />
                    <span>{signOutError}</span>
                  </div>
                ) : null}

                <div className="flex items-center justify-between gap-4">
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                    End Browser Session
                  </span>
                  <button
                    type="button"
                    onClick={signOut}
                    disabled={leaving}
                    className="inline-flex h-10 items-center gap-2 rounded-card border border-fg bg-bg px-4 font-mono text-xs font-bold uppercase tracking-wider text-fg transition-colors hover:bg-fg hover:text-bg disabled:opacity-60"
                  >
                    <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
                    {leaving ? "Signing out…" : "Sign out"}
                  </button>
                </div>
              </div>
            </article>
          </div>
        </div>
      ) : null}
    </section>
  );
}