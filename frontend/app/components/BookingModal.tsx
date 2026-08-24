"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function BookingModal({ 
  event, 
  isOpen, 
  onClose 
}: { 
  event: any, 
  isOpen: boolean, 
  onClose: () => void 
}) {
  const [isProcessing, setIsProcessing] = useState(false);

const handleBooking = async () => {
  console.log("👆 Button clicked! Starting booking process...");
    setIsProcessing(true);
    
    try {
      // Calling our new Next.js BFF endpoint
      const response = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: "845d44cf-ac43-4cda-b763-b8d54841a639", // Hardcoded for now, we'll make this dynamic later
          event_id: event.id // Using the ID from the card clicked
        }),
      });

      const result = await response.json();

      if (result.status === 'success') {
        toast.success("Ticket Booked Successfully!", {
          description: `Check your email for the QR code. Ref: ${result.ticket_hash.substring(0, 8)}...`,
          icon: <CheckCircle2 className="text-primary" />
        });
        onClose();
      } else {
        toast.error("Booking Failed", {
          description: result.message || "Please try again later."
        });
      }
    } catch (err) {
      toast.error("Connection Error", {
        description: "Could not reach the server."
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          
          {/* Blur Overlay */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-md glass-panel border border-white/10 rounded-2xl p-6 shadow-2xl overflow-hidden"
          >
            {/* Close Button */}
            <button onClick={onClose} className="absolute top-4 right-4 text-text-muted hover:text-white transition-colors">
              <X size={20} />
            </button>

            <h2 className="text-2xl font-bold text-white mb-2">Confirm Booking</h2>
            <p className="text-text-muted mb-6 text-sm">You are about to secure a ticket for the following event.</p>

            {/* Event Summary Box */}
            <div className="bg-surface-hover/50 border border-white/5 rounded-xl p-4 mb-6">
              <h3 className="font-semibold text-white">{event.title}</h3>
              <div className="flex justify-between mt-2 text-sm text-text-muted">
                <span>{event.date}</span>
                <span className="font-bold text-white">{event.price}</span>
              </div>
            </div>

            {/* Action Button */}
            <button 
              onClick={handleBooking}
              disabled={isProcessing}
              className="w-full glow-border bg-surface px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-surface-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={18} className="animate-spin text-primary" />
                  Processing...
                </>
              ) : (
                "Confirm & Generate QR"
              )}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}