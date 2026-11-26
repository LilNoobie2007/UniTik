"use client";

import type { ReactNode } from "react";
import { ArrowUpRight, MapPin, Ticket } from "lucide-react";

export type TicketTier = {
  id: string;
  name: string;
  price: string;
  capacity: number;
  sold: number;
  remaining: number;
  sort_order: number;
};

export type TicketEventCardEvent = {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  venue: string;
  venue_url?: string | null;
  image_url?: string | null;
  organizer_name: string;
  capacity?: number;
  sold_count?: number;
  remaining_seats?: number;
  max_tickets_per_user?: number;
  tiers?: TicketTier[];
};

export function formatTierPrice(price: string): string {
  const num = Number.parseFloat(price);
  if (Number.isNaN(num) || num <= 0) return "Free";
  return Number.isInteger(num) ? `₹${num}` : `₹${num.toFixed(2)}`;
}

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
  const tiers = event.tiers ?? [];
  const capacity = event.capacity ?? 0;
  const sold = event.sold_count ?? 0;
  const remaining =
    event.remaining_seats !== undefined ? event.remaining_seats : Math.max(0, capacity - sold);
  const perStudent = event.max_tickets_per_user ?? 5;
  const isSoldOut = capacity > 0 && remaining === 0;

  return (
    <article className="flex flex-col rounded-card border border-fg bg-surface shadow-[4px_4px_0px_var(--fg)] sm:flex-row">
      {/* Ink Date Spine */}
      <div className="flex items-center justify-between gap-3 bg-fg px-4 py-4 text-bg sm:w-28 sm:flex-col sm:justify-center sm:py-5 shrink-0">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] opacity-80">
          {when.month}
        </span>
        <span className="font-display text-4xl font-bold leading-none tracking-tight">
          {when.day}
        </span>
        <span className="font-mono text-[11px] tabular-nums text-accent">{when.time}</span>
      </div>

      {/* Main Event Body */}
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-4 p-5">
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
              Posted by {event.organizer_name}
            </p>
            {isSoldOut ? (
              <span className="border border-accent px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-accent">
                Sold Out
              </span>
            ) : null}
          </div>

          <h2 className="font-display text-2xl font-bold leading-snug tracking-tight text-fg">
            {event.title}
          </h2>

          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5">
              <MapPin aria-hidden="true" className="h-3.5 w-3.5 text-fg" strokeWidth={1.75} />
              {event.venue}
            </span>
            <span className="font-mono text-xs tabular-nums">{when.full}</span>
            {event.venue_url ? (
              <a
                href={event.venue_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-accent underline underline-offset-4"
              >
                Venue map
                <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.75} />
              </a>
            ) : null}
          </p>

          {event.description ? (
            <p className="max-w-xl text-sm leading-relaxed text-muted">{event.description}</p>
          ) : null}

          {tiers.length > 0 ? (
            <ul className="flex flex-wrap gap-2 pt-1">
              {tiers.map((tier) => (
                <li
                  key={tier.id}
                  className="inline-flex items-center gap-2 rounded-card border border-line bg-bg px-2.5 py-1 font-mono text-[11px]"
                >
                  <span className="font-semibold text-fg">{tier.name}</span>
                  <span className="text-accent font-bold tabular-nums">
                    {formatTierPrice(tier.price)}
                  </span>
                  <span className="text-muted tabular-nums">
                    {tier.remaining}/{tier.capacity} left
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {actions ? <div className="flex flex-wrap gap-2 pt-1">{actions}</div> : null}
      </div>

      {/* Perforated Right Seat Stub */}
      <div className="relative flex items-center justify-between gap-4 border-t border-dashed border-line bg-bg px-5 py-4 sm:w-44 sm:flex-col sm:justify-between sm:border-t-0 sm:border-l shrink-0">
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
            Seats Left
          </p>
          <p className="mt-1 inline-flex items-center gap-1.5 font-mono text-lg font-bold tabular-nums text-fg sm:justify-center">
            <Ticket aria-hidden="true" className="h-4 w-4 text-accent" strokeWidth={1.75} />
            {capacity > 0 ? `${remaining} / ${capacity}` : "—"}
          </p>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted tabular-nums">
            {sold} booked
          </p>
        </div>

        <p className="font-mono text-[11px] font-semibold tabular-nums text-fg">
          Max {perStudent} / student
        </p>
      </div>
    </article>
  );
}