"use client";

/*
 * File: frontend/app/page.tsx
 * UNITIK CORE ARCHITECTURE MANDATE
 * - Frontend: Next.js / BFF
 * - Backend: PHP 8+ (PDO/PostgreSQL)
 * - DO NOT use client-side database calls.
 * - DO NOT trust client inputs. Always sanitize.
 * - Preserve existing logic during modifications.
 *
 * Student dashboard. Events are public. The wallet uses the session.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { BookingPanel, type CampusEvent } from "./components/BookingPanel";
import { TicketQr } from "./components/TicketQr";

type TicketRow = {
  id: string;
  ticket_hash: string;
  scan_status: boolean;
  title: string;
  event_date: string;
  venue_name: string;
  location_details: string;
  ticket_price: string;
  category_tags: string | null;
};

type Profile = { full_name: string; role: string };

export default function StudentDashboard() {
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [tickets, setTickets] = useState<TicketRow[] | null>(null);
  const [selected, setSelected] = useState<CampusEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const loadEvents = useCallback(async () => {
    const rows = await api<CampusEvent[]>("/modules/events/list.php");
    setEvents(rows);
  }, []);

  const loadTickets = useCallback(async () => {
    try {
      const rows = await api<TicketRow[]>("/modules/ticketing/mine.php");
      setTickets(rows);
    } catch {
      setTickets(null);
    }
  }, []);

  useEffect(() => {
    void api<Profile>("/modules/auth/me.php")
      .then(setProfile)
      .catch(() => setProfile(null));
    void loadEvents().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Could not load events.");
    });
    void loadTickets();
  }, [loadEvents, loadTickets]);

  return (
    <main className="page">
      <p className="kicker">Student dashboard</p>
      <h1>{profile ? `Hello, ${profile.full_name}` : "Campus events"}</h1>
      <p className="lede">
        Book from the published list. Your ticket is tied to the signed-in account, not an id typed into the page.
      </p>
      {error && <p className="error">{error}</p>}

      <div className="grid" id="events">
        <section className="stack">
          {events.length === 0 && <p className="meta">No published events.</p>}
          {events.map((event) => {
            const remaining = Math.max(0, Number(event.max_capacity) - Number(event.tickets_sold));
            const price = Number(event.ticket_price) > 0 ? `₹${Number(event.ticket_price)}` : "Free";
            return (
              <article key={event.id} className="card">
                <span className="badge">{event.category_tags ?? "General"}</span>
                <h3>{event.title}</h3>
                <p className="meta">{event.description}</p>
                <p className="meta">{event.venue_name} · {remaining} left · {event.page_views ?? 0} views</p>
                <div className="row">
                  <span className="price">{price}</span>
                  <Link className="btn" href={`/events/${event.id}`}>
                    Details
                  </Link>
                  <button className="btn secondary" type="button" onClick={() => setSelected(event)}>
                    Book
                  </button>
                </div>
              </article>
            );
          })}
        </section>
        <BookingPanel
          event={selected}
          onBooked={() => {
            void loadEvents();
            void loadTickets();
          }}
        />
      </div>

      <section id="wallet" style={{ marginTop: 36 }}>
        <h2>My tickets</h2>
        {tickets === null && <p className="meta">Sign in to see tickets issued to you.</p>}
        {tickets && tickets.length === 0 && <p className="meta">No tickets yet.</p>}
        <div className="stack">
          {tickets?.map((ticket) => (
            <article key={ticket.id} className="ticket">
              <span className="badge">{ticket.scan_status ? "Used" : "Live"}</span>
              <h3>{ticket.title}</h3>
              <p className="meta">{ticket.venue_name} · {ticket.location_details}</p>
              <p className="meta">{new Date(ticket.event_date).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</p>
              <TicketQr payload={`UNITIK:${ticket.ticket_hash}`} />
              <p className="hash">UNITIK:{ticket.ticket_hash}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
