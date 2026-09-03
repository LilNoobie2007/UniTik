"use client";

import { useState, useEffect, type JSX } from "react";
import type { CampusEvent, EventFeedProps, EventsListResponse } from "@/app/types/event";
import EventCard from "./EventCard";
import SkeletonCard from "./SkeletonCard";

const DEFAULT_EVENTS_URL =
  "http://localhost/UniTik/backend/modules/events/list.php";

export default function EventFeed({
  apiUrl = DEFAULT_EVENTS_URL,
}: EventFeedProps): JSX.Element {
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchEvents = async (): Promise<void> => {
      try {
        const res = await fetch(apiUrl);
        const json = (await res.json()) as EventsListResponse;

        if (json.status === "success") {
          setEvents(json.data);
        } else {
          console.error("Backend error:", json.message);
        }
      } catch (error: unknown) {
        console.error("Failed to fetch events:", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchEvents();
  }, [apiUrl]);

  return (
    <section
      id="events"
      className="relative z-10 mx-auto w-full max-w-6xl px-6 py-24"
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
        ) : events.length > 0 ? (
          events.map((event: CampusEvent, i: number) => (
            <EventCard key={event.id} event={event} index={i} />
          ))
        ) : (
          <p className="col-span-full py-10 text-center text-white/50">
            No upcoming events found.
          </p>
        )}
      </div>
    </section>
  );
}
