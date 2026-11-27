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
  ShieldCheck,
  Ticket,
  X,
} from "lucide-react";
import {
  formatTierPrice,
  type TicketTier,
} from "../../components/TicketEventCard";
import { ApiError, api } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";

type CampusEvent = {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  venue: string;
  venue_url?: string | null;
  image_url?: string | null;
  capacity?: number;
  sold_count?: number;
  remaining_seats?: number;
  max_tickets_per_user?: number;
  organizer_name: string;
  can_manage: boolean;
  tiers?: TicketTier[];
};

type Pass = {
  event_id: string;
  title: string;
  description: string | null;
  event_date: string;
  venue: string;
  ticket_code: string;
  qr_token?: string;
  is_scanned: boolean;
  tier_id?: string | null;
  tier_name?: string;
  tier_price?: string;
  issued_at?: string | null;
};

type BookResponse = {
  ok: true;
  ticket: Pass;
  tier?: {
    id: string;
    name: string;
    price: string;
    capacity: number;
    sold: number;
    remaining: number;
  };
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

function defaultTierId(event: CampusEvent): string {
  const tiers = event.tiers ?? [];
  const available = tiers.find((t) => t.remaining > 0);
  return available?.id ?? tiers[0]?.id ?? "";
}

export default function WalletPage() {
  const { user, status: authStatus, error: authError } = useAuth();
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [tickets, setTickets] = useState<Pass[]>([]);
  const [selectedTiers, setSelectedTiers] = useState<Record<string, string>>({});
  const [dataLoading, setDataLoading] = useState(false);
  const [pageError, setPageError] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [activePass, setActivePass] = useState<Pass | null>(null);

  useEffect(() => {
    document.title = "Wallet · UniTik";
  }, []);

  useEffect(() => {
    if (authStatus !== "authenticated" || user?.role !== "student") return;

    let cancelled = false;
    setDataLoading(true);
    setPageError("");

    Promise.all([
      api<{ ok: true; events: CampusEvent[] }>("/events/list.php"),
      api<{ ok: true; tickets: Pass[] }>("/tickets/mine.php"),
    ])
      .then(([eventRes, ticketRes]) => {
        if (cancelled) return;
        setEvents(eventRes.events);
        setTickets(ticketRes.tickets);
        setSelectedTiers((prev) => {
          const next: Record<string, string> = { ...prev };
          for (const ev of eventRes.events) {
            if (!next[ev.id]) {
              next[ev.id] = defaultTierId(ev);
            }
          }
          return next;
        });
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
  }, [authStatus, user?.role]);

  async function book(eventId: string, tierId: string) {
    setBookingId(eventId);
    setPageError("");
    try {
      const data = await api<BookResponse>("/tickets/book.php", {
        method: "POST",
        body: JSON.stringify({
          event_id: eventId,
          ...(tierId !== "" ? { tier_id: tierId } : {}),
        }),
      });
      setTickets((current) => [data.ticket, ...current]);

      if (data.tier) {
        const updatedTier = data.tier;
        setEvents((current) =>
          current.map((ev) => {
            if (ev.id !== eventId) return ev;
            const nextTiers = (ev.tiers ?? []).map((t) =>
              t.id === updatedTier.id
                ? { ...t, sold: updatedTier.sold, remaining: updatedTier.remaining }
                : t
            );
            const totalCap = nextTiers.reduce((sum, t) => sum + t.capacity, 0);
            const totalSold = nextTiers.reduce((sum, t) => sum + t.sold, 0);
            return {
              ...ev,
              tiers: nextTiers,
              capacity: totalCap || ev.capacity,
              sold_count: totalSold,
              remaining_seats: Math.max(0, totalCap - totalSold),
            };
          })
        );
      }
    } catch (err) {
      setPageError(failureMessage(err));
      if (err instanceof ApiError && err.status === 409) {
        api<{ ok: true; events: CampusEvent[] }>("/events/list.php")
          .then((res) => setEvents(res.events))
          .catch(() => {});
      }
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
  const isLoading =
    authStatus === "loading" ||
    (authStatus === "authenticated" && user?.role === "student" && dataLoading);

  return (
    <section className="mx-auto max-w-6xl px-5 py-12 md:py-20">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Student Wallet</p>

      {isLoading ? (
        <div className="mt-6 border-t border-line pt-8">
          <h1 className="font-display text-4xl font-bold tracking-tight text-fg md:text-5xl">
            Checking this browser…
          </h1>
          <p className="mt-3 font-mono text-xs uppercase tracking-wider text-muted">
            Syncing session &amp; active campus passes
          </p>
        </div>
      ) : null}

      {authStatus === "signed-out" ? (
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

      {authStatus === "error" ? (
        <div className="mt-6 max-w-xl border border-accent bg-surface p-8 rounded-card">
          <div className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-accent">
            <ShieldAlert className="h-4 w-4" strokeWidth={1.75} />
            Connection Error
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-fg">
            The wallet didn&apos;t load.
          </h1>
          <p role="alert" className="mt-3 text-sm leading-relaxed text-muted">
            {authError}
          </p>
        </div>
      ) : null}

      {authStatus === "authenticated" && user !== null && user.role !== "student" ? (
        <div className="mt-6 max-w-xl border border-fg bg-surface p-8 rounded-card shadow-[4px_4px_0px_var(--fg)]">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
            Role · {user.role}
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold leading-tight tracking-tight text-fg">
            Planners don&apos;t book from here.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted">
            Event planners publish, edit, and scan passes. Student accounts are the ones that hold
            tickets.
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

      {!isLoading && authStatus === "authenticated" && user?.role === "student" ? (
        <div className="mt-4 space-y-14">
          {/* Editorial Header + Monospace KPI Strip */}
          <div className="flex flex-col gap-8 border-b border-line pb-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="font-display text-4xl font-bold leading-none tracking-tight text-fg md:text-5xl">
                Your tickets.
              </h1>
              <p className="mt-3 max-w-xl text-base leading-relaxed text-muted">
                Reserve a seat tier for campus events and present your cryptographically signed QR
                stub at the gate.
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

          {pageError !== "" ? (
            <div
              role="alert"
              className="flex items-start gap-3 border border-accent bg-surface px-4 py-3 rounded-card text-sm text-fg"
            >
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={1.75} />
              <span>{pageError}</span>
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
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                          {ticket.tier_name ?? "General Admission"} ·{" "}
                          {formatTierPrice(ticket.tier_price ?? "0")}
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

                    {/* Lower QR Stub — Encodes HMAC-SHA256 Signed QR Token */}
                    <div className="flex flex-col items-center justify-between gap-5 p-6 sm:flex-row">
                      <div className="rounded-sm border border-[#111111] bg-white p-3">
                        <QRCodeCanvas
                          value={ticket.qr_token ?? ticket.ticket_code}
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
                        <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                          <span>Manual Code</span>
                          {ticket.qr_token ? (
                            <span className="inline-flex items-center gap-1 text-stamp font-bold">
                              <ShieldCheck className="h-3 w-3" strokeWidth={2} />
                              HMAC
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 break-all font-mono text-base font-bold tracking-[0.16em] text-fg tabular-nums">
                          {ticket.ticket_code}
                        </p>
                        <p className="mt-2 text-xs text-muted">
                          {ticket.is_scanned
                            ? "This pass has already been redeemed at the door."
                            : "QR payload is cryptographically signed for gate entry."}
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

          {/* Section 2: Available Campus Events with Tier Selection */}
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
                  const tiers = event.tiers ?? [];
                  const activeTierId = selectedTiers[event.id] || defaultTierId(event);
                  const activeTier = tiers.find((t) => t.id === activeTierId) ?? tiers[0] ?? null;
                  const tierSoldOut = activeTier !== null && activeTier.remaining <= 0;
                  const allSoldOut =
                    tiers.length > 0 && tiers.every((t) => t.remaining <= 0);

                  return (
                    <li
                      key={event.id}
                      className="flex flex-col border border-fg bg-surface rounded-card shadow-[4px_4px_0px_var(--fg)] sm:flex-row"
                    >
                      <div className="flex items-center justify-between bg-fg px-5 py-3 text-bg sm:w-28 sm:flex-col sm:justify-center sm:py-6 shrink-0">
                        <span className="font-mono text-[11px] uppercase tracking-[0.2em] opacity-75">
                          {spine.month}
                        </span>
                        <span className="font-display text-3xl font-bold leading-none tracking-tight sm:my-1 sm:text-4xl">
                          {spine.day}
                        </span>
                        <span className="font-mono text-[11px] text-accent">{spine.time}</span>
                      </div>

                      <div className="flex flex-1 flex-col justify-between gap-4 p-5 sm:p-6">
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

                        {tiers.length > 0 ? (
                          <div className="space-y-2 border-t border-dashed border-line pt-3.5">
                            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                              Select Ticket Tier
                            </p>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {tiers.map((tier) => {
                                const selected = activeTier?.id === tier.id;
                                const soldOut = tier.remaining <= 0;
                                return (
                                  <button
                                    key={tier.id}
                                    type="button"
                                    onClick={() =>
                                      setSelectedTiers((prev) => ({
                                        ...prev,
                                        [event.id]: tier.id,
                                      }))
                                    }
                                    className={`flex items-center justify-between gap-2 rounded-card border px-3 py-2 text-left transition-colors ${
                                      selected
                                        ? "border-fg bg-fg text-bg"
                                        : "border-line bg-bg text-fg hover:border-fg"
                                    } ${soldOut ? "opacity-60" : ""}`}
                                  >
                                    <div className="min-w-0">
                                      <p className="truncate font-mono text-xs font-bold">
                                        {tier.name}
                                      </p>
                                      <p
                                        className={`font-mono text-[10px] tabular-nums ${
                                          selected ? "text-bg/75" : "text-muted"
                                        }`}
                                      >
                                        {soldOut
                                          ? "SOLD OUT"
                                          : `${tier.remaining} / ${tier.capacity} seats left`}
                                      </p>
                                    </div>
                                    <span
                                      className={`shrink-0 font-mono text-xs font-bold tabular-nums ${
                                        selected ? "text-accent" : "text-fg"
                                      }`}
                                    >
                                      {formatTierPrice(tier.price)}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div className="relative flex items-center justify-between gap-4 border-t border-dashed border-line p-5 sm:w-52 sm:flex-col sm:justify-center sm:border-t-0 sm:border-l sm:p-6 shrink-0">
                        <span
                          aria-hidden="true"
                          className="hidden sm:block absolute -top-[1px] -left-2.5 h-2.5 w-5 rounded-b-full border-x border-b border-fg bg-bg"
                        />
                        <span
                          aria-hidden="true"
                          className="hidden sm:block absolute -bottom-[1px] -left-2.5 h-2.5 w-5 rounded-t-full border-x border-t border-fg bg-bg"
                        />

                        <div className="space-y-1 text-left sm:text-center">
                          {activeTier ? (
                            <>
                              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                                {activeTier.name}
                              </p>
                              <p className="font-mono text-xl font-bold tabular-nums text-fg">
                                {formatTierPrice(activeTier.price)}
                              </p>
                            </>
                          ) : null}
                          <p className="font-mono text-[11px] font-semibold tabular-nums text-muted">
                            Quota: {heldCount} / {maxLimit} held
                          </p>
                        </div>

                        <button
                          type="button"
                          disabled={
                            limitReached ||
                            tierSoldOut ||
                            allSoldOut ||
                            bookingId === event.id
                          }
                          onClick={() => book(event.id, activeTier?.id ?? "")}
                          className={`inline-flex h-11 items-center justify-center gap-1.5 rounded-card border border-fg px-5 font-mono text-xs font-bold uppercase tracking-wider transition-transform sm:w-full ${
                            limitReached || tierSoldOut || allSoldOut
                              ? "bg-bg text-muted opacity-60 cursor-not-allowed"
                              : "bg-accent text-accent-fg shadow-[3px_3px_0px_var(--fg)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60"
                          }`}
                        >
                          <Ticket className="h-3.5 w-3.5" strokeWidth={1.75} />
                          {allSoldOut || tierSoldOut
                            ? "Sold Out"
                            : limitReached
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
              {activePass.tier_name ?? "General Admission"} ·{" "}
              {formatTierPrice(activePass.tier_price ?? "0")}
            </p>
            <h3 className="mt-1.5 pr-8 font-display text-2xl font-bold leading-tight text-fg">
              {activePass.title}
            </h3>
            <p className="mt-1 font-mono text-xs text-muted">
              {activePass.venue} · {formatWhen(activePass.event_date)}
            </p>

            <div className="mt-5 flex flex-col items-center border border-[#111111] bg-white p-5 rounded-sm">
              <QRCodeCanvas
                value={activePass.qr_token ?? activePass.ticket_code}
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
                  HMAC-SHA256 Signed
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