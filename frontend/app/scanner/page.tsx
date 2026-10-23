"use client";

/*
 * File: frontend/app/scanner/page.tsx
 * UNITIK CORE ARCHITECTURE MANDATE
 * - Frontend: Next.js / BFF
 * - Backend: PHP 8+ (PDO/PostgreSQL)
 * - DO NOT use client-side database calls.
 * - DO NOT trust client inputs. Always sanitize.
 * - Preserve existing logic during modifications.
 *
 * Gate scanner. The server decides approved / already used / wrong event.
 * This page does not send a role or a user id.
 */

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { GateCamera } from "../components/GateCamera";

type GateEvent = { id: string; title: string; event_date: string };

type ScanData = {
  result: "approved" | "already_used" | "invalid" | "wrong_event" | "forbidden";
  message?: string;
  holder_name?: string;
  event_title?: string;
  ticket_hash?: string;
};

type LocalScan = ScanData & { at: string; gate: string };

export default function GateScannerPage() {
  const [events, setEvents] = useState<GateEvent[]>([]);
  const [eventId, setEventId] = useState("");
  const [gate, setGate] = useState("GATE-A");
  const [hash, setHash] = useState("");
  const [busy, setBusy] = useState(false);
  const [locked, setLocked] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<ScanData | null>(null);
  const [log, setLog] = useState<LocalScan[]>([]);
  const lastPayload = useRef<string>("");
  const inFlight = useRef(false);

  useEffect(() => {
    api<GateEvent[]>("/modules/events/gate.php")
      .then(setEvents)
      .catch((err: unknown) => {
        const status = (err as { status?: number }).status;
        setLocked(status === 401 ? "Sign in with a host account before scanning." : err instanceof Error ? err.message : "Gate list unavailable.");
      });
  }, []);

  async function check(raw: string) {
    const payload = raw.trim();
    if (!payload || locked || inFlight.current || payload === lastPayload.current) return;
    lastPayload.current = payload;
    inFlight.current = true;
    setBusy(true);
    setHash(payload);
    try {
      const data = await api<ScanData>("/modules/ticketing/validate.php", {
        ticket_hash: payload,
        event_id: eventId || undefined,
        gate_identifier: gate,
      });
      const next = { ...data, message: data.message ?? "VALID TICKET — entry approved." };
      setOutcome(next);
      setLog((rows) => [{ ...next, at: new Date().toISOString(), gate }, ...rows].slice(0, 12));
      setHash("");
    } catch (err) {
      const status = (err as { status?: number }).status;
      const message = err instanceof Error ? err.message : "Scan failed.";
      if (!status || status >= 500) lastPayload.current = "";
      const result: ScanData["result"] =
        status === 404 ? "invalid" : status === 403 ? "forbidden" : message.includes("WRONG EVENT") ? "wrong_event" : "already_used";
      const next: ScanData = { result, message };
      setOutcome(next);
      setLog((rows) => [{ ...next, at: new Date().toISOString(), gate }, ...rows].slice(0, 12));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    lastPayload.current = "";
    void check(hash);
  }

  const approved = outcome?.result === "approved";

  return (
    <main className="page">
      <p className="kicker">Ground ops</p>
      <h1>Gate scanner</h1>
      <p className="lede">
        Point the camera at a ticket QR, or paste the code. The same check runs either way. A code already in frame is not sent twice.
      </p>

      {locked && (
        <p className="error">
          {locked} <Link href="/login">Sign in</Link>
        </p>
      )}

      <GateCamera disabled={locked !== null} onPayload={(value) => void check(value)} />

      <form onSubmit={onSubmit} className="panel" style={{ maxWidth: 560, marginTop: 16 }}>
        <label htmlFor="event">Event gate</label>
        <select id="event" value={eventId} onChange={(event) => setEventId(event.target.value)} style={{ width: "100%", minHeight: 44, marginBottom: 12, borderRadius: 12, background: "var(--elevated)", color: "var(--fg)", border: "1px solid var(--border)" }}>
          <option value="">Any event I can host</option>
          {events.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
        <label htmlFor="gate">Gate id</label>
        <input id="gate" value={gate} onChange={(event) => setGate(event.target.value)} />
        <label htmlFor="hash">Ticket hash</label>
        <input id="hash" required value={hash} onChange={(event) => setHash(event.target.value)} placeholder="UNITIK:abc123… or the raw hash" />
        <button className="btn block" type="submit" disabled={busy || locked !== null}>
          {busy ? "Checking ledger…" : "Validate entry"}
        </button>
      </form>

      <div className={outcome ? (approved ? "verdict approved" : "verdict denied") : "verdict"} style={{ marginTop: 16, maxWidth: 560 }}>
        <h2>{outcome ? outcome.message : "Waiting for a scan"}</h2>
        {outcome?.holder_name && <p>Holder · {outcome.holder_name}</p>}
        {outcome?.event_title && <p>{outcome.event_title}</p>}
      </div>

      <h2>This shift</h2>
      <div className="stack" style={{ maxWidth: 560 }}>
        {log.length === 0 && <p className="meta">No scans yet.</p>}
        {log.map((row, index) => (
          <article key={`${row.at}-${index}`} className="card row">
            <div>
              <strong>{row.result.replaceAll("_", " ")}</strong>
              <p className="meta">{row.event_title ?? "—"} · {row.gate}</p>
            </div>
            <span className="meta">{row.ticket_hash ? row.ticket_hash.slice(0, 8) : "—"}</span>
          </article>
        ))}
      </div>
    </main>
  );
}
