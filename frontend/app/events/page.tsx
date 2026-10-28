"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError, api, type AuthResponse, type User } from "../../lib/api";

type CampusEvent = {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  venue: string;
  venue_url?: string | null;
  image_url?: string | null;
  capacity?: number;
  max_tickets_per_user?: number;
  organizer_name: string;
  can_manage: boolean;
};

type ScanResult = {
  already_scanned: boolean;
  ticket: {
    title: string;
    ticket_code: string;
    is_scanned: boolean;
    venue: string;
  };
};

type Draft = {
  title: string;
  description: string;
  event_date: string;
  venue: string;
  venue_url: string;
  image_url: string;
  capacity: string;
  max_tickets_per_user: string;
};

const emptyDraft: Draft = {
  title: "",
  description: "",
  event_date: "",
  venue: "",
  venue_url: "",
  image_url: "",
  capacity: "200",
  max_tickets_per_user: "5",
};

function failureMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return "The campus server didn't answer.";
}

function formatWhen(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function toLocalInput(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function isPlanner(user: User): boolean {
  return user.role === "organizer" || user.role === "admin";
}

export default function EventsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "signed-out" | "error">("loading");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState("");
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft);
  const [pending, setPending] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState("");
  const [scanCode, setScanCode] = useState("");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  useEffect(() => {
    document.title = "Events · UniTik";
    let cancelled = false;

    api<AuthResponse>("/me.php")
      .then(async (me) => {
        if (cancelled) return;
        setUser(me.user);
        if (!isPlanner(me.user)) {
          setStatus("ready");
          return;
        }
        const data = await api<{ ok: true; events: CampusEvent[] }>("/events/list.php");
        if (cancelled) return;
        setEvents(data.events);
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

  function payload(source: Draft) {
    return {
      title: source.title.trim(),
      description: source.description.trim(),
      venue: source.venue.trim(),
      venue_url: source.venue_url.trim(),
      image_url: source.image_url.trim(),
      capacity: parseInt(source.capacity, 10) || 200,
      max_tickets_per_user: parseInt(source.max_tickets_per_user, 10) || 5,
      event_date: new Date(source.event_date).toISOString(),
    };
  }

  async function publish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending("create");
    setError("");
    try {
      const data = await api<{ ok: true; event: CampusEvent }>("/events/create.php", {
        method: "POST",
        body: JSON.stringify(payload(draft)),
      });
      setEvents((current) => [...current, data.event].sort((a, b) => a.event_date.localeCompare(b.event_date)));
      setDraft(emptyDraft);
    } catch (err) {
      setError(failureMessage(err));
    } finally {
      setPending("");
    }
  }

  async function saveEdit(id: string) {
    setPending(id);
    setError("");
    try {
      const data = await api<{ ok: true; event: CampusEvent }>("/events/update.php", {
        method: "POST",
        body: JSON.stringify({ id, ...payload(editDraft) }),
      });
      setEvents((current) =>
        current
          .map((item) => (item.id === id ? data.event : item))
          .sort((a, b) => a.event_date.localeCompare(b.event_date)),
      );
      setEditingId("");
    } catch (err) {
      setError(failureMessage(err));
    } finally {
      setPending("");
    }
  }

  async function remove(id: string) {
    setPending(id);
    setError("");
    try {
      await api<{ ok: true }>("/events/delete.php", {
        method: "POST",
        body: JSON.stringify({ id }),
      });
      setEvents((current) => current.filter((item) => item.id !== id));
      setConfirmDeleteId("");
    } catch (err) {
      setError(failureMessage(err));
    } finally {
      setPending("");
    }
  }

  async function scan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending("scan");
    setError("");
    setScanResult(null);
    try {
      const data = await api<ScanResult & { ok: true }>("/tickets/scan.php", {
        method: "POST",
        body: JSON.stringify({ ticket_code: scanCode.trim() }),
      });
      setScanResult(data);
      setScanCode("");
    } catch (err) {
      setError(failureMessage(err));
    } finally {
      setPending("");
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-5 py-16 md:py-24">
      <p className="text-xs font-medium uppercase tracking-widest text-muted">Events desk</p>

      {status === "loading" ? (
        <h1 className="mt-4 font-display text-5xl leading-tight text-fg">Checking this browser…</h1>
      ) : null}

      {status === "signed-out" ? (
        <div className="mt-4 max-w-xl">
          <h1 className="font-display text-5xl leading-tight text-fg">Sign in to publish.</h1>
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
          <h1 className="font-display text-5xl leading-tight text-fg">Events didn't load.</h1>
          <p role="alert" className="mt-5 text-base leading-normal text-muted">
            {error}
          </p>
        </div>
      ) : null}

      {status === "ready" && user !== null && !isPlanner(user) ? (
        <div className="mt-4 max-w-xl">
          <h1 className="font-display text-5xl leading-tight text-fg">Students book, they don't publish.</h1>
          <p className="mt-5 text-base leading-normal text-muted">
            Your account can view events and hold tickets. Publishing stays with event planners.
          </p>
          <Link
            href="/wallet"
            className="mt-8 inline-flex h-12 items-center rounded-full bg-accent px-6 text-accent-fg"
          >
            Open your wallet
          </Link>
        </div>
      ) : null}

      {status === "ready" && user !== null && isPlanner(user) ? (
        <div className="mt-4">
          <h1 className="font-display text-5xl leading-tight text-fg">Publish the night.</h1>
          <p className="mt-5 max-w-xl text-base leading-normal text-muted">
            {user.role === "admin"
              ? "You can edit every event and validate any ticket at the door."
              : "You can edit the events you published, and scan those tickets at the door."}
          </p>
          {error !== "" ? (
            <p role="alert" className="mt-5 text-sm text-fg">
              {error}
            </p>
          ) : null}

          <form onSubmit={publish} className="mt-10 grid gap-5 rounded-card border border-line bg-surface p-6 md:p-8">
            <h2 className="font-display text-3xl text-fg">New event</h2>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm text-fg" htmlFor="title">
                Title
                <input
                  id="title"
                  value={draft.title}
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                  className="mt-2 h-12 w-full rounded-2xl border border-line bg-bg px-4 text-base text-fg"
                  required
                  maxLength={200}
                />
              </label>
              <label className="block text-sm text-fg" htmlFor="when">
                When
                <input
                  id="when"
                  type="datetime-local"
                  value={draft.event_date}
                  onChange={(event) => setDraft({ ...draft, event_date: event.target.value })}
                  className="mt-2 h-12 w-full rounded-2xl border border-line bg-bg px-4 text-base text-fg"
                  required
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm text-fg" htmlFor="venue">
                Venue name
                <input
                  id="venue"
                  value={draft.venue}
                  onChange={(event) => setDraft({ ...draft, venue: event.target.value })}
                  className="mt-2 h-12 w-full rounded-2xl border border-line bg-bg px-4 text-base text-fg"
                  required
                  maxLength={100}
                />
              </label>
              <label className="block text-sm text-fg" htmlFor="venue_url">
                Venue URL (Maps/Directions)
                <input
                  id="venue_url"
                  type="url"
                  value={draft.venue_url}
                  onChange={(event) => setDraft({ ...draft, venue_url: event.target.value })}
                  className="mt-2 h-12 w-full rounded-2xl border border-line bg-bg px-4 text-base text-fg"
                  placeholder="https://maps.google.com/..."
                />
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block text-sm text-fg sm:col-span-2" htmlFor="image_url">
                Event Image URL
                <input
                  id="image_url"
                  type="url"
                  value={draft.image_url}
                  onChange={(event) => setDraft({ ...draft, image_url: event.target.value })}
                  className="mt-2 h-12 w-full rounded-2xl border border-line bg-bg px-4 text-base text-fg"
                  placeholder="https://images.unsplash.com/..."
                />
              </label>
              <label className="block text-sm text-fg" htmlFor="capacity">
                Capacity
                <input
                  id="capacity"
                  type="number"
                  min="1"
                  max="10000"
                  value={draft.capacity}
                  onChange={(event) => setDraft({ ...draft, capacity: event.target.value })}
                  className="mt-2 h-12 w-full rounded-2xl border border-line bg-bg px-4 text-base text-fg"
                  required
                />
              </label>
            </div>

            <label className="block text-sm text-fg" htmlFor="max_tickets_per_user">
              Max Tickets Per Student Account (1–10)
              <input
                id="max_tickets_per_user"
                type="number"
                min="1"
                max="10"
                value={draft.max_tickets_per_user}
                onChange={(event) => setDraft({ ...draft, max_tickets_per_user: event.target.value })}
                className="mt-2 h-12 w-full rounded-2xl border border-line bg-bg px-4 text-base text-fg"
                required
              />
            </label>

            <label className="block text-sm text-fg" htmlFor="description">
              Description
              <textarea
                id="description"
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                className="mt-2 min-h-28 w-full rounded-2xl border border-line bg-bg px-4 py-3 text-base text-fg"
                maxLength={4000}
              />
            </label>

            <button
              type="submit"
              disabled={pending === "create"}
              className="h-12 rounded-full bg-accent px-6 text-accent-fg disabled:opacity-60"
            >
              {pending === "create" ? "Publishing…" : "Publish event"}
            </button>
          </form>

          <ul className="mt-10 grid gap-4">
            {events.length === 0 ? <li className="text-base text-muted">Nothing published yet.</li> : null}
            {events.map((event) => (
              <li key={event.id} className="rounded-card border border-line bg-surface p-6">
                {editingId === event.id ? (
                  <div className="grid gap-4">
                    <input
                      value={editDraft.title}
                      onChange={(input) => setEditDraft({ ...editDraft, title: input.target.value })}
                      className="h-12 w-full rounded-2xl border border-line bg-bg px-4 text-base text-fg"
                      aria-label="Title"
                    />
                    <input
                      value={editDraft.venue}
                      onChange={(input) => setEditDraft({ ...editDraft, venue: input.target.value })}
                      className="h-12 w-full rounded-2xl border border-line bg-bg px-4 text-base text-fg"
                      aria-label="Venue"
                    />
                    <input
                      type="datetime-local"
                      value={editDraft.event_date}
                      onChange={(input) => setEditDraft({ ...editDraft, event_date: input.target.value })}
                      className="h-12 w-full rounded-2xl border border-line bg-bg px-4 text-base text-fg"
                      aria-label="When"
                    />
                    <textarea
                      value={editDraft.description}
                      onChange={(input) => setEditDraft({ ...editDraft, description: input.target.value })}
                      className="min-h-24 w-full rounded-2xl border border-line bg-bg px-4 py-3 text-base text-fg"
                      aria-label="Description"
                    />
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={pending === event.id}
                        onClick={() => saveEdit(event.id)}
                        className="h-11 rounded-full bg-accent px-5 text-accent-fg disabled:opacity-60"
                      >
                        {pending === event.id ? "Saving…" : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId("")}
                        className="h-11 rounded-full border border-line px-5 text-fg"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="font-display text-2xl text-fg">{event.title}</h2>
                      <p className="mt-1 text-sm text-muted">
                        {event.venue} · {formatWhen(event.event_date)}
                      </p>
                      {event.venue_url ? (
                        <a href={event.venue_url} target="_blank" rel="noreferrer" className="text-xs text-accent underline mt-1 block">
                          View venue map & directions ↗
                        </a>
                      ) : null}
                      {event.description ? (
                        <p className="mt-3 max-w-xl text-base leading-normal text-muted">{event.description}</p>
                      ) : null}
                      <p className="mt-2 text-sm text-muted">Posted by {event.organizer_name} (Max {event.max_tickets_per_user} tickets/student)</p>
                    </div>
                    {event.can_manage ? (
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(event.id);
                            setConfirmDeleteId("");
                            setEditDraft({
                              title: event.title,
                              venue: event.venue,
                              venue_url: event.venue_url ?? "",
                              image_url: event.image_url ?? "",
                              capacity: String(event.capacity ?? 200),
                              max_tickets_per_user: String(event.max_tickets_per_user ?? 5),
                              description: event.description ?? "",
                              event_date: toLocalInput(event.event_date),
                            });
                          }}
                          className="h-11 rounded-full border border-line px-5 text-fg"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={pending === event.id}
                          onClick={() => {
                            if (confirmDeleteId === event.id) {
                              void remove(event.id);
                              return;
                            }
                            setConfirmDeleteId(event.id);
                          }}
                          className="h-11 rounded-full border border-line px-5 text-fg disabled:opacity-60"
                        >
                          {confirmDeleteId === event.id ? "Confirm delete" : "Delete"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}
              </li>
            ))}
          </ul>

          <form onSubmit={scan} className="mt-12 rounded-card border border-line bg-surface p-6 md:p-8">
            <h2 className="font-display text-3xl text-fg">Scan a ticket</h2>
            <p className="mt-3 text-base text-muted">Admins can scan any ticket. Organizers can scan their own events.</p>
            <label className="mt-5 block text-sm text-fg" htmlFor="code">
              Ticket code
              <input
                id="code"
                value={scanCode}
                onChange={(event) => setScanCode(event.target.value.toUpperCase())}
                className="mt-2 h-12 w-full rounded-2xl border border-line bg-bg px-4 text-base tracking-widest text-fg"
                required
                maxLength={64}
                autoComplete="off"
              />
            </label>
            <button
              type="submit"
              disabled={pending === "scan"}
              className="mt-5 h-12 rounded-full bg-accent px-6 text-accent-fg disabled:opacity-60"
            >
              {pending === "scan" ? "Checking…" : "Validate"}
            </button>
            {scanResult ? (
              <p className="mt-5 text-base text-fg">
                {scanResult.ticket.title} · {scanResult.ticket.ticket_code} ·{" "}
                {scanResult.already_scanned ? "Already scanned" : "Marked scanned"}
              </p>
            ) : null}
          </form>
        </div>
      ) : null}
    </section>
  );
}