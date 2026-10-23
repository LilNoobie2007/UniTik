"use client";

/*
 * File: frontend/app/host/page.tsx
 * UNITIK CORE ARCHITECTURE MANDATE
 * - Frontend: Next.js / BFF
 * - Backend: PHP 8+ (PDO/PostgreSQL)
 * - DO NOT use client-side database calls.
 * - DO NOT trust client inputs. Always sanitize.
 * - Preserve existing logic during modifications.
 *
 * Host desk. The form does not send organizer_id.
 */

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

type Venue = {
  id: string;
  venue_name: string;
  location_details: string;
  max_capacity: number;
};

type HostedEvent = {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  ticket_price: string;
  status: string;
  category_tags: string | null;
  venue_name: string;
  max_capacity: number;
  tickets_sold: number;
};

type Attendee = {
  full_name: string;
  email: string;
  roll_number: string | null;
  ticket_id: string;
  ticket_hash: string;
  scan_status: boolean;
  issued_at: string;
};

type DoorList = {
  event_id: string;
  title: string;
  attendees: Attendee[];
};

type ScanRow = {
  id: string;
  scanned_at: string;
  gate_identifier: string;
  scan_result: string;
  holder_name: string;
  scanner_name: string | null;
  ticket_hash: string;
};

type ScanLog = {
  event_id: string;
  title: string;
  scans: ScanRow[];
};

export default function HostPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [events, setEvents] = useState<HostedEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [price, setPrice] = useState("0");
  const [category, setCategory] = useState("Cultural");
  const [venueId, setVenueId] = useState("");
  const [venueName, setVenueName] = useState("");
  const [venueLocation, setVenueLocation] = useState("");
  const [venueCapacity, setVenueCapacity] = useState("100");
  const [busy, setBusy] = useState(false);
  const [door, setDoor] = useState<DoorList | null>(null);
  const [scanLog, setScanLog] = useState<ScanLog | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editPrice, setEditPrice] = useState("0");
  const [editCategory, setEditCategory] = useState("");
  const [committee, setCommittee] = useState("");

  async function saveCommittee(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const saved = await api<{ committee_name: string | null }>("/modules/auth/committee.php", {
        committee_name: committee,
      });
      setCommittee(saved.committee_name ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the committee name.");
    } finally {
      setBusy(false);
    }
  }

  const load = useCallback(async () => {
    const [nextVenues, nextEvents] = await Promise.all([
      api<Venue[]>("/modules/events/venues.php"),
      api<HostedEvent[]>("/modules/events/hosted.php"),
    ]);
    setVenues(nextVenues);
    setEvents(nextEvents);
    setVenueId((current) => current || nextVenues[0]?.id || "");
  }, []);

  useEffect(() => {
    void api<{ committee_name: string | null }>("/modules/auth/me.php")
      .then((profile) => setCommittee(profile.committee_name ?? ""))
      .catch(() => setCommittee(""));
  }, []);

  useEffect(() => {
    void load().catch((err: unknown) => {
      const status = (err as { status?: number }).status;
      if (status === 401 || status === 403) {
        setLocked(err instanceof Error ? err.message : "Host desk is locked.");
        return;
      }
      setError(err instanceof Error ? err.message : "Could not load the host desk.");
    });
  }, [load]);

  async function addVenue(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/modules/events/venues.php", {
        venue_name: venueName,
        location_details: venueLocation,
        max_capacity: Number(venueCapacity),
      });
      setVenueName("");
      setVenueLocation("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the venue.");
    } finally {
      setBusy(false);
    }
  }

  async function publish(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/modules/events/create.php", {
        title,
        description,
        event_date: new Date(eventDate).toISOString(),
        ticket_price: Number(price),
        category_tags: category,
        venue_id: venueId,
      });
      setTitle("");
      setDescription("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not publish.");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(item: HostedEvent) {
    const local = new Date(item.event_date);
    const pad = (value: number) => String(value).padStart(2, "0");
    const stamp = `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}T${pad(local.getHours())}:${pad(local.getMinutes())}`;
    setEditing(item.id);
    setEditTitle(item.title);
    setEditDescription(item.description ?? "");
    setEditDate(stamp);
    setEditPrice(String(Number(item.ticket_price)));
    setEditCategory(item.category_tags ?? "General");
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      await api("/modules/events/update.php", {
        event_id: editing,
        title: editTitle,
        description: editDescription,
        event_date: new Date(editDate).toISOString(),
        ticket_price: Number(editPrice),
        category_tags: editCategory,
      });
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the event.");
    } finally {
      setBusy(false);
    }
  }

  async function complete(eventId: string) {
    setError(null);
    try {
      await api("/modules/events/complete.php", { event_id: eventId });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not close the event.");
    }
  }

  async function openScans(eventId: string) {
    setError(null);
    try {
      const log = await api<ScanLog>(`/modules/events/scans.php?event_id=${eventId}`);
      setScanLog(log);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the scan log.");
    }
  }

  async function openDoor(eventId: string) {
    setError(null);
    try {
      const list = await api<DoorList>(`/modules/events/attendees.php?event_id=${eventId}`);
      setDoor(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the door list.");
    }
  }
  async function cancel(eventId: string) {
    setError(null);
    try {
      await api("/modules/events/cancel.php", { event_id: eventId });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel.");
    }
  }

  return (
    <main className="page">
      <p className="kicker">Organizer</p>
      <h1>Host desk</h1>
      <p className="lede">
        Published events belong to the signed-in host. Students book them from the campus list.
      </p>
      {locked && (
        <p className="error">
          {locked} <Link href="/admin">Ask an admin to promote you</Link>
        </p>
      )}
      {error && <p className="error">{error}</p>}

      {!locked && (
        <div className="grid">
          <div className="stack">
          <form onSubmit={(event) => void saveCommittee(event)} className="panel">
            <h2>Committee</h2>
            <p className="meta">This name is printed on events you publish. It does not change your role.</p>
            <label htmlFor="committee">Committee name</label>
            <input id="committee" maxLength={100} value={committee} onChange={(event) => setCommittee(event.target.value)} />
            <button className="btn secondary" type="submit" disabled={busy}>
              Save committee
            </button>
          </form>
          <form onSubmit={(event) => void publish(event)} className="panel">
            <h2>Publish event</h2>
            <label htmlFor="title">Title</label>
            <input id="title" required value={title} onChange={(event) => setTitle(event.target.value)} />
            <label htmlFor="description">Description</label>
            <input id="description" value={description} onChange={(event) => setDescription(event.target.value)} />
            <label htmlFor="when">Date and time</label>
            <input id="when" type="datetime-local" required value={eventDate} onChange={(event) => setEventDate(event.target.value)} />
            <label htmlFor="price">Price (INR)</label>
            <input id="price" type="number" min="0" step="1" value={price} onChange={(event) => setPrice(event.target.value)} />
            <label htmlFor="category">Category</label>
            <input id="category" value={category} onChange={(event) => setCategory(event.target.value)} />
            <label htmlFor="venue">Venue</label>
            <select id="venue" required value={venueId} onChange={(event) => setVenueId(event.target.value)} style={{ width: "100%", minHeight: 44, marginBottom: 12, borderRadius: 12, background: "var(--elevated)", color: "var(--fg)", border: "1px solid var(--border)" }}>
              <option value="" disabled>
                Select a hall
              </option>
              {venues.map((venue) => (
                <option key={venue.id} value={venue.id}>
                  {venue.venue_name} · {venue.max_capacity}
                </option>
              ))}
            </select>
            <button className="btn block" type="submit" disabled={busy || venues.length === 0}>
              {busy ? "Publishing…" : "Publish"}
            </button>
          </form>
          </div>

          <div className="stack">
            <form onSubmit={(event) => void addVenue(event)} className="panel">
              <h2>Add a venue</h2>
              <label htmlFor="venue-name">Name</label>
              <input id="venue-name" required value={venueName} onChange={(event) => setVenueName(event.target.value)} />
              <label htmlFor="venue-location">Location</label>
              <input id="venue-location" required value={venueLocation} onChange={(event) => setVenueLocation(event.target.value)} />
              <label htmlFor="venue-capacity">Capacity</label>
              <input id="venue-capacity" type="number" min="1" required value={venueCapacity} onChange={(event) => setVenueCapacity(event.target.value)} />
              <button className="btn secondary block" type="submit" disabled={busy}>
                Save venue
              </button>
            </form>

            <section className="stack">
              <h2>Your board</h2>
              {events.length === 0 && <p className="meta">No hosted events yet.</p>}
              {events.map((item) => (
                <article key={item.id} className="card">
                  <div className="row">
                    <strong>{item.title}</strong>
                    <span className="badge">{item.status}</span>
                  </div>
                  <p className="meta">
                    {item.venue_name} · {item.tickets_sold}/{item.max_capacity} booked
                  </p>
                  <div className="row">
                    <button className="btn secondary" type="button" onClick={() => void openDoor(item.id)}>
                      Door list
                    </button>
                    <button className="btn secondary" type="button" onClick={() => void openScans(item.id)}>
                      Scan log
                    </button>
                    {item.status === "published" && (
                      <button className="btn secondary" type="button" onClick={() => startEdit(item)}>
                        Edit
                      </button>
                    )}
                    {item.status === "published" && (
                      <button className="btn secondary" type="button" onClick={() => void complete(item.id)}>
                        Complete
                      </button>
                    )}
                    {item.status === "published" && (
                      <button className="btn secondary" type="button" onClick={() => void cancel(item.id)}>
                        Cancel
                      </button>
                    )}
                  </div>
                  {editing === item.id && (
                    <form onSubmit={(event) => void saveEdit(event)} style={{ marginTop: 12 }}>
                      <label htmlFor={`edit-title-${item.id}`}>Title</label>
                      <input id={`edit-title-${item.id}`} required value={editTitle} onChange={(event) => setEditTitle(event.target.value)} />
                      <label htmlFor={`edit-about-${item.id}`}>Description</label>
                      <input id={`edit-about-${item.id}`} value={editDescription} onChange={(event) => setEditDescription(event.target.value)} />
                      <label htmlFor={`edit-when-${item.id}`}>Date and time</label>
                      <input id={`edit-when-${item.id}`} type="datetime-local" required value={editDate} onChange={(event) => setEditDate(event.target.value)} />
                      <label htmlFor={`edit-price-${item.id}`}>Price (INR)</label>
                      <input id={`edit-price-${item.id}`} type="number" min="0" step="1" value={editPrice} onChange={(event) => setEditPrice(event.target.value)} />
                      <label htmlFor={`edit-category-${item.id}`}>Category</label>
                      <input id={`edit-category-${item.id}`} value={editCategory} onChange={(event) => setEditCategory(event.target.value)} />
                      <button className="btn" type="submit" disabled={busy}>
                        Save changes
                      </button>
                    </form>
                  )}
                </article>
              ))}
            </section>

            {door && (
              <section className="stack">
                <h2>{door.title}</h2>
                <p className="meta">
                  {door.attendees.filter((person) => person.scan_status).length} entered · {door.attendees.length} issued
                </p>
                {door.attendees.length === 0 && <p className="meta">No tickets issued yet.</p>}
                {door.attendees.map((person) => (
                  <article key={person.ticket_id} className="card">
                    <div className="row">
                      <strong>{person.full_name}</strong>
                      <span className="badge">{person.scan_status ? "Entered" : "Out"}</span>
                    </div>
                    <p className="meta">{person.email}{person.roll_number ? ` · ${person.roll_number}` : ""}</p>
                    <p className="meta">UNITIK:{person.ticket_hash}</p>
                  </article>
                ))}
              </section>
            )}

            {scanLog && (
              <section className="stack">
                <h2>{scanLog.title} scans</h2>
                <p className="meta">Unknown codes are not stored. Every row here matched a real ticket.</p>
                {scanLog.scans.length === 0 && <p className="meta">No scans yet.</p>}
                {scanLog.scans.map((scan) => (
                  <article key={scan.id} className="card">
                    <div className="row">
                      <strong>{scan.holder_name}</strong>
                      <span className="badge">{scan.scan_result.replaceAll("_", " ")}</span>
                    </div>
                    <p className="meta">
                      {scan.gate_identifier} · {scan.scanner_name ?? "Unknown scanner"} ·{" "}
                      {new Date(scan.scanned_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                    </p>
                  </article>
                ))}
              </section>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
