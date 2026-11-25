"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Check,
  Clock,
  FileText,
  Inbox,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import { ApiError, api, type AuthResponse, type User } from "../../lib/api";

type Application = {
  id: string;
  full_name: string;
  email: string;
  corporate_details: string;
  id_card_path: string;
  status: string;
  created_at: string;
};

function failureMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return "The campus server didn't answer.";
}

function formatWhen(value: string): string {
  const date = new Date(value);
  if (value === "" || Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function fileName(path: string): string {
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || "ID on file";
}

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "signed-out" | "error">("loading");
  const [error, setError] = useState("");
  const [pendingId, setPendingId] = useState("");

  useEffect(() => {
    document.title = "Requests · UniTik";
    let cancelled = false;

    api<AuthResponse>("/me.php")
      .then(async (me) => {
        if (cancelled) return;
        setUser(me.user);
        if (me.user.role !== "admin") {
          setStatus("ready");
          return;
        }
        const data = await api<{ ok: true; applications: Application[] }>(
          "/applications/list_applications.php"
        );
        if (cancelled) return;
        setApplications(data.applications);
        setStatus("ready");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          setStatus("signed-out");
          return;
        }
        setError(failureMessage(err));
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function review(id: string, action: "approve" | "reject") {
    setPendingId(id);
    setError("");
    try {
      await api("/applications/review_application.php", {
        method: "POST",
        body: JSON.stringify({ id, action }),
      });
      setApplications((current) => current.filter((item) => item.id !== id));
    } catch (err) {
      setError(failureMessage(err));
    } finally {
      setPendingId("");
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-5 py-12 md:py-20">
      <p className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-muted">
        <ShieldCheck className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} />
        Organizer Requests · Super-Admin Desk
      </p>

      {status === "loading" ? (
        <div className="mt-6 border-t border-line pt-8">
          <h1 className="font-display text-4xl font-bold tracking-tight text-fg md:text-5xl">
            Checking this browser…
          </h1>
          <p className="mt-3 font-mono text-xs uppercase tracking-wider text-muted">
            Loading pending campus applications
          </p>
        </div>
      ) : null}

      {status === "signed-out" ? (
        <div className="mt-6 max-w-xl border border-fg bg-surface p-8 rounded-card shadow-[4px_4px_0px_var(--fg)]">
          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-fg">
            Sign in to review.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted">
            Organizer approval requires an active super-admin session.
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

      {status === "error" ? (
        <div className="mt-6 max-w-xl border border-accent bg-surface p-8 rounded-card">
          <div className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-accent">
            <ShieldAlert className="h-4 w-4" strokeWidth={1.75} />
            Connection Error
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-fg">
            Requests didn&apos;t load.
          </h1>
          <p role="alert" className="mt-3 text-sm text-muted">
            {error}
          </p>
        </div>
      ) : null}

      {status === "ready" && user !== null && user.role !== "admin" ? (
        <div className="mt-6 max-w-xl border border-fg bg-surface p-8 rounded-card shadow-[4px_4px_0px_var(--fg)]">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
            Restricted · {user.role}
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold leading-tight tracking-tight text-fg">
            Only a super-admin reviews these.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted">
            Students apply from their own account. Planners publish events. Approval stays with an
            organizer whose account status is admin.
          </p>
        </div>
      ) : null}

      {status === "ready" && user?.role === "admin" ? (
        <div className="mt-5 space-y-8">
          {/* Editorial Header + Queue KPI Strip */}
          <div className="flex flex-col gap-6 border-b border-line pb-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="font-display text-4xl font-bold leading-none tracking-tight text-fg md:text-5xl">
                Waiting on you.
              </h1>
              <p className="mt-3 max-w-xl text-base leading-relaxed text-muted">
                Approve copies the student into the organizers table. Reject leaves them a student.
              </p>
            </div>

            <div className="grid grid-cols-2 divide-x divide-line border border-line bg-surface rounded-card">
              <div className="px-5 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                  Pending Queue
                </p>
                <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-fg">
                  {applications.length}
                </p>
              </div>
              <div className="px-5 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                  Reviewer
                </p>
                <p className="mt-1 font-mono text-xs font-bold uppercase tracking-wider text-stamp">
                  Super-Admin
                </p>
              </div>
            </div>
          </div>

          {error !== "" ? (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-card border border-accent bg-surface px-4 py-3 text-sm text-fg"
            >
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={1.75} />
              <span>{error}</span>
            </div>
          ) : null}

          {applications.length === 0 ? (
            <div className="flex items-center gap-3 border border-dashed border-line bg-surface p-10 rounded-card text-muted">
              <Inbox className="h-5 w-5 shrink-0 text-fg" strokeWidth={1.75} />
              <p className="font-mono text-xs uppercase tracking-[0.16em]">
                Queue clear · No pending requests.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-fg bg-surface rounded-card shadow-[4px_4px_0px_var(--fg)]">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-fg bg-bg font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
                    <th className="px-5 py-3.5 font-semibold">Applicant</th>
                    <th className="px-5 py-3.5 font-semibold">Committee / Details</th>
                    <th className="px-5 py-3.5 font-semibold">ID Document</th>
                    <th className="px-5 py-3.5 font-semibold">Submitted</th>
                    <th className="px-5 py-3.5 text-right font-semibold">Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {applications.map((application) => {
                    const isBusy = pendingId === application.id;
                    return (
                      <tr key={application.id} className="align-top transition-colors hover:bg-bg/50">
                        <td className="px-5 py-5">
                          <p className="font-display text-lg font-bold leading-snug text-fg">
                            {application.full_name}
                          </p>
                          <p className="mt-0.5 font-mono text-xs text-muted">{application.email}</p>
                        </td>

                        <td className="max-w-md px-5 py-5">
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-fg">
                            {application.corporate_details}
                          </p>
                        </td>

                        <td className="px-5 py-5">
                          <span className="inline-flex items-center gap-1.5 border border-line bg-bg px-2.5 py-1 font-mono text-[11px] text-fg rounded-card">
                            <FileText className="h-3.5 w-3.5 shrink-0 text-muted" strokeWidth={1.75} />
                            <span className="max-w-[160px] truncate">
                              {fileName(application.id_card_path)}
                            </span>
                          </span>
                        </td>

                        <td className="px-5 py-5">
                          <span className="inline-flex items-center gap-1.5 font-mono text-xs tabular-nums text-muted whitespace-nowrap">
                            <Clock className="h-3.5 w-3.5 shrink-0 text-fg" strokeWidth={1.75} />
                            {formatWhen(application.created_at)}
                          </span>
                        </td>

                        <td className="px-5 py-5">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => review(application.id, "approve")}
                              className="inline-flex h-9 items-center gap-1.5 rounded-card border border-stamp bg-stamp px-3.5 font-mono text-[11px] font-bold uppercase tracking-wider text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                            >
                              <Check className="h-3.5 w-3.5" strokeWidth={2} />
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => review(application.id, "reject")}
                              className="inline-flex h-9 items-center gap-1.5 rounded-card border border-accent bg-transparent px-3.5 font-mono text-[11px] font-bold uppercase tracking-wider text-accent transition-colors hover:bg-accent hover:text-accent-fg disabled:opacity-50"
                            >
                              <X className="h-3.5 w-3.5" strokeWidth={2} />
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}