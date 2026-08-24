"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, MapPin, ArrowRight } from "lucide-react";
import BookingModal from "./BookingModal";

export default function EventFeed() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Real fetch call to your PHP backend
    const fetchEvents = async () => {
      try {
        const res = await fetch("http://localhost/UniTik/backend/modules/events/list.php");
        const json = await res.json();
        
        if (json.status === "success") {
          setEvents(json.data);
        } else {
          console.error("Backend error:", json.message);
        }
      } catch (error) {
        console.error("Failed to fetch events:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  return (
    <section id="events" className="w-full max-w-6xl mx-auto px-6 py-24 z-10 relative">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
        ) : events.length > 0 ? (
          events.map((event: any, i: number) => (
            <EventCard key={event.id} event={event} index={i} />
          ))
        ) : (
          <p className="text-white/50 col-span-full text-center py-10">No upcoming events found.</p>
        )}
      </div>
    </section>
  );
}

function EventCard({ event, index }: { event: any; index: number }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: index * 0.15 }}
        className="glow-border bg-surface p-[1px] rounded-2xl group cursor-pointer"
        onClick={() => setIsModalOpen(true)}
      >
        <div className="glass-panel p-5 rounded-xl h-full flex flex-col transition-all duration-300 group-hover:bg-surface-hover z-10 relative">
          <div className="w-full h-36 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 mb-5 flex items-center justify-center border border-white/5 relative">
             <Calendar size={40} className="text-white/20" />
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-2 uppercase tracking-wider">
             {event.category || "General"}
          </div>
          <h3 className="text-xl font-bold mb-2 text-white">{event.title}</h3>
          
          <div className="flex flex-col gap-1 mb-4 mt-auto">
            <span className="text-sm text-white/60 flex items-center gap-2">
              <Calendar size={14} /> {event.date}
            </span>
            <span className="text-sm text-white/60 flex items-center gap-2">
              <MapPin size={14} /> {event.location}
            </span>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <span className="font-bold text-lg text-white">{event.price}</span>
            <button className="flex items-center gap-1.5 text-sm font-semibold text-primary">
              Book Now <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </motion.div>

      <BookingModal 
        event={event} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
}

function SkeletonCard() {
  return <div className="glass-panel p-5 rounded-2xl h-[360px] animate-pulse bg-white/5 border border-white/10"></div>;
}