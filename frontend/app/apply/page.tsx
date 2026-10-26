"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError, api, type AuthResponse, type User } from "../../lib/api";

function failureMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return "The campus server didn't answer.";
}

export default function ApplyPage() {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "signed-out" | "error" | "sent">("loading");
  const [details, setDetails] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    document.title = "Apply · UniTik";
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
        setError(failureMessage(err));
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (details.trim() === "") {
      setError("Tell us which committee or company you represent.");
      return;
    }
    if (file === null) {
      setError("Upload a photo or PDF of your ID card.");
      return;
    }
    const body = new FormData();
    body.set("corporate_details", details.trim());
    body.set("id_card", file);
    setPending(true);
    try {
      await api("/applications/apply.php", { method: "POST", body });
      setStatus("sent");
    } catch (err) {
      setError(failureMessage(err));
      setPending(false);
    }
  }

  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 md:grid-cols-2 md:py-24">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-muted">Planner application</p>
        <h1 className="mt-4 font-display text-5xl leading-tight text-fg">Ask to publish.</h1>
        <p className="mt-5 max-w-md text-base leading-normal text-muted">
          Students stay students until a super-admin approves this request. Then the same email can sign in
          as an event planner.
        </p>
      </div>

      {status === "loading" ? <p className="text-base text-muted">Checking this browser…</p> : null}

      {status === "signed-out" ? (
        <div className="rounded-card border border-line bg-surface p-6 md:p-8">
          <h2 className="font-display text-3xl text-fg">Sign in first.</h2>
          <Link
            href="/login"
            className="mt-6 inline-flex h-12 items-center rounded-full bg-accent px-6 text-accent-fg"
          >
            Sign in
          </Link>
        </div>
      ) : null}

      {status === "error" ? (
        <p role="alert" className="text-base text-muted">
          {error}
        </p>
      ) : null}

      {status === "ready" && user !== null && user.role !== "student" ? (
        <div className="rounded-card border border-line bg-surface p-6 md:p-8">
          <h2 className="font-display text-3xl text-fg">You already plan events.</h2>
          <p className="mt-3 text-base text-muted">This form is only for student accounts.</p>
        </div>
      ) : null}

      {status === "sent" ? (
        <div className="rounded-card border border-line bg-surface p-6 md:p-8">
          <p className="text-xs font-medium uppercase tracking-widest text-muted">Pending</p>
          <h2 className="mt-4 font-display text-3xl text-fg">Application received.</h2>
          <p className="mt-3 text-base leading-normal text-muted">
            A super-admin will approve or reject it. You can keep using your student wallet until then.
          </p>
        </div>
      ) : null}

      {status === "ready" && user?.role === "student" ? (
        <form onSubmit={onSubmit} className="rounded-card border border-line bg-surface p-6 md:p-8" noValidate>
          <label className="block text-sm text-fg" htmlFor="details">
            Committee or company
            <textarea
              id="details"
              name="corporate_details"
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              className="mt-2 min-h-36 w-full rounded-2xl border border-line bg-bg px-4 py-3 text-base text-fg"
              maxLength={4000}
              required
            />
          </label>
          <label className="mt-5 block text-sm text-fg" htmlFor="id-card">
            ID card
            <input
              id="id-card"
              name="id_card"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="mt-2 block w-full text-sm text-muted file:mr-4 file:h-11 file:rounded-full file:border-0 file:bg-accent file:px-4 file:text-sm file:text-accent-fg"
              required
            />
          </label>
          <p className="mt-3 text-sm text-muted">JPEG, PNG, WebP, or PDF. 5 MB maximum.</p>
          {error !== "" ? (
            <p role="alert" className="mt-4 text-sm text-fg">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className="mt-6 h-12 w-full rounded-full bg-accent text-accent-fg disabled:opacity-60"
          >
            {pending ? "Sending…" : "Submit application"}
          </button>
        </form>
      ) : null}
    </section>
  );
}
