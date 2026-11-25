import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  MapPin,
  QrCode,
  ScanLine,
  Ticket,
} from "lucide-react";

export default function HomePage() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-14 md:py-24">
      <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-14">
        {/* Left Swiss Poster Hero */}
        <div className="lg:col-span-7">
          <div className="inline-flex items-center gap-2.5 border border-line bg-surface px-3 py-1.5 rounded-card">
            <span className="h-2 w-2 rounded-full bg-accent" />
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-fg">
              Campus Ticketing · UniTik
            </span>
          </div>

          <h1 className="mt-6 font-display text-5xl font-bold leading-[1.02] tracking-tight text-fg sm:text-6xl">
            The short way into the room.
          </h1>

          <p className="mt-5 max-w-lg text-base leading-relaxed text-muted sm:text-lg">
            Students book a seat and keep a QR stub in their wallet. Event planners publish the
            night and scan the door in seconds.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3.5">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center gap-2 rounded-card border border-fg bg-accent px-6 font-mono text-xs font-bold uppercase tracking-[0.18em] text-accent-fg shadow-[3px_3px_0px_var(--fg)] transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              Create a pass
              <ArrowUpRight className="h-4 w-4" strokeWidth={1.75} />
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center gap-2 rounded-card border border-fg bg-surface px-6 font-mono text-xs font-bold uppercase tracking-[0.18em] text-fg transition-colors hover:bg-fg hover:text-bg"
            >
              Sign in
            </Link>
          </div>

          {/* 3-Step Editorial Index Strip */}
          <ol className="mt-12 grid grid-cols-1 gap-4 border-t border-line pt-6 sm:grid-cols-3">
            <li className="space-y-1">
              <p className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-fg">
                <Ticket className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} />
                01 · Book
              </p>
              <p className="text-xs leading-relaxed text-muted">
                Claim your seat directly from the live campus schedule.
              </p>
            </li>
            <li className="space-y-1">
              <p className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-fg">
                <QrCode className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} />
                02 · Hold
              </p>
              <p className="text-xs leading-relaxed text-muted">
                Your pass code stays crisp and scannable in your wallet.
              </p>
            </li>
            <li className="space-y-1">
              <p className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-fg">
                <ScanLine className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} />
                03 · Enter
              </p>
              <p className="text-xs leading-relaxed text-muted">
                Organizers verify once at the gate—no duplicate entries.
              </p>
            </li>
          </ol>
        </div>

        {/* Right Tactile Sample Ticket Stub */}
        <div className="lg:col-span-5">
          <article className="border border-fg bg-surface rounded-card shadow-[6px_6px_0px_var(--fg)]">
            {/* Ink Header Band */}
            <div className="flex items-center justify-between bg-fg px-6 py-3.5 text-bg">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em]">
                Sample Pass
              </span>
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
                Admit One
              </span>
            </div>

            {/* Event Body */}
            <div className="p-6 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
                    Campus Series · 04
                  </p>
                  <h2 className="mt-2 font-display text-3xl font-bold leading-tight tracking-tight text-fg">
                    Night lecture series
                  </h2>
                </div>
                <div className="shrink-0 border border-line bg-bg px-3 py-2 text-center rounded-card">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                    FRI
                  </p>
                  <p className="font-mono text-sm font-bold tabular-nums text-fg">20:00</p>
                </div>
              </div>

              <div className="mt-5 space-y-2 text-xs text-muted">
                <p className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-fg" strokeWidth={1.75} />
                  <span>North Hall · Main Auditorium</span>
                </p>
                <p className="flex items-center gap-2 font-mono tabular-nums">
                  <Clock className="h-3.5 w-3.5 shrink-0 text-fg" strokeWidth={1.75} />
                  <span>Doors open 19:30 · General Seating</span>
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

            {/* Bottom Tear-Off Stub */}
            <div className="flex items-center justify-between gap-4 p-6 sm:p-7">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
                  Pass Code
                </p>
                <p className="mt-1 font-mono text-2xl font-bold tracking-[0.18em] text-fg tabular-nums">
                  UT–4418
                </p>
                <span className="mt-3 inline-flex items-center gap-1.5 border border-stamp px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-stamp">
                  <CheckCircle2 className="h-3 w-3" strokeWidth={1.75} />
                  Valid · Not Scanned
                </span>
              </div>

              <div
                aria-hidden="true"
                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-sm border border-[#111111] bg-white text-[#111111]"
              >
                <QrCode className="h-14 w-14" strokeWidth={1.5} />
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}