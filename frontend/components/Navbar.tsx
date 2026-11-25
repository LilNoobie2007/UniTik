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

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
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

  const links: { href: string; label: string }[] = [];
  if (session?.role === "student") links.push({ href: "/apply", label: "Apply" });
  if (session?.role === "admin") links.push({ href: "/admin", label: "Requests" });
  if (session !== null) links.push({ href: deskHref, label: deskLabel });

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
        <Link href="/" className="flex min-w-0 items-center gap-3 text-fg">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-fg bg-fg text-bg">
            <Ticket aria-hidden="true" size={18} strokeWidth={1.75} />
          </span>
          <span
            className={`truncate font-display text-xl leading-none tracking-tight ${
              pathname === "/" ? "border-b border-fg" : ""
            }`}
          >
            UniTik
          </span>
        </Link>

        <nav className="flex items-center gap-1" aria-label="Primary">
          {links.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex h-11 items-center border-b px-2 text-sm ${
                  active ? "border-fg font-medium text-fg" : "border-transparent text-muted"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          {session !== null ? (
            <Link
              href="/dashboard"
              aria-current={isActive(pathname, "/dashboard") ? "page" : undefined}
              className={`inline-flex h-11 max-w-40 items-center truncate rounded-md border px-3 text-sm ${
                isActive(pathname, "/dashboard")
                  ? "border-fg bg-surface font-medium text-fg"
                  : "border-line bg-surface text-fg"
              }`}
            >
              {session.name}
            </Link>
          ) : (
            <Link
              href="/login"
              aria-current={isActive(pathname, "/login") ? "page" : undefined}
              className="inline-flex h-11 items-center rounded-md border border-fg bg-accent px-4 text-sm text-accent-fg shadow-[3px_3px_0px_#111111] active:translate-x-px active:translate-y-px active:shadow-none"
            >
              Sign in
            </Link>
          )}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle color theme"
            className="grid h-11 w-11 place-items-center rounded-md border border-line bg-surface text-fg"
          >
            <Sun className="hidden dark:block" aria-hidden="true" size={18} strokeWidth={1.75} />
            <Moon className="block dark:hidden" aria-hidden="true" size={18} strokeWidth={1.75} />
          </button>
        </nav>
      </div>
    </header>
  );
}
