/*
 * File: frontend/app/layout.tsx
 * UNITIK CORE ARCHITECTURE MANDATE
 * - Frontend: Next.js / BFF
 * - Backend: PHP 8+ (PDO/PostgreSQL)
 * - DO NOT use client-side database calls.
 * - DO NOT trust client inputs. Always sanitize.
 * - Preserve existing logic during modifications.
 */

import type { ReactNode } from "react";
import Link from "next/link";
import { AccountMenu } from "./components/AccountMenu";
import "./globals.css";

export const metadata = {
  title: "UniTik",
  description: "Campus tickets for students. Book a seat. Carry the code.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;600&family=Fraunces:opsz,wght@9..144,500&family=IBM+Plex+Mono&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="shell">
          <header className="top">
            <Link href="/" className="brand">
              Uni<span>Tik</span>
            </Link>
            <nav className="nav">
              <Link href="/#events">Events</Link>
              <Link href="/#wallet">My tickets</Link>
              <Link href="/scanner">Gate</Link>
              <Link href="/host">Host</Link>
              <Link href="/admin">Admin</Link>
              <AccountMenu />
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
