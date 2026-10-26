"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Moon, Sun, Ticket } from "lucide-react";
import { api, type AuthResponse, type Role } from "../lib/api";

const THEME_KEY = "unitik-theme";

function toggleTheme() {
  const root = document.documentElement;
  const next = root.classList.contains("dark") ? "light" : "dark";
  root.classList.toggle("dark", next === "dark");
  root.dataset.theme = next;
  localStorage.setItem(THEME_KEY, next);
}

export function Navbar() {
  const pathname = usePathname();
  const [session, setSession] = useState<{ name: string; role: Role } | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<AuthResponse>("/me.php")
      .then((data) => {
        if (!cancelled) setSession({ name: data.user.full_name, role: data.user.role });
      })
      .catch(() => {
        if (!cancelled) setSession(null);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const deskHref = session?.role === "student" ? "/wallet" : "/events";
  const deskLabel = session?.role === "student" ? "Wallet" : "Events";

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
        <Link href="/" className="flex min-w-0 items-center gap-3 text-fg">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-accent text-accent-fg">
            <Ticket aria-hidden="true" size={18} strokeWidth={1.75} />
          </span>
          <span className="truncate font-display text-xl leading-none tracking-tight">UniTik</span>
        </Link>

        <div className="flex items-center gap-2">
          {session?.role === "student" ? (
            <Link href="/apply" className="inline-flex h-11 items-center text-sm text-fg">
              Apply
            </Link>
          ) : null}
          {session?.role === "admin" ? (
            <Link href="/admin" className="inline-flex h-11 items-center text-sm text-fg">
              Requests
            </Link>
          ) : null}
          {session !== null ? (
            <Link href={deskHref} className="inline-flex h-11 items-center text-sm text-fg">
              {deskLabel}
            </Link>
          ) : null}
          {session !== null ? (
            <Link
              href="/dashboard"
              className="inline-flex h-11 max-w-40 items-center truncate rounded-full border border-line bg-surface px-4 text-sm text-fg"
            >
              {session.name}
            </Link>
          ) : (
            <Link
              href="/login"
              className="inline-flex h-11 items-center rounded-full bg-accent px-4 text-sm text-accent-fg"
            >
              Sign in
            </Link>
          )}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle color theme"
            className="grid h-11 w-11 place-items-center rounded-full border border-line bg-surface text-fg transition-colors duration-200 hover:border-accent"
          >
            <Sun className="hidden dark:block" aria-hidden="true" size={18} strokeWidth={1.75} />
            <Moon className="block dark:hidden" aria-hidden="true" size={18} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </header>
  );
}
