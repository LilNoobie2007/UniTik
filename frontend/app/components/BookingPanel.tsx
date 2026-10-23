"use client";

/*
 * File: frontend/app/components/BookingPanel.tsx
 * UNITIK CORE ARCHITECTURE MANDATE
 * - Frontend: Next.js / BFF
 * - Backend: PHP 8+ (PDO/PostgreSQL)
 * - DO NOT use client-side database calls.
 * - DO NOT trust client inputs. Always sanitize.
 * - Preserve existing logic during modifications.
 *
 * Posts event_id only. book.php reads the holder from the session.
 */

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

export type CampusEvent = {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  ticket_price: string;
  category_tags: string | null;
  venue_name: string;
  location_details: string;
  max_capacity: number;
  tickets_sold: number;
  organizer_name: string;
  committee_name: string | null;
  page_views?: number;
};

type Booked = { ticket_hash: string; event_title: string; mail_status?: string; mail_detail?: string };

type CheckoutOrder = {
  provider_order_id: string;
  amount_paise: number;
  currency: string;
  key_id: string;
  event_title: string;
};

type RazorpayResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayCheckout = new (options: {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  handler: (response: RazorpayResponse) => void;
  modal?: { ondismiss?: () => void };
}) => { open: () => void };

function loadCheckout(): Promise<void> {
  if (document.querySelector("script[data-unitik-razorpay]")) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.unitikRazorpay = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("The payment checkout could not be loaded."));
    document.head.appendChild(script);
  });
}

export function BookingPanel({
  event,
  onBooked,
}: {
  event: CampusEvent | null;
  onBooked: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booked, setBooked] = useState<Booked | null>(null);

  if (!event) {
    return <aside className="panel"><p className="meta">Select an event to book a seat.</p></aside>;
  }

  const remaining = Math.max(0, Number(event.max_capacity) - Number(event.tickets_sold));
  const price = Number(event.ticket_price) > 0 ? `₹${Number(event.ticket_price)}` : "Free";
  const paid = Number(event.ticket_price) > 0;

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      if (!paid) {
        const result = await api<Booked>("/modules/ticketing/book.php", { event_id: event!.id });
        setBooked(result);
        onBooked();
        return;
      }
      const order = await api<CheckoutOrder>("/modules/payments/order.php", { event_id: event!.id });
      await loadCheckout();
      const Checkout = (window as unknown as { Razorpay?: RazorpayCheckout }).Razorpay;
      if (!Checkout) throw new Error("The payment checkout could not be loaded.");
      await new Promise<void>((resolve, reject) => {
        const checkout = new Checkout({
          key: order.key_id,
          amount: order.amount_paise,
          currency: order.currency,
          order_id: order.provider_order_id,
          name: "UniTik",
          description: order.event_title,
          handler: (response) => {
            void api<Booked>("/modules/payments/confirm.php", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            })
              .then((result) => {
                setBooked(result);
                onBooked();
                resolve();
              })
              .catch(reject);
          },
          modal: { ondismiss: () => resolve() },
        });
        checkout.open();
      });
    } catch (err) {
      const status = (err as { status?: number }).status;
      setError(
        status === 401
          ? "Sign in before booking."
          : err instanceof Error
            ? err.message
            : "Booking failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="panel">
      <p className="kicker">Confirm seat</p>
      <h2>{event.title}</h2>
      <p className="meta">{event.venue_name} · {event.location_details}</p>
      <p className="meta">{new Date(event.event_date).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</p>
      <p className="meta">{remaining} seats left · {price}</p>
      {event.committee_name && <p className="meta">Hosted by {event.organizer_name} · {event.committee_name}</p>}
      {error && <p className="error">{error}</p>}
      {booked && (
        <p className="ok">
          Ticket issued. Gate code UNITIK:{booked.ticket_hash}
          {booked.mail_detail ? ` ${booked.mail_detail}` : ""}
        </p>
      )}
      <div className="stack">
        <button className="btn block" type="button" disabled={busy || remaining <= 0} onClick={() => void confirm()}>
          {remaining <= 0 ? "Sold out" : busy ? "Issuing…" : paid ? "Pay and issue code" : "Confirm and issue code"}
        </button>
        <Link href="/login" className="meta">Need a campus pass? Sign in</Link>
      </div>
    </aside>
  );
}
