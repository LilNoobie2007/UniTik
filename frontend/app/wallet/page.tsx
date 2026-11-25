"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Expand,
  MapPin,
  ShieldAlert,
  Ticket,
  X,
} from "lucide-react";
import { ApiError, api, type AuthResponse, type User } from "../../lib/api";

type CampusEvent = {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  venue: string;
  venue_url?: string | null;
  image_url?: string | null;
  max_tickets_per_user?: number;
  organizer_name: string;
  can_manage: boolean;
};

type Pass = {
  event_id: string;
  title: string;
  description: string | null;
  event_date: string;
  venue: string;
  ticket_code: string;
  is_scanned: boolean;
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

function getDateSpine(value: string): { month: string; day: string; time: string } {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { month: "TBA", day: "--", time: "TBA" };
  }
  return {
    month: date.toLocaleDateString(undefined, { month: "short" }).toUpperCase(),
    day: date.toLocaleDateString(undefined, { day: "2-digit" }),
    time: date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
  };
}

export default function WalletPage() {
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [tickets, setTickets] = useState<Pass[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "signed-out" | "error">("loading");
  const [error, setError] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [activePass, setActivePass] = useState<Pass | null>(null);

  useEffect(() => {
    document.title = "Wallet · UniTik";
    let cancelled = false;

    api<AuthResponse>("/me.php")
      .then(async (me) => {
        if (cancelled) return;
        setUser(me.user);
        if (me.user.role !== "student") {
          setStatus("ready");
          return;
        }
        const [eventRes, ticketRes] = await Promise.all([
          api<{ ok: true; events: CampusEvent[] }>("/events/list.php"),
          api<{ ok: true; tickets: Pass[] }>("/tickets/mine.php"),
        ]);
        if (cancelled) return;
        setEvents(eventRes.events);
        setTickets(ticketRes.tickets);
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

  async function book(eventId: string) {
    setBookingId(eventId);
    setError("");
    try {
      const data = await api<{ ok: true; ticket: Pass }>("/tickets/book.php", {
        method: "POST",
        body: JSON.stringify({ event_id: eventId }),
      });
      setTickets((current) => [...current, data.ticket]);
    } catch (err) {
      setError(failureMessage(err));
    } finally {
      setBookingId("");
    }
  }

  const heldCounts = tickets.reduce((acc, t) => {
    acc[t.event_id] = (acc[t.event_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const validCount = tickets.filter((t) => !t.is_scanned).length;
  const scannedCount = tickets.length - validCount;

  return (
    <section className="mx-auto max-w-6xl px-5 py-12 md:py-20">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
        Student Wallet
      </p>

      {status === "loading" ? (
        <div className="mt-6 border-t border-line pt-8">
          <h1 className="font-display text-4xl font-bold tracking-tight text-fg md:text-5xl">
            Checking this browser…
          </h1>
          <p className="mt-3 font-mono text-xs uppercase tracking-wider text-muted">
            Syncing session &amp; active campus passes
          </p>
        </div>
      ) : null}

      {status === "signed-out" ? (
        <div className="mt-6 max-w-xl border border-fg bg-surface p-8 rounded-card shadow-[4px_4px_0px_var(--fg)]">
          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-fg">
            Sign in to hold a ticket.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted">
            Booking uses your campus session. This wallet never stores a user id locally.
          </p>
          <Link
            href="/login"
            className="mt-7 inline-flex h-11 items-center gap-2 rounded-card border border-fg bg-accent px-6 font-mono text-xs font-bold uppercase tracking-wider text-accent-fg shadow-[3px_3px_0px_var(--fg)] transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
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
            The wallet didn&apos;t load.
          </h1>
          <p role="alert" className="mt-3 text-sm leading-relaxed text-muted">
            {error}
          </p>
        </div>
      ) : null}

      {status === "ready" && user !== null && user.role !== "student" ? (
        <div className="mt-6 max-w-xl border border-fg bg-surface p-8 rounded-card shadow-[4px_4px_0px_var(--fg)]">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
            Role · {user.role}
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold leading-tight tracking-tight text-fg">
            Planners don&apos;t book from here.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted">
            Event planners publish, edit, and scan passes. Student accounts are the ones that hold tickets.
          </p>
          <Link
            href="/events"
            className="mt-7 inline-flex h-11 items-center gap-2 rounded-card border border-fg bg-accent px-6 font-mono text-xs font-bold uppercase tracking-wider text-accent-fg shadow-[3px_3px_0px_var(--fg)] transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            Open the events desk
            <ArrowUpRight className="h-4 w-4" strokeWidth={1.75} />
          </Link>
        </div>
      ) : null}

      {status === "ready" && user?.role === "student" ? (
        <div className="mt-4 space-y-14">
          {/* Editorial Header + Monospace KPI Strip */}
          <div className="flex flex-col gap-8 border-b border-line pb-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="font-display text-4xl font-bold leading-none tracking-tight text-fg md:text-5xl">
                Your tickets.
              </h1>
              <p className="mt-3 max-w-xl text-base leading-relaxed text-muted">
                Reserve seats for campus events and present your tear-off QR stub at the gate.
              </p>
            </div>

            <div className="grid grid-cols-3 divide-x divide-line border border-line bg-surface rounded-card">
              <div className="px-4 py-3 sm:px-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                  Valid Passes
                </p>
                <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-fg">
                  {validCount}
                </p>
              </div>
              <div className="px-4 py-3 sm:px-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                  Checked In
                </p>
                <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-fg">
                  {scannedCount}
                </p>
              </div>
              <div className="px-4 py-3 sm:px-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                  On Campus
                </p>
                <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-fg">
                  {events.length}
                </p>
              </div>
            </div>
          </div>

          {error !== "" ? (
            <div
              role="alert"
              className="flex items-start gap-3 border border-accent bg-surface px-4 py-3 rounded-card text-sm text-fg"
            >
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={1.75} />
              <span>{error}</span>
            </div>
          ) : null}

          {/* Section 1: Booked Passes */}
          <div>
            <div className="flex items-baseline justify-between border-b border-line pb-3">
              <h2 className="font-display text-2xl font-bold tracking-tight text-fg md:text-3xl">
                In your pocket
              </h2>
              <span className="font-mono text-xs uppercase tracking-widest text-muted tabular-nums">
                {tickets.length} {tickets.length === 1 ? "Pass" : "Passes"}
              </span>
            </div>

            {tickets.length === 0 ? (
              <div className="mt-6 flex items-center gap-3 border border-dashed border-line bg-surface p-8 rounded-card text-muted">
                <Ticket className="h-5 w-5 shrink-0 text-fg" strokeWidth={1.75} />
                <p className="text-sm">No passes yet. Book an upcoming campus event below.</p>
              </div>
            ) : (
              <ul className="mt-6 grid gap-6 md:grid-cols-2">
                {tickets.map((ticket) => (
                  <li
                    key={ticket.ticket_code}
                    className={`flex flex-col justify-between border border-fg bg-surface rounded-card shadow-[4px_4px_0px_var(--fg)] ${
                      ticket.is_scanned ? "opacity-80" : ""
                    }`}
                  >
                    {/* Upper Pass Info */}
                    <div className="p-6">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                          Admit One · UniTik
                        </span>
                        {ticket.is_scanned ? (
                          <span className="inline-flex items-center gap-1.5 border border-accent px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-accent">
                            <ShieldAlert className="h-3.5 w-3.5" strokeWidth={1.75} />
                            Checked In
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 border border-stamp px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-stamp">
                            <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                            Confirmed
                          </span>
                        )}
                      </div>

                      <h3 className="mt-4 font-display text-2xl font-bold leading-snug tracking-tight text-fg">
                        {ticket.title}
                      </h3>

                      <div className="mt-3 space-y-1.5 text-xs text-muted">
                        <p className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-fg" strokeWidth={1.75} />
                          <span>{ticket.venue}</span>
                        </p>
                        <p className="flex items-center gap-2 font-mono tabular-nums">
                          <Clock className="h-3.5 w-3.5 shrink-0 text-fg" strokeWidth={1.75} />
                          <span>{formatWhen(ticket.event_date)}</span>
                        </p>
                      </div>
                    </div>

                    {/* Perforated Tear Line with Side Notches */}
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

                    {/* Lower QR Stub — Always Pure White Quiet Zone for Scanners */}
                    <div className="flex flex-col items-center justify-between gap-5 p-6 sm:flex-row">
                      <div className="rounded-sm border border-[#111111] bg-white p-3">
                        <QRCodeCanvas
                          value={ticket.ticket_code}
                          size={128}
                          level="H"
                          includeMargin={true}
                          bgColor="#ffffff"
                          fgColor="#111111"
                          imageSettings={{
                            src: "/logo1.png",
                            height: 28,
                            width: 28,
                            excavate: true,
                          }}
                        />
                      </div>

                      <div className="flex flex-1 flex-col items-center text-center sm:items-start sm:text-left">
                        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                          Pass Code
                        </p>
                        <p className="mt-1 break-all font-mono text-base font-bold tracking-[0.16em] text-fg tabular-nums">
                          {ticket.ticket_code}
                        </p>
                        <p className="mt-2 text-xs text-muted">
                          {ticket.is_scanned
                            ? "This pass has already been redeemed at the door."
                            : "Present this code at the venue gate for entry."}
                        </p>

                        <button
                          type="button"
                          onClick={() => setActivePass(ticket)}
                          className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-card border border-fg bg-bg px-3.5 font-mono text-[11px] font-bold uppercase tracking-wider text-fg transition-colors hover:bg-fg hover:text-bg"
                        >
                          <Expand className="h-3.5 w-3.5" strokeWidth={1.75} />
                          Gate View
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Section 2: Available Campus Events */}
          <div>
            <div className="flex items-baseline justify-between border-b border-line pb-3">
              <h2 className="font-display text-2xl font-bold tracking-tight text-fg md:text-3xl">
                On campus
              </h2>
              <span className="font-mono text-xs uppercase tracking-widest text-muted tabular-nums">
                {events.length} {events.length === 1 ? "Event" : "Events"}
              </span>
            </div>

            {events.length === 0 ? (
              <div className="mt-6 border border-dashed border-line bg-surface p-8 rounded-card text-sm text-muted">
                No events posted yet.
              </div>
            ) : (
              <ul className="mt-6 grid gap-5">
                {events.map((event) => {
                  const heldCount = heldCounts[event.id] || 0;
                  const maxLimit = event.max_tickets_per_user ?? 5;
                  const limitReached = heldCount >= maxLimit;
                  const spine = getDateSpine(event.event_date);

                  return (
                    <li
                      key={event.id}
                      className="flex flex-col border border-fg bg-surface rounded-card shadow-[4px_4px_0px_var(--fg)] sm:flex-row"
                    >
                      {/* Ink Date Spine */}
                      <div className="flex items-center justify-between bg-fg px-5 py-3 text-bg sm:w-28 sm:flex-col sm:justify-center sm:py-6 shrink-0">
                        <span className="font-mono text-[11px] uppercase tracking-[0.2em] opacity-75">
                          {spine.month}
                        </span>
                        <span className="font-display text-3xl font-bold leading-none tracking-tight sm:my-1 sm:text-4xl">
                          {spine.day}
                        </span>
                        <span className="font-mono text-[11px] text-accent">
                          {spine.time}
                        </span>
                      </div>

                      {/* Event Body */}
                      <div className="flex flex-1 flex-col justify-between gap-3 p-5 sm:p-6">
                        <div>
                          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
                            Hosted by {event.organizer_name}
                          </p>
                          <h3 className="mt-1.5 font-display text-2xl font-bold leading-snug tracking-tight text-fg">
                            {event.title}
                          </h3>

                          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 text-fg" strokeWidth={1.75} />
                              {event.venue}
                            </span>
                            <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
                              <Clock className="h-3.5 w-3.5 text-fg" strokeWidth={1.75} />
                              {formatWhen(event.event_date)}
                            </span>
                            {event.venue_url ? (
                              <a
                                href={event.venue_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-accent underline underline-offset-4"
                              >
                                Venue Map
                                <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.75} />
                              </a>
                            ) : null}
                          </div>

                          {event.description ? (
                            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
                              {event.description}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      {/* Perforated Action Stub */}
                      <div className="relative flex items-center justify-between gap-4 border-t border-dashed border-line p-5 sm:w-48 sm:flex-col sm:justify-center sm:border-t-0 sm:border-l sm:p-6 shrink-0">
                        <span
                          aria-hidden="true"
                          className="hidden sm:block absolute -top-[1px] -left-2.5 h-2.5 w-5 rounded-b-full border-x border-b border-fg bg-bg"
                        />
                        <span
                          aria-hidden="true"
                          className="hidden sm:block absolute -bottom-[1px] -left-2.5 h-2.5 w-5 rounded-t-full border-x border-t border-fg bg-bg"
                        />

                        <div className="text-left sm:text-center">
                          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                            Your Quota
                          </p>
                          <p className="mt-0.5 font-mono text-sm font-bold tabular-nums text-fg">
                            {heldCount} / {maxLimit} HELD
                          </p>
                        </div>

                        <button
                          type="button"
                          disabled={limitReached || bookingId === event.id}
                          onClick={() => book(event.id)}
                          className={`inline-flex h-11 items-center justify-center gap-1.5 rounded-card border border-fg px-5 font-mono text-xs font-bold uppercase tracking-wider transition-transform sm:w-full ${
                            limitReached
                              ? "bg-bg text-muted opacity-60 cursor-not-allowed"
                              : "bg-accent text-accent-fg shadow-[3px_3px_0px_var(--fg)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60"
                          }`}
                        >
                          <Ticket className="h-3.5 w-3.5" strokeWidth={1.75} />
                          {limitReached
                            ? "Limit Reached"
                            : bookingId === event.id
                              ? "Booking…"
                              : "Book Seat"}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      {/* Fullscreen High-Contrast Gate QR Modal */}
      {activePass !== null ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Gate QR Pass"
          onClick={() => setActivePass(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm border-2 border-fg bg-surface p-6 rounded-card shadow-[6px_6px_0px_var(--fg)]"
          >
            <button
              type="button"
              onClick={() => setActivePass(null)}
              aria-label="Close gate view"
              className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center border border-line text-fg hover:border-fg"
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>

            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
              Gate Presentation · UniTik
            </p>
            <h3 className="mt-1.5 pr-8 font-display text-2xl font-bold leading-tight text-fg">
              {activePass.title}
            </h3>
            <p className="mt-1 font-mono text-xs text-muted">
              {activePass.venue} · {formatWhen(activePass.event_date)}
            </p>

            <div className="mt-5 flex flex-col items-center border border-[#111111] bg-white p-5 rounded-sm">
              <QRCodeCanvas
                value={activePass.ticket_code}
                size={220}
                level="H"
                includeMargin={true}
                bgColor="#ffffff"
                fgColor="#111111"
                imageSettings={{
                  src: "/logo1.png",
                  height: 44,
                  width: 44,
                  excavate: true,
                }}
              />
              <p className="mt-3 font-mono text-base font-bold tracking-[0.2em] text-[#111111] tabular-nums">
                {activePass.ticket_code}
              </p>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-dashed border-line pt-4">
              {activePass.is_scanned ? (
                <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-accent">
                  <ShieldAlert className="h-4 w-4" strokeWidth={1.75} />
                  Already Scanned
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-stamp">
                  <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />
                  Valid Entry Pass
                </span>
              )}

              <button
                type="button"
                onClick={() => setActivePass(null)}
                className="border border-fg bg-bg px-3.5 py-1.5 font-mono text-xs font-bold uppercase tracking-wider text-fg hover:bg-fg hover:text-bg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}