"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
        const data = await api<{ ok: true; applications: Application[] }>("/applications/list_applications.php");
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
    <section className="mx-auto max-w-6xl px-5 py-16 md:py-24">
      <p className="text-xs font-medium uppercase tracking-widest text-muted">Organizer requests</p>

      {status === "loading" ? (
        <h1 className="mt-4 font-display text-5xl leading-tight text-fg">Checking this browser…</h1>
      ) : null}

      {status === "signed-out" ? (
        <div className="mt-4 max-w-xl">
          <h1 className="font-display text-5xl leading-tight text-fg">Sign in to review.</h1>
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
          <h1 className="font-display text-5xl leading-tight text-fg">Requests didn't load.</h1>
          <p role="alert" className="mt-5 text-base text-muted">
            {error}
          </p>
        </div>
      ) : null}

      {status === "ready" && user !== null && user.role !== "admin" ? (
        <div className="mt-4 max-w-xl">
          <h1 className="font-display text-5xl leading-tight text-fg">Only a super-admin reviews these.</h1>
          <p className="mt-5 text-base leading-normal text-muted">
            Students apply from their own account. Planners publish events. Approval stays with an organizer
            whose account status is admin.
          </p>
        </div>
      ) : null}

      {status === "ready" && user?.role === "admin" ? (
        <div className="mt-4">
          <h1 className="font-display text-5xl leading-tight text-fg">Waiting on you.</h1>
          <p className="mt-5 max-w-xl text-base leading-normal text-muted">
            Approve copies the student into the organizers table. Reject leaves them a student.
          </p>
          {error !== "" ? (
            <p role="alert" className="mt-5 text-sm text-fg">
              {error}
            </p>
          ) : null}
          {applications.length === 0 ? (
            <p className="mt-10 text-base text-muted">No pending requests.</p>
          ) : (
            <ul className="mt-10 grid gap-4">
              {applications.map((application) => (
                <li key={application.id} className="rounded-card border border-line bg-surface p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-muted">
                        {formatWhen(application.created_at)}
                      </p>
                      <h2 className="mt-2 font-display text-3xl text-fg">{application.full_name}</h2>
                      <p className="mt-1 text-base text-muted">{application.email}</p>
                      <p className="mt-4 max-w-xl text-base leading-normal text-fg">
                        {application.corporate_details}
                      </p>
                      <p className="mt-3 text-sm text-muted">ID on file · {fileName(application.id_card_path)}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        disabled={pendingId === application.id}
                        onClick={() => review(application.id, "approve")}
                        className="h-11 rounded-full bg-accent px-5 text-accent-fg disabled:opacity-60"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={pendingId === application.id}
                        onClick={() => review(application.id, "reject")}
                        className="h-11 rounded-full border border-line px-5 text-fg disabled:opacity-60"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}
