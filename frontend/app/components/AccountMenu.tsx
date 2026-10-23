"use client";

/*
 * File: frontend/app/components/AccountMenu.tsx
 * UNITIK CORE ARCHITECTURE MANDATE
 * - Frontend: Next.js / BFF
 * - Backend: PHP 8+ (PDO/PostgreSQL)
 * - DO NOT use client-side database calls.
 * - DO NOT trust client inputs. Always sanitize.
 * - Preserve existing logic during modifications.
 *
 * The name in the header is whatever me.php returns.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type SessionUser = {
  id: string;
  full_name: string;
  role: string;
};

export function AccountMenu() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    api<SessionUser>("/modules/auth/me.php")
      .then((profile) => {
        setUser(profile);
        sessionStorage.setItem("unitik_profile", JSON.stringify(profile));
      })
      .catch(() => {
        setUser(null);
        sessionStorage.removeItem("unitik_profile");
      });
  }, []);

  async function signOut() {
    try {
      await api("/modules/auth/logout.php", {});
    } catch {
      // The cookie clear is best-effort; drop the local label either way.
    }
    sessionStorage.removeItem("unitik_profile");
    setUser(null);
    router.push("/login");
    router.refresh();
  }

  if (!user) {
    return <Link href="/login">Sign in</Link>;
  }

  return (
    <>
      <span>{user.full_name}</span>
      <Link href="/account">Password</Link>
      <button className="btn secondary" type="button" onClick={() => void signOut()}>
        Sign out
      </button>
    </>
  );
}
