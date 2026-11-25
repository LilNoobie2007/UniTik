"use client";

import type { ReactNode } from "react";
import { ArrowUpRight, MapPin, Ticket } from "lucide-react";

export type TicketEventCardEvent = {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  venue: string;
  venue_url?: string | null;
  organizer_name: string;
  capacity?: number;
  max_tickets_per_user?: number;
};

function splitWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { day: "--", month: "DATE", time: value, full: value };
  }
  return {
    day: date.toLocaleDateString(undefined, { day: "2-digit" }),
    month: date.toLocaleDateString(undefined, { month: "short" }).toUpperCase(),
    time: date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
    full: date.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
  };
}

export function TicketEventCard({
  event,
  actions,
}: {
  event: TicketEventCardEvent;
  actions?: ReactNode;
}) {
  const when = splitWhen(event.event_date);
  const capacity = event.capacity ?? 0;
  const perStudent = event.max_tickets_per_user ?? 0;

  return (
    <article className="flex flex-col rounded-lg border border-fg bg-surface shadow-[3px_3px_0px_#111111] sm:flex-row">
      <div className="flex items-center justify-between gap-3 bg-fg px-4 py-4 text-bg sm:w-28 sm:flex-col sm:justify-center sm:py-5">
        <span className="font-mono text-[11px] tracking-[0.18em]">{when.month}</span>
        <span className="font-display text-4xl leading-none tracking-tight">{when.day}</span>
        <span className="font-mono text-[11px] tabular-nums text-accent">{when.time}</span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-4 p-5">
        <div className="space-y-2">
          <h2 className="font-display text-2xl leading-snug tracking-tight text-fg">{event.title}</h2>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5">
              <MapPin aria-hidden="true" className="h-3.5 w-3.5 text-fg" strokeWidth={1.75} />
              {event.venue}
            </span>
            <span className="font-mono text-xs tabular-nums">{when.full}</span>
          </p>
          {event.venue_url ? (
            <a
              href={event.venue_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-fg"
            >
              Venue map
              <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.75} />
            </a>
          ) : null}
          {event.description ? (
            <p className="max-w-xl text-base leading-normal text-muted">{event.description}</p>
          ) : null}
          <p className="text-sm text-muted">Posted by {event.organizer_name}</p>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>

      <div className="relative flex items-center justify-between gap-4 border-t border-dashed border-fg/30 bg-bg px-5 py-4 sm:w-40 sm:flex-col sm:justify-between sm:border-t-0 sm:border-l">
        <span className="pointer-events-none absolute -left-2.5 -top-2.5 hidden h-5 w-5 rounded-full bg-bg sm:block" />
        <span className="pointer-events-none absolute -bottom-2.5 -left-2.5 hidden h-5 w-5 rounded-full bg-bg sm:block" />
        <div className="text-left sm:text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Admit one</p>
          <p className="mt-1 inline-flex items-center gap-1.5 font-mono text-lg font-semibold tabular-nums text-fg sm:justify-center">
            <Ticket aria-hidden="true" className="h-4 w-4" strokeWidth={1.75} />
            {capacity > 0 ? capacity : "—"}
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Seats</p>
        </div>
          <p className="font-mono text-[11px] tabular-nums text-fg">
            Max {perStudent > 0 ? perStudent : "—"} / student
          </p>
      </div>
    </article>
  );
}
