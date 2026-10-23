"use client";

/*
 * File: frontend/app/admin/page.tsx
 * UNITIK CORE ARCHITECTURE MANDATE
 * - Frontend: Next.js / BFF
 * - Backend: PHP 8+ (PDO/PostgreSQL)
 * - DO NOT use client-side database calls.
 * - DO NOT trust client inputs. Always sanitize.
 * - Preserve existing logic during modifications.
 *
 * Campus admin desk. Role changes are posted for the server to authorize.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

type CampusUser = {
  id: string;
  full_name: string;
  email: string;
  role: "student" | "organizer" | "admin";
  roll_number: string | null;
  committee_name: string | null;
  account_status: "active" | "suspended";
  is_verified: boolean;
};

const ROLES: CampusUser["role"][] = ["student", "organizer", "admin"];

export default function AdminPage() {
  const [users, setUsers] = useState<CampusUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canClaim, setCanClaim] = useState(false);
  const [myId, setMyId] = useState<string | undefined>(undefined);
  const [committees, setCommittees] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const rows = await api<CampusUser[]>("/modules/admin/users.php");
    setUsers(rows);
    setCommittees(Object.fromEntries(rows.map((person) => [person.id, person.committee_name ?? ""])));
    setCanClaim(false);
  }, []);

  useEffect(() => {
    const raw = sessionStorage.getItem("unitik_profile");
    if (!raw) return;
    try {
      setMyId((JSON.parse(raw) as { id?: string }).id);
    } catch {
      setMyId(undefined);
    }
  }, []);

  useEffect(() => {
    void load().catch((err: unknown) => {
      const status = (err as { status?: number }).status;
      setCanClaim(status === 403);
      setError(err instanceof Error ? err.message : "Admin desk unavailable.");
    });
  }, [load]);

  async function claim() {
    setError(null);
    try {
      await api("/modules/admin/claim.php", {});
      const raw = sessionStorage.getItem("unitik_profile");
      if (raw) {
        const profile = JSON.parse(raw) as { role?: string };
        profile.role = "admin";
        sessionStorage.setItem("unitik_profile", JSON.stringify(profile));
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not claim admin.");
    }
  }

  async function saveCommittee(userId: string) {
    setError(null);
    try {
      await api("/modules/admin/committee.php", {
        user_id: userId,
        committee_name: committees[userId] ?? "",
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the committee name.");
    }
  }
  async function changeRole(userId: string, role: CampusUser["role"]) {
    setError(null);
    try {
      await api("/modules/admin/role.php", { user_id: userId, role });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change the role.");
    }
  }

  async function changeVerification(userId: string, isVerified: boolean) {
    setError(null);
    try {
      await api("/modules/admin/verify.php", { user_id: userId, is_verified: isVerified });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update verification.");
    }
  }
  async function changeStatus(userId: string, accountStatus: CampusUser["account_status"]) {
    setError(null);
    try {
      await api("/modules/admin/status.php", { user_id: userId, account_status: accountStatus });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the pass.");
    }
  }

  return (
    <main className="page">
      <p className="kicker">RBAC</p>
      <h1>Campus admin</h1>
      <p className="lede">
        Promote a student to organizer, verify a pass, or suspend one. The server keeps the last admin and refuses changes to your own row.
      </p>
      {error && <p className="error">{error}</p>}
      {users === null && canClaim && (
        <div className="panel" style={{ maxWidth: 480 }}>
          <p>No admin desk is open to this account.</p>
          <button className="btn" type="button" onClick={() => void claim()}>
            Claim campus admin
          </button>
          <p className="meta">
            This works only while the campus has zero admins. Otherwise <Link href="/login">sign in</Link> as an admin.
          </p>
        </div>
      )}
      {users && (
        <div className="stack">
          {users.map((person) => (
            <article key={person.id} className="card">
              <div className="row">
                <div>
                  <strong>{person.full_name}</strong>
                  <p className="meta">{person.email}</p>
                  <p className="meta">{person.roll_number ?? person.committee_name ?? "—"}</p>
                </div>
                <span className="badge">{person.account_status}</span>
                <span className="badge">{person.is_verified ? "Verified" : "Unverified"}</span>
              </div>
              <div className="row" style={{ marginTop: 12 }}>
                <label htmlFor={`committee-${person.id}`}>Committee</label>
                <input
                  id={`committee-${person.id}`}
                  value={committees[person.id] ?? ""}
                  onChange={(event) =>
                    setCommittees((current) => ({ ...current, [person.id]: event.target.value }))
                  }
                />
                <button className="btn secondary" type="button" onClick={() => void saveCommittee(person.id)}>
                  Save name
                </button>
              </div>
              <div className="row" style={{ marginTop: 12 }}>
                <label htmlFor={`role-${person.id}`}>Role</label>
                <select
                  id={`role-${person.id}`}
                  value={person.role}
                  disabled={person.id === myId}
                  onChange={(event) => void changeRole(person.id, event.target.value as CampusUser["role"])}
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                <button
                  className="btn secondary"
                  type="button"
                  disabled={person.id === myId}
                  onClick={() =>
                    void changeStatus(person.id, person.account_status === "active" ? "suspended" : "active")
                  }
                >
                  {person.account_status === "active" ? "Suspend" : "Restore"}
                </button>
                <button
                  className="btn secondary"
                  type="button"
                  onClick={() => void changeVerification(person.id, !person.is_verified)}
                >
                  {person.is_verified ? "Remove verification" : "Verify pass"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
