"use client";

import { useState, type JSX } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import type { BookingModalProps, BookingResponse } from "@/app/types/booking";

export default function BookingModal({
  event,
  isOpen,
  onClose,
}: BookingModalProps): JSX.Element {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleBooking = async (): Promise<void> => {
    console.log("👆 Button clicked! Starting booking process...");
    setIsProcessing(true);

    try {
      const response = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: "845d44cf-ac43-4cda-b763-b8d54841a639",
          event_id: event.id,
        }),
      });

      const result = (await response.json()) as BookingResponse;

      if (result.status === "success") {
        toast.success("Ticket Booked Successfully!", {
          description: `Check your email for the QR code. Ref: ${result.ticket_hash.substring(0, 8)}...`,
          icon: <CheckCircle2 className="text-primary" />,
        });
        onClose();
      } else {
        toast.error("Booking Failed", {
          description: result.message || "Please try again later.",
        });
      }
    } catch {
      toast.error("Connection Error", {
        description: "Could not reach the server.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className={cn(
              "relative w-full max-w-md overflow-hidden rounded-2xl p-6 shadow-2xl",
              "glass-panel border border-white/10",
            )}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 text-text-muted transition-colors hover:text-white"
            >
              <X size={20} />
            </button>

            <h2 className="mb-2 text-2xl font-bold text-white">
              Confirm Booking
            </h2>
            <p className="mb-6 text-sm text-text-muted">
              You are about to secure a ticket for the following event.
            </p>

            <div className="mb-6 rounded-xl border border-white/5 bg-surface-hover/50 p-4">
              <h3 className="font-semibold text-white">{event.title}</h3>
              <div className="mt-2 flex justify-between text-sm text-text-muted">
                <span>{event.date}</span>
                <span className="font-bold text-white">{event.price}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                void handleBooking();
              }}
              disabled={isProcessing}
              className={cn(
                "glow-border flex w-full items-center justify-center gap-2 rounded-xl bg-surface px-6 py-3 font-semibold",
                "transition-colors hover:bg-surface-hover",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
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
