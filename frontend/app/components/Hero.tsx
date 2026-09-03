"use client";

import type { JSX } from "react";
import { motion } from "framer-motion";
import { Ticket, Calendar, Zap } from "lucide-react";
import { cn } from "@/lib/cn";

export default function Hero(): JSX.Element {
  return (
    <>
      <div className="absolute top-0 left-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-primary/20 blur-[120px]" />
      <div className="absolute right-1/4 bottom-1/4 -z-10 h-[400px] w-[400px] rounded-full bg-accent/20 blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="z-10 mb-24 max-w-3xl px-6 text-center"
      >
        <div
          className={cn(
            "glass-panel mb-8 inline-flex items-center gap-2 rounded-full px-4 py-2",
            "text-sm text-text-muted",
          )}
        >
          <Zap size={16} className="text-primary" />
          <span>Next-Gen Campus Ecosystem</span>
        </div>

        <h1
          className={cn(
            "mb-6 bg-gradient-to-r from-white via-white to-text-muted bg-clip-text text-transparent",
            "text-5xl font-bold tracking-tight md:text-7xl",
          )}
        >
          Experience Events, <br /> Redefined.
        </h1>

        <p className="mx-auto mb-10 max-w-2xl text-lg text-text-muted md:text-xl">
          The central hub for college fests, placement drives, and smart QR
          ticketing. Secure, fast, and beautifully designed.
        </p>

        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <a
            href="#events"
            className={cn(
              "glow-border flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-surface px-8 py-4 font-semibold",
              "transition-colors hover:bg-surface-hover",
            )}
          >
            <Ticket size={20} className="text-accent" />
            Browse Events
          </a>

          <button
            type="button"
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl px-8 py-4 font-semibold text-text-muted",
              "transition-colors hover:text-white",
            )}
          >
            <Calendar size={20} />
            Organizer Login
          </button>
        </div>
      </motion.div>
    </>
  );
}
