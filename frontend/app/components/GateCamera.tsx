"use client";

/*
 * File: frontend/app/components/GateCamera.tsx
 * UNITIK CORE ARCHITECTURE MANDATE
 * - Frontend: Next.js / BFF
 * - Backend: PHP 8+ (PDO/PostgreSQL)
 * - DO NOT use client-side database calls.
 * - DO NOT trust client inputs. Always sanitize.
 * - Preserve existing logic during modifications.
 *
 * Reads a QR into the same payload the paste box sends.
 * No camera decoder is invented when the browser has none.
 */

import { useEffect, useRef, useState } from "react";

type Detector = {
  detect: (source: CanvasImageSource) => Promise<{ rawValue?: string }[]>;
};

type DetectorCtor = new (options: { formats: string[] }) => Detector;

export function GateCamera({
  disabled,
  onPayload,
}: {
  disabled: boolean;
  onPayload: (value: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onPayloadRef = useRef(onPayload);
  const [note, setNote] = useState("Starting camera…");
  const [live, setLive] = useState(false);
  onPayloadRef.current = onPayload;

  useEffect(() => {
    if (disabled) return;
    const DetectorImpl = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
    if (!DetectorImpl) {
      setNote("This browser has no QR camera API. Paste the code below.");
      return;
    }

    let stopped = false;
    let stream: MediaStream | null = null;
    let timer = 0;
    const detector = new DetectorImpl({ formats: ["qr_code"] });

    const stopTracks = () => {
      stream?.getTracks().forEach((track) => track.stop());
    };

    void (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" } },
        });
      } catch {
        if (!stopped) setNote("Camera permission was denied. Paste the code below.");
        return;
      }
      if (stopped || !videoRef.current) {
        stopTracks();
        return;
      }
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      if (stopped) return;
      setLive(true);

      const tick = async () => {
        if (stopped || !videoRef.current) return;
        try {
          const found = await detector.detect(videoRef.current);
          const value = found[0]?.rawValue?.trim();
          if (value) onPayloadRef.current(value);
        } catch {
          // A frame can be unreadable. The next tick tries again.
        }
        timer = window.setTimeout(() => void tick(), 350);
      };
      timer = window.setTimeout(() => void tick(), 350);
    })();

    return () => {
      stopped = true;
      window.clearTimeout(timer);
      stopTracks();
    };
  }, [disabled]);

  return (
    <div className="panel" style={{ maxWidth: 560 }}>
      <p className="kicker">Camera</p>
      <video ref={videoRef} className="camera" muted playsInline />
      {!live && <p className="meta">{disabled ? "Sign in to open the camera." : note}</p>}
    </div>
  );
}
