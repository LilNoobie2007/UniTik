"use client";

import type { JSX } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Ticket, ShieldCheck, User } from "lucide-react";
import { cn } from "@/lib/cn";

export default function Navbar(): JSX.Element {
  return (
    <motion.header
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 right-0 left-0 z-50 px-6 py-4"
    >
      <div
        className={cn(
          "glass-panel mx-auto flex max-w-6xl items-center justify-between rounded-2xl",
          "border border-white/10 px-6 py-3",
        )}
      >
        <Link href="/" className="flex items-center gap-2">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg font-bold text-white shadow-lg",
              "bg-gradient-to-tr from-primary to-accent",
            )}
          >
            U
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            Uni<span className="text-primary">Tik</span>
          </span>
        </Link>

        <nav
          className={cn(
            "hidden items-center gap-8 text-sm font-medium text-text-muted md:flex",
          )}
        >
          <Link href="#events" className="transition-colors hover:text-white">
            Events
          </Link>
          <Link
            href="#my-tickets"
            className="flex items-center gap-1.5 transition-colors hover:text-white"
          >
            <Ticket size={16} className="text-accent" />
            My Tickets
          </Link>
          <Link
            href="#scanner"
            className="flex items-center gap-1.5 transition-colors hover:text-white"
          >
            <ShieldCheck size={16} className="text-primary" />
            Gate Scanner
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className={cn(
              "glass-panel flex items-center gap-2 rounded-xl px-4 py-2",
              "text-xs font-semibold text-white transition-colors hover:bg-surface-hover",
            )}
          >
            <User size={14} />
            Sign In
          </button>
        </div>
      </div>
    </motion.header>
  );
}
