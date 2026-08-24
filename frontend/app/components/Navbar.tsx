"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Ticket, ShieldCheck, User } from "lucide-react";

export default function Navbar() {
  return (
    <motion.header 
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 left-0 right-0 z-50 px-6 py-4"
    >
      <div className="max-w-6xl mx-auto glass-panel rounded-2xl px-6 py-3 flex items-center justify-between border border-white/10">
        
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-accent flex items-center justify-center font-bold text-white shadow-lg">
            U
          </div>
          <span className="font-bold text-xl tracking-tight text-white">
            Uni<span className="text-primary">Tik</span>
          </span>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm text-text-muted font-medium">
          <Link href="#events" className="hover:text-white transition-colors">
            Events
          </Link>
          <Link href="#my-tickets" className="hover:text-white transition-colors flex items-center gap-1.5">
            <Ticket size={16} className="text-accent" />
            My Tickets
          </Link>
          <Link href="#scanner" className="hover:text-white transition-colors flex items-center gap-1.5">
            <ShieldCheck size={16} className="text-primary" />
            Gate Scanner
          </Link>
        </nav>

        {/* User Account / Portal Action */}
        <div className="flex items-center gap-3">
          <button className="glass-panel hover:bg-surface-hover px-4 py-2 rounded-xl text-xs font-semibold text-white transition-colors flex items-center gap-2">
            <User size={14} />
            Sign In
          </button>
        </div>

      </div>
    </motion.header>
  );
}