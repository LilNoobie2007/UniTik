"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Camera,
  CameraOff,
  CheckCircle2,
  Clock,
  MapPin,
  ScanLine,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import { ApiError, api } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";

type ScannedTicket = {
  event_id: string;
  title: string;
  description: string | null;
  event_date: string;
  venue: string;
  ticket_code: string;
  is_scanned: boolean;
};

type ScanResponse = {
  ok: true;
  already_scanned: boolean;
  first_scanned_at: string | null;
  gate_identifier: string;
  holder_name: string | null;
  holder_email: string | null;
  ticket: ScannedTicket;
};

type ScanVerdict =
  | {
      kind: "admitted";
      code: string;
      holderName: string | null;
      holderEmail: string | null;
      ticket: ScannedTicket;
      gate: string;
      at: string;
    }
  | {
      kind: "duplicate";
      code: string;
      holderName: string | null;
      holderEmail: string | null;
      ticket: ScannedTicket;
      firstScannedAt: string | null;
      gate: string;
      at: string;
    }
  | {
      kind: "denied";
      code: string;
      reason: string;
      gate: string;
      at: string;
    };

interface DetectedBarcode {
  rawValue?: string;
}

interface BarcodeDetectorLike {
  detect(source: HTMLVideoElement): Promise<DetectedBarcode[]>;
}

interface BarcodeDetectorCtor {
  new (options?: { formats?: string[] }): BarcodeDetectorLike;
}

function getBarcodeDetectorCtor(): BarcodeDetectorCtor | null {
  if (typeof window === "undefined") return null;
  const candidate = (window as Window & { BarcodeDetector?: BarcodeDetectorCtor })
    .BarcodeDetector;
  return typeof candidate === "function" ? candidate : null;
}

function formatTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatEventDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ScanPage() {
  const { user, status: authStatus, error: authError } = useAuth();
  const [gateName, setGateName] = useState("Main Gate");
  const [manualCode, setManualCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verdict, setVerdict] = useState<ScanVerdict | null>(null);
  const [history, setHistory] = useState<ScanVerdict[]>([]);

  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [nativeScanSupported, setNativeScanSupported] = useState(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastScannedRef = useRef<{ code: string; ts: number }>({ code: "", ts: 0 });
  const verifyingRef = useRef(false);

  useEffect(() => {
    document.title = "Gate Scanner · UniTik";
    setNativeScanSupported(getBarcodeDetectorCtor() !== null);
  }, []);

  const stopCamera = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current !== null) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current !== null) {
      videoRef.current.srcObject = null;
    }
    setCameraOn(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const verifyCode = useCallback(
    async (raw: string) => {
      const code = raw.trim().toUpperCase();
      if (code === "" || verifyingRef.current) return;

      verifyingRef.current = true;
      setVerifying(true);
      const activeGate = gateName.trim() || "Main Gate";
      const nowIso = new Date().toISOString();

      try {
        const res = await api<ScanResponse>("/tickets/scan.php", {
          method: "POST",
          body: JSON.stringify({
            ticket_code: code,
            gate_identifier: activeGate,
          }),
        });

        const nextVerdict: ScanVerdict = res.already_scanned
          ? {
              kind: "duplicate",
              code: res.ticket.ticket_code,
              holderName: res.holder_name,
              holderEmail: res.holder_email,
              ticket: res.ticket,
              firstScannedAt: res.first_scanned_at,
              gate: res.gate_identifier,
              at: nowIso,
            }
          : {
              kind: "admitted",
              code: res.ticket.ticket_code,
              holderName: res.holder_name,
              holderEmail: res.holder_email,
              ticket: res.ticket,
              gate: res.gate_identifier,
              at: nowIso,
            };

        setVerdict(nextVerdict);
        setHistory((prev) => [nextVerdict, ...prev].slice(0, 25));
      } catch (err: unknown) {
        const reason =
          err instanceof ApiError ? err.message : "The campus server didn't answer.";
        const denied: ScanVerdict = {
          kind: "denied",
          code,
          reason,
          gate: activeGate,
          at: nowIso,
        };
        setVerdict(denied);
        setHistory((prev) => [denied, ...prev].slice(0, 25));
      } finally {
        verifyingRef.current = false;
        setVerifying(false);
      }
    },
    [gateName]
  );

  const startCamera = useCallback(async () => {
    setCameraError("");
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera access is not available in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOn(true);

      if (videoRef.current !== null) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const DetectorCtor = getBarcodeDetectorCtor();
      if (DetectorCtor === null) {
        setCameraError(
          "Live camera preview is active, but automatic QR decoding requires Chromium (Chrome/Brave/Edge). Use manual entry below."
        );
        return;
      }

      const detector = new DetectorCtor({ formats: ["qr_code"] });

      const tick = async () => {
        if (streamRef.current === null) return;
        const video = videoRef.current;
        if (video !== null && video.readyState >= 2 && !verifyingRef.current) {
          try {
            const barcodes = await detector.detect(video);
            const rawValue = barcodes[0]?.rawValue?.trim().toUpperCase() ?? "";
            if (rawValue !== "") {
              const now = Date.now();
              const sameCode = lastScannedRef.current.code === rawValue;
              if (!sameCode || now - lastScannedRef.current.ts > 3500) {
                lastScannedRef.current = { code: rawValue, ts: now };
                await verifyCode(rawValue);
              }
            }
          } catch {
            // Ignore transient frame decode errors while camera focuses
          }
        }
        if (streamRef.current !== null) {
          rafRef.current = requestAnimationFrame(() => {
            void tick();
          });
        }
      };

      rafRef.current = requestAnimationFrame(() => {
        void tick();
      });
    } catch {
      stopCamera();
      setCameraError("Camera permission denied or no camera detected on this device.");
    }
  }, [stopCamera, verifyCode]);

  function handleManualSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = manualCode.trim();
    if (trimmed === "") return;
    setManualCode("");
    void verifyCode(trimmed);
  }

  const admittedCount = history.filter((item) => item.kind === "admitted").length;
  const blockedCount = history.length - admittedCount;
  const isPlanner = user?.role === "organizer" || user?.role === "admin";

  return (
    <section className="mx-auto max-w-6xl px-5 py-12 md:py-20">
      <p className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-muted">
        <ScanLine className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} />
        Gate Operations · Live Check-In
      </p>

      {authStatus === "loading" ? (
        <div className="mt-6 border-t border-line pt-8">
          <h1 className="font-display text-4xl font-bold tracking-tight text-fg md:text-5xl">
            Checking gate access…
          </h1>
        </div>
      ) : null}

      {authStatus === "signed-out" ? (
        <div className="mt-6 max-w-xl border border-fg bg-surface p-8 rounded-card shadow-[4px_4px_0px_var(--fg)]">
          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-fg">
            Sign in to scan passes.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted">
            Door check-in is locked to verified campus event planners and super-admins.
          </p>
          <Link
            href="/login"
            className="mt-7 inline-flex h-11 items-center gap-2 rounded-card border border-fg bg-accent px-6 font-mono text-xs font-bold uppercase tracking-[0.18em] text-accent-fg shadow-[3px_3px_0px_var(--fg)] transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            Sign in
            <ArrowUpRight className="h-4 w-4" strokeWidth={1.75} />
          </Link>
        </div>
      ) : null}

      {authStatus === "error" ? (
        <div className="mt-6 max-w-xl border border-accent bg-surface p-8 rounded-card">
          <div className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-accent">
            <ShieldAlert className="h-4 w-4" strokeWidth={1.75} />
            Connection Error
          </div>
          <p role="alert" className="mt-3 text-sm text-muted">
            {authError}
          </p>
        </div>
      ) : null}

      {authStatus === "authenticated" && !isPlanner ? (
        <div className="mt-6 max-w-xl border border-fg bg-surface p-8 rounded-card shadow-[4px_4px_0px_var(--fg)]">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
            Restricted · {user?.role}
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold leading-tight tracking-tight text-fg">
            Only event planners scan at the door.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted">
            Students present their pass from the wallet. Apply for planner access if you are
            running a campus event.
          </p>
          <Link
            href="/wallet"
            className="mt-7 inline-flex h-11 items-center gap-2 rounded-card border border-fg bg-accent px-6 font-mono text-xs font-bold uppercase tracking-[0.18em] text-accent-fg shadow-[3px_3px_0px_var(--fg)]"
          >
            Open Wallet
            <ArrowUpRight className="h-4 w-4" strokeWidth={1.75} />
          </Link>
        </div>
      ) : null}

      {authStatus === "authenticated" && isPlanner ? (
        <div className="mt-5 space-y-10">
          {/* Header + Shift KPIs */}
          <div className="flex flex-col gap-6 border-b border-line pb-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="font-display text-4xl font-bold leading-none tracking-tight text-fg md:text-5xl">
                Door scanner.
              </h1>
              <p className="mt-3 max-w-xl text-base leading-relaxed text-muted">
                Scan student QR stubs or enter pass codes directly. Every check-in is written to
                the immutable gate log.
              </p>
            </div>

            <div className="grid grid-cols-2 divide-x divide-line border border-line bg-surface rounded-card">
              <div className="px-5 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                  Admitted (Shift)
                </p>
                <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-stamp">
                  {admittedCount}
                </p>
              </div>
              <div className="px-5 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                  Blocked (Shift)
                </p>
                <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-accent">
                  {blockedCount}
                </p>
              </div>
            </div>
          </div>

          <div className="grid items-start gap-8 lg:grid-cols-12">
            {/* Left: Camera & Manual Code Desk */}
            <div className="space-y-6 lg:col-span-6">
              <div className="border border-fg bg-surface rounded-card shadow-[4px_4px_0px_var(--fg)]">
                <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-fg">
                    Optical Scanner
                  </span>
                  <button
                    type="button"
                    onClick={cameraOn ? stopCamera : () => void startCamera()}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-card border px-3 font-mono text-[11px] font-bold uppercase tracking-wider transition-colors ${
                      cameraOn
                        ? "border-accent bg-accent text-accent-fg"
                        : "border-fg bg-bg text-fg hover:bg-fg hover:text-bg"
                    }`}
                  >
                    {cameraOn ? (
                      <>
                        <CameraOff className="h-3.5 w-3.5" strokeWidth={1.75} />
                        Stop Camera
                      </>
                    ) : (
                      <>
                        <Camera className="h-3.5 w-3.5" strokeWidth={1.75} />
                        Start Camera
                      </>
                    )}
                  </button>
                </div>

                <div className="p-5 space-y-5">
                  {/* Gate Label Input */}
                  <div>
                    <label
                      htmlFor="gate-id"
                      className="block font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted"
                    >
                      Gate Identifier (Logged on Audit)
                    </label>
                    <input
                      id="gate-id"
                      type="text"
                      maxLength={100}
                      value={gateName}
                      onChange={(e) => setGateName(e.target.value)}
                      placeholder="e.g. Main Gate · Auditorium North"
                      className="mt-1.5 h-10 w-full rounded-card border border-line bg-bg px-3.5 font-mono text-xs text-fg focus:border-fg"
                    />
                  </div>

                  {/* Camera Viewport */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-card border border-fg bg-[#111111]">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className={`h-full w-full object-cover ${cameraOn ? "block" : "hidden"}`}
                    />

                    {!cameraOn ? (
                      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-[#f6f4ef]">
                        <Camera className="h-8 w-8 opacity-75" strokeWidth={1.5} />
                        <p className="font-mono text-xs uppercase tracking-[0.16em]">
                          Camera Standing By
                        </p>
                        <p className="max-w-xs text-xs text-[#c8c2b6]">
                          {nativeScanSupported
                            ? "Click Start Camera to read QR codes automatically, or type/scan a pass code below."
                            : "Auto-QR decoding needs Chrome, Brave, or Edge. Manual code entry and USB scanners work in all browsers."}
                        </p>
                      </div>
                    ) : (
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-10 border-2 border-dashed border-[#e63b19]"
                      />
                    )}
                  </div>

                  {cameraError !== "" ? (
                    <p
                      role="alert"
                      className="rounded-card border border-accent bg-bg px-3.5 py-2.5 text-xs text-fg"
                    >
                      {cameraError}
                    </p>
                  ) : null}

                  {/* Manual / USB Scanner Form */}
                  <form
                    onSubmit={handleManualSubmit}
                    className="border-t border-dashed border-line pt-5"
                  >
                    <label
                      htmlFor="manual-code"
                      className="block font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted"
                    >
                      Manual Entry / USB Barcode Scanner
                    </label>
                    <div className="mt-2 flex gap-2">
                      <input
                        id="manual-code"
                        type="text"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        placeholder="Enter pass code…"
                        autoComplete="off"
                        className="h-11 flex-1 rounded-card border border-line bg-bg px-4 font-mono text-sm uppercase tracking-widest text-fg placeholder:normal-case placeholder:tracking-normal placeholder:text-muted/60 focus:border-fg"
                      />
                      <button
                        type="submit"
                        disabled={verifying || manualCode.trim() === ""}
                        className="inline-flex h-11 items-center gap-1.5 rounded-card border border-fg bg-accent px-5 font-mono text-xs font-bold uppercase tracking-wider text-accent-fg shadow-[3px_3px_0px_var(--fg)] transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50"
                      >
                        {verifying ? "Checking…" : "Verify"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* Right: Instant Gate Verdict + Shift Log */}
            <div className="space-y-6 lg:col-span-6">
              {verdict === null ? (
                <div className="flex min-h-[260px] flex-col items-center justify-center border border-dashed border-line bg-surface p-8 text-center rounded-card">
                  <ScanLine className="h-8 w-8 text-muted" strokeWidth={1.5} />
                  <p className="mt-3 font-mono text-xs uppercase tracking-[0.18em] text-muted">
                    Awaiting First Scan
                  </p>
                  <p className="mt-2 max-w-xs text-sm text-muted">
                    Verified admissions stamp green. Duplicate or invalid codes trigger an instant
                    vermilion halt.
                  </p>
                </div>
              ) : verdict.kind === "admitted" ? (
                <article
                  role="status"
                  className="border-2 border-stamp bg-surface rounded-card shadow-[5px_5px_0px_var(--stamp)]"
                >
                  <div className="flex items-center justify-between bg-stamp px-6 py-4 text-white">
                    <span className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.2em]">
                      <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
                      Admit · Valid Pass
                    </span>
                    <span className="font-mono text-xs tabular-nums opacity-90">
                      {formatTime(verdict.at)}
                    </span>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
                        Pass Code
                      </p>
                      <p className="mt-0.5 font-mono text-xl font-bold tracking-[0.16em] text-fg">
                        {verdict.code}
                      </p>
                    </div>

                    <div className="border-t border-dashed border-line pt-4 space-y-2 text-sm">
                      <p className="font-display text-2xl font-bold text-fg">
                        {verdict.ticket.title}
                      </p>
                      {verdict.holderName ? (
                        <p className="flex items-center gap-2 font-medium text-fg">
                          <UserRound className="h-4 w-4 text-stamp" strokeWidth={1.75} />
                          {verdict.holderName}
                          {verdict.holderEmail ? (
                            <span className="font-mono text-xs text-muted">
                              ({verdict.holderEmail})
                            </span>
                          ) : null}
                        </p>
                      ) : null}
                      <p className="flex items-center gap-2 text-xs text-muted">
                        <MapPin className="h-3.5 w-3.5 text-fg" strokeWidth={1.75} />
                        {verdict.ticket.venue} · {formatEventDate(verdict.ticket.event_date)}
                      </p>
                    </div>
                  </div>
                </article>
              ) : verdict.kind === "duplicate" ? (
                <article
                  role="alert"
                  className="border-2 border-accent bg-surface rounded-card shadow-[5px_5px_0px_var(--accent)]"
                >
                  <div className="flex items-center justify-between bg-accent px-6 py-4 text-accent-fg">
                    <span className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.2em]">
                      <ShieldAlert className="h-4 w-4" strokeWidth={2} />
                      Stop · Already Checked In
                    </span>
                    <span className="font-mono text-xs tabular-nums opacity-90">
                      {formatTime(verdict.at)}
                    </span>
                  </div>
                  <div className="p-6 space-y-4">
                    <p className="font-mono text-xl font-bold tracking-[0.16em] text-fg">
                      {verdict.code}
                    </p>
                    <p className="flex items-center gap-2 font-mono text-xs font-semibold text-accent">
                      <Clock className="h-3.5 w-3.5" strokeWidth={1.75} />
                      First admitted at: {formatTime(verdict.firstScannedAt)}
                    </p>
                    <div className="border-t border-dashed border-line pt-4 space-y-1.5 text-sm">
                      <p className="font-display text-xl font-bold text-fg">
                        {verdict.ticket.title}
                      </p>
                      {verdict.holderName ? (
                        <p className="text-xs text-muted">
                          Holder: <strong className="text-fg">{verdict.holderName}</strong>
                        </p>
                      ) : null}
                    </div>
                  </div>
                </article>
              ) : (
                <article
                  role="alert"
                  className="border-2 border-accent bg-surface rounded-card shadow-[5px_5px_0px_var(--accent)]"
                >
                  <div className="flex items-center justify-between bg-accent px-6 py-4 text-accent-fg">
                    <span className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.2em]">
                      <ShieldAlert className="h-4 w-4" strokeWidth={2} />
                      Entry Denied
                    </span>
                    <span className="font-mono text-xs tabular-nums opacity-90">
                      {formatTime(verdict.at)}
                    </span>
                  </div>
                  <div className="p-6 space-y-2">
                    <p className="font-mono text-base font-bold tracking-widest text-fg">
                      {verdict.code}
                    </p>
                    <p className="text-sm text-muted">{verdict.reason}</p>
                  </div>
                </article>
              )}

              {/* Shift Audit Ledger */}
              <div className="border border-fg bg-surface rounded-card">
                <div className="flex items-center justify-between border-b border-line px-5 py-3">
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-fg">
                    Recent Scans ({history.length})
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                    {gateName.trim() || "Main Gate"}
                  </span>
                </div>

                {history.length === 0 ? (
                  <p className="px-5 py-6 font-mono text-xs text-muted">
                    No scans recorded in this browser shift yet.
                  </p>
                ) : (
                  <ul className="divide-y divide-line max-h-72 overflow-y-auto">
                    {history.map((item, idx) => (
                      <li
                        key={`${item.code}-${item.at}-${idx}`}
                        className="flex items-center justify-between gap-3 px-5 py-3 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-mono font-bold text-fg">{item.code}</p>
                          <p className="truncate text-muted">
                            {item.kind === "denied"
                              ? item.reason
                              : item.holderName || item.ticket.title}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span
                            className={`inline-block border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${
                              item.kind === "admitted"
                                ? "border-stamp text-stamp"
                                : "border-accent text-accent"
                            }`}
                          >
                            {item.kind}
                          </span>
                          <p className="mt-1 font-mono text-[10px] tabular-nums text-muted">
                            {formatTime(item.at)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}