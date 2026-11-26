"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  ShieldAlert,
  Ticket,
  Upload,
} from "lucide-react";
import { ApiError, api } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";

function failureMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return "The campus server didn't answer.";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

export default function ApplyPage() {
  const { user, status: authStatus, error: authError } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [details, setDetails] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    document.title = "Apply · UniTik";
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    if (details.trim() === "") {
      setFormError("Tell us which committee or company you represent.");
      return;
    }
    if (file === null) {
      setFormError("Upload a photo or PDF of your ID card.");
      return;
    }
    const body = new FormData();
    body.set("corporate_details", details.trim());
    body.set("id_card", file);
    setPending(true);
    try {
      await api("/applications/apply.php", { method: "POST", body });
      setSubmitted(true);
    } catch (err) {
      setFormError(failureMessage(err));
      setPending(false);
    }
  }

  return (
    <section className="mx-auto grid max-w-6xl items-start gap-12 px-5 py-14 md:grid-cols-12 md:py-24">
      <div className="md:col-span-5">
        <p className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-muted">
          <Ticket className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} />
          Planner Application
        </p>

        <h1 className="mt-4 font-display text-4xl font-bold leading-[1.05] tracking-tight text-fg sm:text-5xl">
          Ask to publish.
        </h1>

        <p className="mt-5 max-w-md text-base leading-relaxed text-muted">
          Students stay students until a super-admin approves this request. Once approved, the same
          email signs in as an event planner.
        </p>

        <dl className="mt-8 max-w-md divide-y divide-line border-y border-line font-mono text-xs">
          <div className="flex items-center justify-between py-3">
            <dt className="uppercase tracking-[0.16em] text-muted">Accepted IDs</dt>
            <dd className="font-semibold text-fg">JPEG · PNG · WebP · PDF</dd>
          </div>
          <div className="flex items-center justify-between py-3">
            <dt className="uppercase tracking-[0.16em] text-muted">Max File Size</dt>
            <dd className="font-semibold tabular-nums text-fg">5.0 MB</dd>
          </div>
          <div className="flex items-center justify-between py-3">
            <dt className="uppercase tracking-[0.16em] text-muted">Approval</dt>
            <dd className="font-semibold text-fg">Campus Super-Admin</dd>
          </div>
        </dl>
      </div>

      <div className="md:col-span-7">
        {authStatus === "loading" ? (
          <div className="border border-line bg-surface p-8 rounded-card">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
              Checking this browser…
            </p>
          </div>
        ) : null}

        {authStatus === "signed-out" ? (
          <div className="border border-fg bg-surface p-8 rounded-card shadow-[4px_4px_0px_var(--fg)]">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
              Session Required
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-fg">
              Sign in first.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Applications are tied directly to your verified campus student account.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-card border border-fg bg-accent px-6 font-mono text-xs font-bold uppercase tracking-[0.18em] text-accent-fg shadow-[3px_3px_0px_var(--fg)] transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              Sign in
              <ArrowUpRight className="h-4 w-4" strokeWidth={1.75} />
            </Link>
          </div>
        ) : null}

        {authStatus === "error" ? (
          <div className="border border-accent bg-surface p-8 rounded-card">
            <div className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-accent">
              <ShieldAlert className="h-4 w-4" strokeWidth={1.75} />
              Connection Error
            </div>
            <p role="alert" className="mt-3 text-sm text-muted">
              {authError}
            </p>
          </div>
        ) : null}

        {authStatus === "authenticated" && user !== null && user.role !== "student" ? (
          <div className="border border-fg bg-surface p-8 rounded-card shadow-[4px_4px_0px_var(--fg)]">
            <span className="inline-flex items-center gap-1.5 border border-stamp px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-stamp">
              <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.75} />
              Active · {user.role}
            </span>
            <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-fg">
              You already plan events.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              This form is only for student accounts requesting planner privileges.
            </p>
            <Link
              href="/events"
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-card border border-fg bg-accent px-6 font-mono text-xs font-bold uppercase tracking-[0.18em] text-accent-fg shadow-[3px_3px_0px_var(--fg)] transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              Open events desk
              <ArrowUpRight className="h-4 w-4" strokeWidth={1.75} />
            </Link>
          </div>
        ) : null}

        {submitted ? (
          <div className="border border-fg bg-surface rounded-card shadow-[4px_4px_0px_var(--fg)]">
            <div className="flex items-center justify-between bg-fg px-6 py-3.5 text-bg">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em]">
                Submission Receipt
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
                <Clock className="h-3.5 w-3.5" strokeWidth={1.75} />
                Pending Review
              </span>
            </div>
            <div className="p-8">
              <h2 className="font-display text-3xl font-bold tracking-tight text-fg">
                Application received.
              </h2>
              <p className="mt-3 text-base leading-relaxed text-muted">
                A super-admin will approve or reject it. You can keep using your student wallet
                until then.
              </p>
              <Link
                href="/wallet"
                className="mt-6 inline-flex h-11 items-center gap-2 rounded-card border border-fg bg-bg px-5 font-mono text-xs font-bold uppercase tracking-[0.16em] text-fg transition-colors hover:bg-fg hover:text-bg"
              >
                Return to wallet
                <ArrowUpRight className="h-4 w-4" strokeWidth={1.75} />
              </Link>
            </div>
          </div>
        ) : null}

        {!submitted && authStatus === "authenticated" && user?.role === "student" ? (
          <form
            onSubmit={onSubmit}
            className="border border-fg bg-surface rounded-card shadow-[4px_4px_0px_var(--fg)]"
            noValidate
          >
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-fg">
                Organizer Credentials
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
                Form 02
              </span>
            </div>

            <div className="p-6 md:p-8">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="details"
                    className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-muted"
                  >
                    <Building2 className="h-3.5 w-3.5 text-fg" strokeWidth={1.75} />
                    Committee or Company
                  </label>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted tabular-nums">
                    {details.length} / 4000
                  </span>
                </div>
                <textarea
                  id="details"
                  name="corporate_details"
                  placeholder="Name your club, student council, department, or partner organization and the events you plan to run."
                  value={details}
                  onChange={(event) => setDetails(event.target.value)}
                  className="mt-2 min-h-36 w-full rounded-card border border-line bg-bg px-4 py-3 text-base text-fg placeholder:text-muted/60 transition-colors focus:border-fg"
                  maxLength={4000}
                  required
                />
              </div>

              <div className="mt-6">
                <span className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                  <FileText className="h-3.5 w-3.5 text-fg" strokeWidth={1.75} />
                  ID Card Verification
                </span>

                <label
                  htmlFor="id-card"
                  className="mt-2 flex cursor-pointer flex-col items-start justify-between gap-3 rounded-card border border-dashed border-fg bg-bg p-4 transition-colors hover:bg-surface sm:flex-row sm:items-center focus-within:outline-2 focus-within:outline-accent"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card border border-fg bg-surface text-fg">
                      <Upload className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs font-semibold text-fg">
                        {file !== null ? file.name : "Choose photo or PDF of your ID card"}
                      </p>
                      <p className="mt-0.5 font-mono text-[11px] text-muted tabular-nums">
                        {file !== null
                          ? formatFileSize(file.size)
                          : "JPEG, PNG, WebP, or PDF · 5 MB max"}
                      </p>
                    </div>
                  </div>

                  <span className="shrink-0 rounded-card border border-fg bg-surface px-3.5 py-2 font-mono text-[11px] font-bold uppercase tracking-wider text-fg">
                    {file !== null ? "Replace" : "Browse"}
                  </span>

                  <input
                    id="id-card"
                    name="id_card"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                    className="sr-only"
                    required
                  />
                </label>
              </div>

              {formError !== "" ? (
                <div
                  role="alert"
                  className="mt-5 flex items-start gap-2.5 rounded-card border border-accent bg-bg px-3.5 py-3 text-sm text-fg"
                >
                  <ShieldAlert
                    className="mt-0.5 h-4 w-4 shrink-0 text-accent"
                    strokeWidth={1.75}
                  />
                  <span>{formError}</span>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={pending}
                className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-card border border-fg bg-accent px-6 font-mono text-xs font-bold uppercase tracking-[0.18em] text-accent-fg shadow-[3px_3px_0px_var(--fg)] transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60"
              >
                {pending ? "Sending…" : "Submit application"}
                {!pending ? <ArrowUpRight className="h-4 w-4" strokeWidth={1.75} /> : null}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </section>
  );
}