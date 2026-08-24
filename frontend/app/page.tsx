"use client";

import { motion } from "framer-motion";
import { Ticket, Calendar, Zap } from "lucide-react";
import EventFeed from "./components/EventFeed"; // <-- Add this import

export default function Home() {
  return (
    <main className="relative min-h-screen flex flex-col items-center pt-32 overflow-hidden">
      
      {/* Ambient Orbs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent/20 rounded-full blur-[100px] -z-10" />

      {/* Hero Content */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center z-10 max-w-3xl px-6 mb-24" // <-- Added mb-24 for spacing
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel mb-8 text-sm text-text-muted">
          <Zap size={16} className="text-primary" />
          <span>Next-Gen Campus Ecosystem</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-r from-white via-white to-text-muted bg-clip-text text-transparent">
          Experience Events, <br/> Redefined.
        </h1>
        
        <p className="text-lg md:text-xl text-text-muted mb-10 max-w-2xl mx-auto">
          The central hub for college fests, placement drives, and smart QR ticketing. Secure, fast, and beautifully designed.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="#events" className="glow-border bg-surface px-8 py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-surface-hover transition-colors cursor-pointer">
            <Ticket size={20} className="text-accent" />
            Browse Events
          </a>
          
          <button className="px-8 py-4 rounded-xl font-semibold text-text-muted hover:text-white transition-colors flex items-center justify-center gap-2">
            <Calendar size={20} />
            Organizer Login
          </button>
        </div>
      </motion.div>

      {/* Render the grid here! */}
      <EventFeed /> 

    </main>
  );
}