"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Plus,
  ScanLine,
  ShieldAlert,
  Ticket,
  Trash2,
} from "lucide-react";
import {
  TicketEventCard,
  type TicketEventCardEvent,
} from "../../components/TicketEventCard";
import { ApiError, api, type User } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";

type CampusEvent = TicketEventCardEvent & {
  can_manage: boolean;
};

type ScanResult = {
  already_scanned: boolean;
  ticket: {
    title: string;
    ticket_code: string;
    is_scanned: boolean;
    venue: string;
    tier_name?: string;
  };
};

type TierDraft = {
  id?: string;
  name: string;
  price: string;
  capacity: string;
  sold?: number;
};

type Draft = {
  title: string;
  description: string;
  event_date: string;
  venue: string;
  venue_url: string;
  image_url: string;
  max_tickets_per_user: string;
  tiers: TierDraft[];
};

function createEmptyDraft(): Draft {
  return {
    title: "",
    description: "",
    event_date: "",
    venue: "",
    venue_url: "",
    image_url: "",
    max_tickets_per_user: "5",
    tiers: [{ name: "General Admission", price: "0", capacity: "200" }],
  };
}

function failureMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return "The campus server didn't answer.";
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

function sumDraftCapacity(tiers: TierDraft[]): number {
  return tiers.reduce((sum, t) => sum + (Number.parseInt(t.capacity, 10) || 0), 0);
}

export default function EventsPage() {
  const { user, status: authStatus, error: authError } = useAuth();
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [pageError, setPageError] = useState("");
  const [draft, setDraft] = useState<Draft>(createEmptyDraft);
  const [editingId, setEditingId] = useState("");
  const [editDraft, setEditDraft] = useState<Draft>(createEmptyDraft);
  const [pending, setPending] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState("");
  const [scanCode, setScanCode] = useState("");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  useEffect(() => {
    document.title = "Events · UniTik";
  }, []);

  useEffect(() => {
    if (authStatus !== "authenticated" || user === null || !isPlanner(user)) return;

    let cancelled = false;
    setDataLoading(true);
    setPageError("");

    api<{ ok: true; events: CampusEvent[] }>("/events/list.php")
      .then((data) => {
        if (cancelled) return;
        setEvents(data.events);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setPageError(failureMessage(err));
      })
      .finally(() => {
        if (!cancelled) setDataLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authStatus, user]);

  function buildPayload(source: Draft) {
    const parsedDate = new Date(source.event_date);
    if (source.event_date.trim() === "" || Number.isNaN(parsedDate.getTime())) {
      throw new ApiError(400, "Please pick a valid event date and time.");
    }

    const tiers = source.tiers.map((tier) => ({
      ...(tier.id ? { id: tier.id } : {}),
      name: tier.name.trim(),
      price: Number.parseFloat(tier.price || "0") || 0,
      capacity: Number.parseInt(tier.capacity, 10) || 0,
    }));

    return {
      title: source.title.trim(),
      description: source.description.trim(),
      venue: source.venue.trim(),
      venue_url: source.venue_url.trim(),
      image_url: source.image_url.trim(),
      max_tickets_per_user: Number.parseInt(source.max_tickets_per_user, 10) || 5,
      event_date: parsedDate.toISOString(),
      tiers,
    };
  }

  function updateDraftTier(
    setter: React.Dispatch<React.SetStateAction<Draft>>,
    index: number,
    patch: Partial<TierDraft>
  ) {
    setter((prev) => ({
      ...prev,
      tiers: prev.tiers.map((tier, idx) => (idx === index ? { ...tier, ...patch } : tier)),
    }));
  }

  function addDraftTier(setter: React.Dispatch<React.SetStateAction<Draft>>) {
    setter((prev) => {
      if (prev.tiers.length >= 10) return prev;
      return {
        ...prev,
        tiers: [
          ...prev.tiers,
          { name: `Tier ${prev.tiers.length + 1}`, price: "0", capacity: "50" },
        ],
      };
    });
  }

  function removeDraftTier(setter: React.Dispatch<React.SetStateAction<Draft>>, index: number) {
    setter((prev) => {
      if (prev.tiers.length <= 1) return prev;
      return {
        ...prev,
        tiers: prev.tiers.filter((_, idx) => idx !== index),
      };
    });
  }

  async function publish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending("create");
    setPageError("");
    try {
      const body = buildPayload(draft);
      const data = await api<{ ok: true; event: CampusEvent }>("/events/create.php", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setEvents((current) =>
        [...current, data.event].sort((a, b) => a.event_date.localeCompare(b.event_date))
      );
      setDraft(createEmptyDraft());
    } catch (err) {
      setPageError(failureMessage(err));
    } finally {
      setPending("");
    }
  }

  async function saveEdit(id: string) {
    setPending(id);
    setPageError("");
    try {
      const body = buildPayload(editDraft);
      const data = await api<{ ok: true; event: CampusEvent }>("/events/update.php", {
        method: "POST",
        body: JSON.stringify({ id, ...body }),
      });
      setEvents((current) =>
        current
          .map((item) => (item.id === id ? data.event : item))
          .sort((a, b) => a.event_date.localeCompare(b.event_date))
      );
      setEditingId("");
    } catch (err) {
      setPageError(failureMessage(err));
    } finally {
      setPending("");
    }
  }

  async function remove(id: string) {
    setPending(id);
    setPageError("");
    try {
      await api<{ ok: true }>("/events/delete.php", {
        method: "POST",
        body: JSON.stringify({ id }),
      });
      setEvents((current) => current.filter((item) => item.id !== id));
      setConfirmDeleteId("");
    } catch (err) {
      setPageError(failureMessage(err));
    } finally {
      setPending("");
    }
  }

  async function scan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending("scan");
    setPageError("");
    setScanResult(null);
    try {
      const data = await api<ScanResult & { ok: true }>("/tickets/scan.php", {
        method: "POST",
        body: JSON.stringify({ ticket_code: scanCode.trim() }),
      });
      setScanResult(data);
      setScanCode("");
    } catch (err) {
      setPageError(failureMessage(err));
    } finally {
      setPending("");
    }
  }

  const totalSeats = events.reduce((acc, ev) => acc + (ev.capacity ?? 0), 0);
  const totalSold = events.reduce((acc, ev) => acc + (ev.sold_count ?? 0), 0);
  const isLoading =
    authStatus === "loading" ||
    (authStatus === "authenticated" && user !== null && isPlanner(user) && dataLoading);

  return (
    <section className="mx-auto max-w-6xl px-5 py-12 md:py-20">
      <p className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-muted">
        <Calendar className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} />
        Events Desk · Publisher Control
      </p>

      {isLoading ? (
        <div className="mt-6 border-t border-line pt-8">
          <h1 className="font-display text-4xl font-bold tracking-tight text-fg md:text-5xl">
            Loading campus schedule…
          </h1>
          <p className="mt-3 font-mono text-xs uppercase tracking-wider text-muted">
            Syncing published events &amp; ticket tiers
          </p>
        </div>
      ) : null}

      {authStatus === "signed-out" ? (
        <div className="mt-6 max-w-xl border border-fg bg-surface p-8 rounded-card shadow-[4px_4px_0px_var(--fg)]">
          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-fg">
            Sign in to publish.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted">
            Event management and tier configuration require an active planner session.
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
            Events didn&apos;t load.
          </h1>
          <p role="alert" className="mt-3 text-sm text-muted">
            {authError}
          </p>
        </div>
      ) : null}

      {authStatus === "authenticated" && user !== null && !isPlanner(user) ? (
        <div className="mt-6 max-w-xl border border-fg bg-surface p-8 rounded-card shadow-[4px_4px_0px_var(--fg)]">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
            Role · {user.role}
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold leading-tight tracking-tight text-fg">
            Students book, they don&apos;t publish.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted">
            Your account can view events and hold tickets. Publishing stays with event planners.
          </p>
          <Link
            href="/wallet"
            className="mt-7 inline-flex h-11 items-center gap-2 rounded-card border border-fg bg-accent px-6 font-mono text-xs font-bold uppercase tracking-[0.18em] text-accent-fg shadow-[3px_3px_0px_var(--fg)] transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            Open your wallet
            <ArrowUpRight className="h-4 w-4" strokeWidth={1.75} />
          </Link>
        </div>
      ) : null}

      {!isLoading && authStatus === "authenticated" && user !== null && isPlanner(user) ? (
        <div className="mt-5 space-y-12">
          {/* Editorial Header + KPI Strip */}
          <div className="flex flex-col gap-6 border-b border-line pb-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="font-display text-4xl font-bold leading-none tracking-tight text-fg md:text-5xl">
                Publish the night.
              </h1>
              <p className="mt-3 max-w-xl text-base leading-relaxed text-muted">
                {user.role === "admin"
                  ? "Configure multi-tier seat caps, manage every campus event, and scan any ticket at the gate."
                  : "Configure multi-tier seat caps for your events and validate tickets at the door."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="grid grid-cols-3 divide-x divide-line border border-line bg-surface rounded-card">
                <div className="px-4 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                    Events
                  </p>
                  <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-fg">
                    {events.length}
                  </p>
                </div>
                <div className="px-4 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                    Booked
                  </p>
                  <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-stamp">
                    {totalSold}
                  </p>
                </div>
                <div className="px-4 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                    Capacity
                  </p>
                  <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-fg">
                    {totalSeats}
                  </p>
                </div>
              </div>

              <Link
                href="/scan"
                className="inline-flex h-12 items-center gap-2 rounded-card border border-fg bg-surface px-4 font-mono text-xs font-bold uppercase tracking-wider text-fg shadow-[3px_3px_0px_var(--fg)] transition-colors hover:bg-fg hover:text-bg"
              >
                <ScanLine className="h-4 w-4 text-accent" strokeWidth={1.75} />
                Door Scanner
              </Link>
            </div>
          </div>

          {pageError !== "" ? (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-card border border-accent bg-surface px-4 py-3 text-sm text-fg"
            >
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={1.75} />
              <span>{pageError}</span>
            </div>
          ) : null}

          {/* New Event + Multi-Tier Builder Form */}
          <form
            onSubmit={publish}
            className="border border-fg bg-surface rounded-card shadow-[4px_4px_0px_var(--fg)]"
          >
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-fg">
                New Campus Event
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted tabular-nums">
                Total Seats · {sumDraftCapacity(draft.tiers)}
              </span>
            </div>

            <div className="grid gap-5 p-6 md:p-8">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="title"
                    className="block font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-muted"
                  >
                    Event Title
                  </label>
                  <input
                    id="title"
                    value={draft.title}
                    onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                    placeholder="e.g. Annual Tech Symposium"
                    className="mt-2 h-11 w-full rounded-card border border-line bg-bg px-3.5 text-base text-fg placeholder:text-muted/60 focus:border-fg"
                    required
                    maxLength={200}
                  />
                </div>
                <div>
                  <label
                    htmlFor="when"
                    className="block font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-muted"
                  >
                    Date &amp; Time
                  </label>
                  <input
                    id="when"
                    type="datetime-local"
                    value={draft.event_date}
                    onChange={(event) => setDraft({ ...draft, event_date: event.target.value })}
                    className="mt-2 h-11 w-full rounded-card border border-line bg-bg px-3.5 font-mono text-sm text-fg focus:border-fg"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="venue"
                    className="block font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-muted"
                  >
                    Venue Name
                  </label>
                  <input
                    id="venue"
                    value={draft.venue}
                    onChange={(event) => setDraft({ ...draft, venue: event.target.value })}
                    placeholder="e.g. North Auditorium"
                    className="mt-2 h-11 w-full rounded-card border border-line bg-bg px-3.5 text-base text-fg placeholder:text-muted/60 focus:border-fg"
                    required
                    maxLength={200}
                  />
                </div>
                <div>
                  <label
                    htmlFor="venue_url"
                    className="block font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-muted"
                  >
                    Venue Map URL (Optional)
                  </label>
                  <input
                    id="venue_url"
                    type="url"
                    value={draft.venue_url}
                    onChange={(event) => setDraft({ ...draft, venue_url: event.target.value })}
                    placeholder="https://maps.google.com/..."
                    className="mt-2 h-11 w-full rounded-card border border-line bg-bg px-3.5 text-sm text-fg placeholder:text-muted/60 focus:border-fg"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="image_url"
                    className="block font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-muted"
                  >
                    Poster Image URL (Optional)
                  </label>
                  <input
                    id="image_url"
                    type="url"
                    value={draft.image_url}
                    onChange={(event) => setDraft({ ...draft, image_url: event.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="mt-2 h-11 w-full rounded-card border border-line bg-bg px-3.5 text-sm text-fg placeholder:text-muted/60 focus:border-fg"
                  />
                </div>
                <div>
                  <label
                    htmlFor="max_tickets_per_user"
                    className="block font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-muted"
                  >
                    Max / Student (1–10)
                  </label>
                  <input
                    id="max_tickets_per_user"
                    type="number"
                    min={1}
                    max={10}
                    value={draft.max_tickets_per_user}
                    onChange={(event) =>
                      setDraft({ ...draft, max_tickets_per_user: event.target.value })
                    }
                    className="mt-2 h-11 w-full rounded-card border border-line bg-bg px-3.5 font-mono text-sm tabular-nums text-fg focus:border-fg"
                    required
                  />
                </div>
              </div>

              {/* 3NF Ticket Tiers Editor */}
              <div className="border-t border-dashed border-line pt-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-fg">
                      <Ticket className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} />
                      Ticket Tiers ({draft.tiers.length}/10)
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      Each tier has its own price and concurrency-locked seat pool.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={draft.tiers.length >= 10}
                    onClick={() => addDraftTier(setDraft)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-card border border-fg bg-bg px-3 font-mono text-[11px] font-bold uppercase tracking-wider text-fg transition-colors hover:bg-fg hover:text-bg disabled:opacity-40"
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
                    Add Tier
                  </button>
                </div>

                <div className="mt-3 space-y-2.5">
                  {draft.tiers.map((tier, index) => (
                    <div
                      key={index}
                      className="grid gap-3 rounded-card border border-line bg-bg p-3.5 sm:grid-cols-12 sm:items-end"
                    >
                      <div className="sm:col-span-5">
                        <label
                          htmlFor={`tier-name-${index}`}
                          className="block font-mono text-[10px] uppercase tracking-[0.16em] text-muted"
                        >
                          Tier Name
                        </label>
                        <input
                          id={`tier-name-${index}`}
                          value={tier.name}
                          onChange={(e) => updateDraftTier(setDraft, index, { name: e.target.value })}
                          placeholder="e.g. Early Bird, VIP, General"
                          maxLength={80}
                          required
                          className="mt-1 h-10 w-full rounded-card border border-line bg-surface px-3 text-sm text-fg focus:border-fg"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label
                          htmlFor={`tier-price-${index}`}
                          className="block font-mono text-[10px] uppercase tracking-[0.16em] text-muted"
                        >
                          Price (₹ · 0 = Free)
                        </label>
                        <input
                          id={`tier-price-${index}`}
                          type="number"
                          min={0}
                          max={100000}
                          step="0.01"
                          value={tier.price}
                          onChange={(e) =>
                            updateDraftTier(setDraft, index, { price: e.target.value })
                          }
                          required
                          className="mt-1 h-10 w-full rounded-card border border-line bg-surface px-3 font-mono text-sm tabular-nums text-fg focus:border-fg"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label
                          htmlFor={`tier-cap-${index}`}
                          className="block font-mono text-[10px] uppercase tracking-[0.16em] text-muted"
                        >
                          Seats
                        </label>
                        <input
                          id={`tier-cap-${index}`}
                          type="number"
                          min={1}
                          max={10000}
                          value={tier.capacity}
                          onChange={(e) =>
                            updateDraftTier(setDraft, index, { capacity: e.target.value })
                          }
                          required
                          className="mt-1 h-10 w-full rounded-card border border-line bg-surface px-3 font-mono text-sm tabular-nums text-fg focus:border-fg"
                        />
                      </div>

                      <div className="flex justify-end sm:col-span-1">
                        <button
                          type="button"
                          disabled={draft.tiers.length <= 1}
                          onClick={() => removeDraftTier(setDraft, index)}
                          aria-label={`Remove ${tier.name || "tier"}`}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-card border border-line bg-surface text-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-35"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="block font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-muted"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  value={draft.description}
                  onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                  placeholder="Agenda, entry guidelines, or speaker highlights…"
                  className="mt-2 min-h-24 w-full rounded-card border border-line bg-bg px-3.5 py-3 text-sm text-fg placeholder:text-muted/60 focus:border-fg"
                  maxLength={4000}
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={pending === "create"}
                  className="inline-flex h-12 items-center gap-2 rounded-card border border-fg bg-accent px-6 font-mono text-xs font-bold uppercase tracking-[0.18em] text-accent-fg shadow-[3px_3px_0px_var(--fg)] transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60"
                >
                  {pending === "create" ? "Publishing…" : "Publish Event"}
                  {pending !== "create" ? (
                    <ArrowUpRight className="h-4 w-4" strokeWidth={1.75} />
                  ) : null}
                </button>
              </div>
            </div>
          </form>

          {/* Published Events Feed */}
          <div>
            <div className="flex items-baseline justify-between border-b border-line pb-3">
              <h2 className="font-display text-2xl font-bold tracking-tight text-fg md:text-3xl">
                Published schedule
              </h2>
              <span className="font-mono text-xs uppercase tracking-widest text-muted tabular-nums">
                {events.length} {events.length === 1 ? "Event" : "Events"}
              </span>
            </div>

            {events.length === 0 ? (
              <div className="mt-6 border border-dashed border-line bg-surface p-8 rounded-card text-sm text-muted">
                Nothing published yet. Create your first campus event above.
              </div>
            ) : (
              <ul className="mt-6 grid gap-5">
                {events.map((event) => (
                  <li key={event.id}>
                    {editingId === event.id ? (
                      <div className="border border-fg bg-surface p-6 rounded-card shadow-[4px_4px_0px_var(--fg)] space-y-5">
                        <div className="flex items-center justify-between border-b border-line pb-3">
                          <span className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-fg">
                            Editing · {event.title}
                          </span>
                          <span className="font-mono text-xs text-muted tabular-nums">
                            Total Seats · {sumDraftCapacity(editDraft.tiers)}
                          </span>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label className="block font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                              Title
                            </label>
                            <input
                              value={editDraft.title}
                              onChange={(input) =>
                                setEditDraft({ ...editDraft, title: input.target.value })
                              }
                              className="mt-1 h-11 w-full rounded-card border border-line bg-bg px-3.5 text-sm text-fg focus:border-fg"
                              aria-label="Title"
                            />
                          </div>
                          <div>
                            <label className="block font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                              Date &amp; Time
                            </label>
                            <input
                              type="datetime-local"
                              value={editDraft.event_date}
                              onChange={(input) =>
                                setEditDraft({ ...editDraft, event_date: input.target.value })
                              }
                              className="mt-1 h-11 w-full rounded-card border border-line bg-bg px-3.5 font-mono text-sm text-fg focus:border-fg"
                              aria-label="When"
                            />
                          </div>
                          <div>
                            <label className="block font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                              Venue
                            </label>
                            <input
                              value={editDraft.venue}
                              onChange={(input) =>
                                setEditDraft({ ...editDraft, venue: input.target.value })
                              }
                              className="mt-1 h-11 w-full rounded-card border border-line bg-bg px-3.5 text-sm text-fg focus:border-fg"
                              aria-label="Venue"
                            />
                          </div>
                          <div>
                            <label className="block font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                              Venue Map URL
                            </label>
                            <input
                              type="url"
                              value={editDraft.venue_url}
                              onChange={(input) =>
                                setEditDraft({ ...editDraft, venue_url: input.target.value })
                              }
                              className="mt-1 h-11 w-full rounded-card border border-line bg-bg px-3.5 text-sm text-fg focus:border-fg"
                              aria-label="Venue Map URL"
                            />
                          </div>
                          <div>
                            <label className="block font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                              Poster Image URL
                            </label>
                            <input
                              type="url"
                              value={editDraft.image_url}
                              onChange={(input) =>
                                setEditDraft({ ...editDraft, image_url: input.target.value })
                              }
                              className="mt-1 h-11 w-full rounded-card border border-line bg-bg px-3.5 text-sm text-fg focus:border-fg"
                              aria-label="Poster Image URL"
                            />
                          </div>
                          <div>
                            <label className="block font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                              Max / Student (1–10)
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={10}
                              value={editDraft.max_tickets_per_user}
                              onChange={(input) =>
                                setEditDraft({
                                  ...editDraft,
                                  max_tickets_per_user: input.target.value,
                                })
                              }
                              className="mt-1 h-11 w-full rounded-card border border-line bg-bg px-3.5 font-mono text-sm tabular-nums text-fg focus:border-fg"
                              aria-label="Max Tickets Per Student"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                            Description
                          </label>
                          <textarea
                            value={editDraft.description}
                            onChange={(input) =>
                              setEditDraft({ ...editDraft, description: input.target.value })
                            }
                            className="mt-1 min-h-20 w-full rounded-card border border-line bg-bg px-3.5 py-2.5 text-sm text-fg focus:border-fg"
                            aria-label="Description"
                          />
                        </div>

                        {/* Edit Event Tiers */}
                        <div className="border-t border-dashed border-line pt-4 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-fg">
                              Ticket Tiers ({editDraft.tiers.length}/10)
                            </span>
                            <button
                              type="button"
                              disabled={editDraft.tiers.length >= 10}
                              onClick={() => addDraftTier(setEditDraft)}
                              className="inline-flex h-8 items-center gap-1 rounded-card border border-fg bg-bg px-2.5 font-mono text-[10px] font-bold uppercase tracking-wider text-fg hover:bg-fg hover:text-bg disabled:opacity-40"
                            >
                              <Plus className="h-3 w-3" strokeWidth={1.75} />
                              Add Tier
                            </button>
                          </div>

                          {editDraft.tiers.map((tier, index) => {
                            const booked = tier.sold ?? 0;
                            return (
                              <div
                                key={tier.id ?? `new-${index}`}
                                className="grid gap-2.5 rounded-card border border-line bg-bg p-3 sm:grid-cols-12 sm:items-end"
                              >
                                <div className="sm:col-span-5">
                                  <label className="block font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                                    Tier Name
                                  </label>
                                  <input
                                    value={tier.name}
                                    onChange={(e) =>
                                      updateDraftTier(setEditDraft, index, { name: e.target.value })
                                    }
                                    className="mt-1 h-9 w-full rounded-card border border-line bg-surface px-3 text-sm text-fg"
                                  />
                                </div>
                                <div className="sm:col-span-3">
                                  <label className="block font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                                    Price (₹)
                                  </label>
                                  <input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={tier.price}
                                    onChange={(e) =>
                                      updateDraftTier(setEditDraft, index, {
                                        price: e.target.value,
                                      })
                                    }
                                    className="mt-1 h-9 w-full rounded-card border border-line bg-surface px-3 font-mono text-sm tabular-nums text-fg"
                                  />
                                </div>
                                <div className="sm:col-span-3">
                                  <label className="block font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                                    Seats {booked > 0 ? `(min ${booked})` : ""}
                                  </label>
                                  <input
                                    type="number"
                                    min={Math.max(1, booked)}
                                    max={10000}
                                    value={tier.capacity}
                                    onChange={(e) =>
                                      updateDraftTier(setEditDraft, index, {
                                        capacity: e.target.value,
                                      })
                                    }
                                    className="mt-1 h-9 w-full rounded-card border border-line bg-surface px-3 font-mono text-sm tabular-nums text-fg"
                                  />
                                </div>
                                <div className="flex justify-end sm:col-span-1">
                                  <button
                                    type="button"
                                    disabled={editDraft.tiers.length <= 1 || booked > 0}
                                    title={
                                      booked > 0
                                        ? `${booked} ticket(s) already booked in this tier`
                                        : "Remove tier"
                                    }
                                    onClick={() => removeDraftTier(setEditDraft, index)}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-card border border-line bg-surface text-muted hover:border-accent hover:text-accent disabled:opacity-35"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="flex flex-wrap gap-3 pt-2">
                          <button
                            type="button"
                            disabled={pending === event.id}
                            onClick={() => saveEdit(event.id)}
                            className="inline-flex h-10 items-center rounded-card border border-fg bg-accent px-5 font-mono text-xs font-bold uppercase tracking-wider text-accent-fg shadow-[3px_3px_0px_var(--fg)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60"
                          >
                            {pending === event.id ? "Saving…" : "Save Changes"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId("")}
                            className="inline-flex h-10 items-center rounded-card border border-line bg-bg px-5 font-mono text-xs font-bold uppercase tracking-wider text-fg hover:border-fg"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <TicketEventCard
                        event={event}
                        actions={
                          event.can_manage ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingId(event.id);
                                  setConfirmDeleteId("");
                                  const existingTiers =
                                    event.tiers && event.tiers.length > 0
                                      ? event.tiers.map((t) => ({
                                          id: t.id,
                                          name: t.name,
                                          price: t.price,
                                          capacity: String(t.capacity),
                                          sold: t.sold,
                                        }))
                                      : [
                                          {
                                            name: "General Admission",
                                            price: "0",
                                            capacity: String(event.capacity ?? 200),
                                            sold: event.sold_count ?? 0,
                                          },
                                        ];
                                  setEditDraft({
                                    title: event.title,
                                    venue: event.venue,
                                    venue_url: event.venue_url ?? "",
                                    image_url: event.image_url ?? "",
                                    max_tickets_per_user: String(event.max_tickets_per_user ?? 5),
                                    description: event.description ?? "",
                                    event_date: toLocalInput(event.event_date),
                                    tiers: existingTiers,
                                  });
                                }}
                                className="inline-flex h-10 items-center rounded-card border border-fg bg-surface px-4 font-mono text-xs font-bold uppercase tracking-wider text-fg shadow-[3px_3px_0px_var(--fg)] transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
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
                                className={`inline-flex h-10 items-center rounded-card border px-4 font-mono text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-60 ${
                                  confirmDeleteId === event.id
                                    ? "border-accent bg-accent text-accent-fg"
                                    : "border-line bg-surface text-muted hover:border-accent hover:text-accent"
                                }`}
                              >
                                {confirmDeleteId === event.id ? "Confirm Delete" : "Delete"}
                              </button>
                            </>
                          ) : null
                        }
                      />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Quick Manual Code Check Desk */}
          <form
            onSubmit={scan}
            className="border border-fg bg-surface p-6 rounded-card shadow-[4px_4px_0px_var(--fg)] md:p-8"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
              <div>
                <h2 className="font-display text-2xl font-bold tracking-tight text-fg">
                  Quick code verify
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Validate a pass code directly here, or use the camera gate scanner for high-speed
                  door entry.
                </p>
              </div>
              <Link
                href="/scan"
                className="inline-flex h-10 items-center gap-1.5 rounded-card border border-fg bg-bg px-4 font-mono text-xs font-bold uppercase tracking-wider text-fg hover:bg-fg hover:text-bg"
              >
                <ScanLine className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} />
                Camera Scanner
              </Link>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <input
                id="code"
                value={scanCode}
                onChange={(event) => setScanCode(event.target.value.toUpperCase())}
                placeholder="Enter pass code…"
                className="h-11 flex-1 rounded-card border border-line bg-bg px-4 font-mono text-sm uppercase tracking-widest text-fg placeholder:normal-case placeholder:tracking-normal placeholder:text-muted/60 focus:border-fg"
                required
                maxLength={64}
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={pending === "scan"}
                className="inline-flex h-11 items-center justify-center rounded-card border border-fg bg-accent px-6 font-mono text-xs font-bold uppercase tracking-wider text-accent-fg shadow-[3px_3px_0px_var(--fg)] transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60"
              >
                {pending === "scan" ? "Checking…" : "Validate"}
              </button>
            </div>

            {scanResult ? (
              <div
                role="status"
                className={`mt-4 flex items-center gap-2.5 rounded-card border px-4 py-3 font-mono text-xs font-bold ${
                  scanResult.already_scanned
                    ? "border-accent text-accent"
                    : "border-stamp text-stamp"
                }`}
              >
                {scanResult.already_scanned ? (
                  <ShieldAlert className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                ) : (
                  <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                )}
                <span>
                  {scanResult.ticket.title}
                  {scanResult.ticket.tier_name ? ` (${scanResult.ticket.tier_name})` : ""} ·{" "}
                  {scanResult.ticket.ticket_code} ·{" "}
                  {scanResult.already_scanned ? "ALREADY SCANNED" : "ADMITTED"}
                </span>
              </div>
            ) : null}
          </form>
        </div>
      ) : null}
    </section>
  );
}