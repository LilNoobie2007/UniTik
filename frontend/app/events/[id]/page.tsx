"use client";

/*
 * File: frontend/app/events/[id]/page.tsx
 * UNITIK CORE ARCHITECTURE MANDATE
 * - Frontend: Next.js / BFF
 * - Backend: PHP 8+ (PDO/PostgreSQL)
 * - DO NOT use client-side database calls.
 * - DO NOT trust client inputs. Always sanitize.
 * - Preserve existing logic during modifications.
 *
 * Detail view. The server counts the visit. This page does not send a view total.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { BookingPanel, type CampusEvent } from "../../components/BookingPanel";

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;
  const [event, setEvent] = useState<CampusEvent | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;
    let ignore = false;
    api<CampusEvent>(`/modules/events/show.php?event_id=${eventId}`)
      .then((row) => {
        if (!ignore) setEvent(row);
      })
      .catch((err: unknown) => {
        if (!ignore) setError(err instanceof Error ? err.message : "Could not open the event.");
      });
    return () => {
      ignore = true;
    };
  }, [eventId]);

  return (
    <main className="page">
      <p className="kicker">Event</p>
      <p className="meta">
        <Link href="/">Back to campus events</Link>
      </p>
      {error && <p className="error">{error}</p>}
      {!event && !error && <p className="meta">Opening the event…</p>}
      {event && (
        <div className="grid">
          <article className="panel">
            <span className="badge">{event.category_tags ?? "General"}</span>
            <h1>{event.title}</h1>
            <p className="lede">{event.description}</p>
            <p className="meta">{event.venue_name} · {event.location_details}</p>
            <p className="meta">{new Date(event.event_date).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</p>
            <p className="meta">
              {event.organizer_name}
              {event.committee_name ? ` · ${event.committee_name}` : ""}
            </p>
            <p className="meta">{event.page_views ?? 0} views</p>
          </article>
          <BookingPanel event={event} onBooked={() => undefined} />
        </div>
      )}
    </main>
  );
}
