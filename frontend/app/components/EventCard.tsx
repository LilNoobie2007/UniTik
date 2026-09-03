"use client";

import { useState, type JSX } from "react";
import { motion } from "framer-motion";
import { Calendar, MapPin, ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";
import type { EventCardProps } from "@/app/types/event";
import BookingModal from "./BookingModal";

export default function EventCard({
  event,
  index,
}: EventCardProps): JSX.Element {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: index * 0.15 }}
        onClick={() => setIsModalOpen(true)}
        className={cn(
          "glow-border group cursor-pointer rounded-2xl bg-surface p-[1px]",
        )}
      >
        <div
          className={cn(
            "glass-panel relative z-10 flex h-full flex-col rounded-xl p-5",
            "transition-all duration-300 group-hover:bg-surface-hover",
          )}
        >
          <div
            className={cn(
              "relative mb-5 flex h-36 w-full items-center justify-center rounded-lg",
              "border border-white/5 bg-gradient-to-br from-primary/10 to-accent/10",
            )}
          >
            <Calendar size={40} className="text-white/20" />
          </div>

          <div
            className={cn(
              "mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary",
            )}
          >
            {event.category || "General"}
          </div>

          <h3 className="mb-2 text-xl font-bold text-white">{event.title}</h3>

          <div className="mt-auto mb-4 flex flex-col gap-1">
            <span className="flex items-center gap-2 text-sm text-white/60">
              <Calendar size={14} /> {event.date}
            </span>
            <span className="flex items-center gap-2 text-sm text-white/60">
              <MapPin size={14} /> {event.location}
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-white/10 pt-4">
            <span className="text-lg font-bold text-white">{event.price}</span>
            <button
              type="button"
              className="flex items-center gap-1.5 text-sm font-semibold text-primary"
            >
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
