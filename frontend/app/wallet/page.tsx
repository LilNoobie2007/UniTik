"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
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

export default function WalletPage() {
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [tickets, setTickets] = useState<Pass[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "signed-out" | "error">("loading");
  const [error, setError] = useState("");
  const [bookingId, setBookingId] = useState("");

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

  // Count how many tickets the student currently holds per event
  const heldCounts = tickets.reduce((acc, t) => {
    acc[t.event_id] = (acc[t.event_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <section className="mx-auto max-w-6xl px-5 py-16 md:py-24">
      <p className="text-xs font-medium uppercase tracking-widest text-muted">Student wallet</p>

      {status === "loading" ? (
        <h1 className="mt-4 font-display text-5xl leading-tight text-fg">Checking this browser…</h1>
      ) : null}

      {status === "signed-out" ? (
        <div className="mt-4 max-w-xl">
          <h1 className="font-display text-5xl leading-tight text-fg">Sign in to hold a ticket.</h1>
          <p className="mt-5 text-base leading-normal text-muted">
            Booking uses your session. The page never keeps a user id of its own.
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
          <h1 className="font-display text-5xl leading-tight text-fg">The wallet didn't load.</h1>
          <p role="alert" className="mt-5 text-base leading-normal text-muted">
            {error}
          </p>
        </div>
      ) : null}

      {status === "ready" && user !== null && user.role !== "student" ? (
        <div className="mt-4 max-w-xl">
          <h1 className="font-display text-5xl leading-tight text-fg">Planners don't book from here.</h1>
          <p className="mt-5 text-base leading-normal text-muted">
            Event planners publish, edit, and scan. Students are the only ones who hold tickets.
          </p>
          <Link
            href="/events"
            className="mt-8 inline-flex h-12 items-center rounded-full bg-accent px-6 text-accent-fg"
          >
            Open the events desk
          </Link>
        </div>
      ) : null}

      {status === "ready" && user?.role === "student" ? (
        <div className="mt-4">
          <h1 className="font-display text-5xl leading-tight text-fg">Your tickets.</h1>
          <p className="mt-5 max-w-xl text-base leading-normal text-muted">
            View what's on, book your seats, and scan your QR code at the door.
          </p>
          {error !== "" ? (
            <p role="alert" className="mt-5 text-sm text-fg">
              {error}
            </p>
          ) : null}

          <div className="mt-12">
            <h2 className="font-display text-3xl text-fg">In your pocket</h2>
            {tickets.length === 0 ? (
              <p className="mt-4 text-base text-muted">No passes yet. Book an event below.</p>
            ) : (
              <ul className="mt-6 grid gap-6 md:grid-cols-2">
                {tickets.map((ticket) => (
                  <li key={ticket.ticket_code} className="rounded-card border border-line bg-surface p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-xs font-medium uppercase tracking-widest text-muted">Admit one pass</p>
                        <p className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ticket.is_scanned ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                          {ticket.is_scanned ? "Scanned (Expired)" : "Valid · Not scanned"}
                        </p>
                      </div>
                      <h3 className="mt-4 font-display text-2xl leading-tight text-fg">{ticket.title}</h3>
                      <p className="mt-1 text-sm text-muted">
                        {ticket.venue} · {formatWhen(ticket.event_date)}
                      </p>
                    </div>

                    <div className="my-5 flex flex-col items-center justify-center bg-bg p-4 rounded-2xl border border-line">
                      <QRCodeCanvas
                        value={ticket.ticket_code}
                        size={140}
                        level={"H"}
                        includeMargin={true}
                        imageSettings={{
                          src: "/logo1.png",
                          height: 32,
                          width: 32,
                          excavate: true,
                        }}
                      />
                      <p className="mt-3 text-xs uppercase tracking-widest text-muted">Secure Pass Code</p>
                      <p className="text-sm font-mono tracking-widest text-fg mt-0.5">{ticket.ticket_code}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-14">
            <h2 className="font-display text-3xl text-fg">On campus</h2>
            {events.length === 0 ? (
              <p className="mt-4 text-base text-muted">No events posted yet.</p>
            ) : (
              <ul className="mt-6 grid gap-4">
                {events.map((event) => {
                  const heldCount = heldCounts[event.id] || 0;
                  const maxLimit = event.max_tickets_per_user ?? 5;
                  const limitReached = heldCount >= maxLimit;

                  return (
                    <li
                      key={event.id}
                      className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <h3 className="font-display text-2xl text-fg">{event.title}</h3>
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
                        <p className="mt-2 text-xs text-muted">
                          Posted by {event.organizer_name} · Held: {heldCount} / {maxLimit} max per student
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={limitReached || bookingId === event.id}
                        onClick={() => book(event.id)}
                        className="h-11 shrink-0 rounded-full bg-accent px-5 text-accent-fg disabled:opacity-60"
                      >
                        {limitReached ? "Limit Reached" : bookingId === event.id ? "Booking…" : "Book Seat"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}