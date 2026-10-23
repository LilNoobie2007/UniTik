"use client";

/*
 * File: frontend/app/components/TicketQr.tsx
 * UNITIK CORE ARCHITECTURE MANDATE
 * - Frontend: Next.js / BFF
 * - Backend: PHP 8+ (PDO/PostgreSQL)
 * - DO NOT use client-side database calls.
 * - DO NOT trust client inputs. Always sanitize.
 * - Preserve existing logic during modifications.
 *
 * Renders UNITIK:{ticket_hash}. The gate already accepts that prefix.
 */

import { useMemo } from "react";
import { qrModules } from "@/lib/qr";

export function TicketQr({ payload }: { payload: string }) {
  const modules = useMemo(() => qrModules(payload), [payload]);
  const size = modules.length;
  const quiet = 4;
  const cells: { row: number; col: number }[] = [];
  modules.forEach((row, rowIndex) => {
    row.forEach((dark, colIndex) => {
      if (dark) cells.push({ row: rowIndex, col: colIndex });
    });
  });

  return (
    <svg
      className="qr"
      viewBox={`${-quiet} ${-quiet} ${size + quiet * 2} ${size + quiet * 2}`}
      role="img"
      aria-label={`Ticket code ${payload}`}
    >
      <rect x={-quiet} y={-quiet} width={size + quiet * 2} height={size + quiet * 2} fill="#e7e1d4" />
      {cells.map((cell) => (
        <rect key={`${cell.row}-${cell.col}`} x={cell.col} y={cell.row} width={1} height={1} fill="#161410" />
      ))}
    </svg>
  );
}
