"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Check,
  Clock,
  FileText,
  Inbox,
  Search,
  ShieldAlert,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { ApiError, api, type Role, type User } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";

type Application = {
  id: string;
  full_name: string;
  email: string;
  corporate_details: string;
  id_card_path: string;
  status: string;
  created_at: string;
};

type AdminTab = "requests" | "users";
type RoleFilter = "all" | Role;

function failureMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return "The campus server didn't answer.";
}

function formatWhen(value: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(value: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function fileName(path: string): string {
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || "ID on file";
}

export default function AdminPage() {
  const { user, status: authStatus, error: authError } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("requests");
  const [applications, setApplications] = useState<Application[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingId, setPendingId] = useState("");
  const [roleBusyId, setRoleBusyId] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    document.title = "Admin Desk · UniTik";
  }, []);

  useEffect(() => {
    if (authStatus !== "authenticated" || user?.role !== "admin") return;

    let cancelled = false;
    setDataLoading(true);
    setError("");

    Promise.all([
      api<{ ok: true; applications: Application[] }>("/applications/list_applications.php"),
      api<{ ok: true; users: User[] }>("/admin/users.php"),
    ])
      .then(([appRes, userRes]) => {
        if (cancelled) return;
        setApplications(appRes.applications);
        setUsers(userRes.users);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(failureMessage(err));
      })
      .finally(() => {
        if (!cancelled) setDataLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authStatus, user?.role]);

  async function review(id: string, action: "approve" | "reject") {
    setPendingId(id);
    setError("");
    try {
      await api("/applications/review_application.php", {
        method: "POST",
        body: JSON.stringify({ id, action }),
      });
      setApplications((current) => current.filter((item) => item.id !== id));
      if (action === "approve") {
        const userRes = await api<{ ok: true; users: User[] }>("/admin/users.php");
        setUsers(userRes.users);
      }
    } catch (err) {
      setError(failureMessage(err));
    } finally {
      setPendingId("");
    }
  }

  async function toggleOrganizerRole(account: User) {
    const nextRole = account.role === "admin" ? "organizer" : "admin";
    const promptText =
      nextRole === "admin"
        ? `Grant Super-Admin privileges to ${account.email}?`
        : `Revoke Super-Admin privileges for ${account.email} and revert to Organizer?`;

    if (!window.confirm(promptText)) return;

    setRoleBusyId(account.id);
    setError("");
    try {
      const res = await api<{ ok: true; user: User }>("/admin/update_role.php", {
        method: "POST",
        body: JSON.stringify({ id: account.id, role: nextRole }),
      });
      setUsers((current) =>
        current.map((item) =>
          item.id === res.user.id && item.role !== "student" ? res.user : item
        )
      );
    } catch (err) {
      setError(failureMessage(err));
    } finally {
      setRoleBusyId("");
    }
  }

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (q === "") return true;
      return u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    });
  }, [users, roleFilter, searchQuery]);

  const roleCounts = useMemo(() => {
    return users.reduce(
      (acc, u) => {
        acc[u.role] = (acc[u.role] ?? 0) + 1;
        return acc;
      },
      { student: 0, organizer: 0, admin: 0 } as Record<Role, number>
    );
  }, [users]);

  const isLoading =
    authStatus === "loading" ||
    (authStatus === "authenticated" && user?.role === "admin" && dataLoading);
  const displayError = authStatus === "error" ? authError : error;

  return (
    <section className="mx-auto max-w-6xl px-5 py-12 md:py-20">
      <p className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-muted">
        <ShieldCheck className="h-3.5 w-3.5 text-accent" strokeWidth={1.75} />
        Super-Admin Desk · Governance
      </p>

      {isLoading ? (
        <div className="mt-6 border-t border-line pt-8">
          <h1 className="font-display text-4xl font-bold tracking-tight text-fg md:text-5xl">
            Loading admin ledger…
          </h1>
          <p className="mt-3 font-mono text-xs uppercase tracking-wider text-muted">
            Syncing pending requests &amp; campus directory
          </p>
        </div>
      ) : null}

      {authStatus === "signed-out" ? (
        <div className="mt-6 max-w-xl border border-fg bg-surface p-8 rounded-card shadow-[4px_4px_0px_var(--fg)]">
          <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-fg">
            Sign in to review.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted">
            Organizer approval and user directory access require an active super-admin session.
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
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-fg">
            Admin desk didn&apos;t load.
          </h1>
          <p role="alert" className="mt-3 text-sm text-muted">
            {displayError}
          </p>
        </div>
      ) : null}

      {authStatus === "authenticated" && user !== null && user.role !== "admin" ? (
        <div className="mt-6 max-w-xl border border-fg bg-surface p-8 rounded-card shadow-[4px_4px_0px_var(--fg)]">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
            Restricted · {user.role}
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold leading-tight tracking-tight text-fg">
            Only a super-admin reviews these.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted">
            Students apply from their own account. Planners publish events. Approval stays with an
            organizer whose account status is admin.
          </p>
        </div>
      ) : null}

      {!isLoading && authStatus === "authenticated" && user !== null && user.role === "admin" ? (
        <div className="mt-5 space-y-8">
          {/* Editorial Header + KPI Strip */}
          <div className="flex flex-col gap-6 border-b border-line pb-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="font-display text-4xl font-bold leading-none tracking-tight text-fg md:text-5xl">
                Campus control.
              </h1>
              <p className="mt-3 max-w-xl text-base leading-relaxed text-muted">
                Review student-to-organizer requests and audit every active account across the
                split-table directory.
              </p>
            </div>

            <div className="grid grid-cols-3 divide-x divide-line border border-line bg-surface rounded-card">
              <div className="px-4 py-3 sm:px-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                  Pending
                </p>
                <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-accent">
                  {applications.length}
                </p>
              </div>
              <div className="px-4 py-3 sm:px-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                  Students
                </p>
                <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-fg">
                  {roleCounts.student}
                </p>
              </div>
              <div className="px-4 py-3 sm:px-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                  Planners
                </p>
                <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-fg">
                  {roleCounts.organizer + roleCounts.admin}
                </p>
              </div>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div
              role="tablist"
              aria-label="Admin sections"
              className="inline-flex border border-fg bg-surface p-1 rounded-card"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "requests"}
                onClick={() => setActiveTab("requests")}
                className={`inline-flex h-9 items-center gap-2 rounded-sm px-4 font-mono text-xs font-bold uppercase tracking-wider transition-colors ${
                  activeTab === "requests" ? "bg-fg text-bg" : "text-muted hover:text-fg"
                }`}
              >
                <Inbox className="h-3.5 w-3.5" strokeWidth={1.75} />
                Requests ({applications.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "users"}
                onClick={() => setActiveTab("users")}
                className={`inline-flex h-9 items-center gap-2 rounded-sm px-4 font-mono text-xs font-bold uppercase tracking-wider transition-colors ${
                  activeTab === "users" ? "bg-fg text-bg" : "text-muted hover:text-fg"
                }`}
              >
                <Users className="h-3.5 w-3.5" strokeWidth={1.75} />
                Users ({users.length})
              </button>
            </div>
          </div>

          {displayError !== "" ? (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-card border border-accent bg-surface px-4 py-3 text-sm text-fg"
            >
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={1.75} />
              <span>{displayError}</span>
            </div>
          ) : null}

          {/* TAB 1: ORGANIZER REQUESTS */}
          {activeTab === "requests" ? (
            applications.length === 0 ? (
              <div className="flex items-center gap-3 border border-dashed border-line bg-surface p-10 rounded-card text-muted">
                <Inbox className="h-5 w-5 shrink-0 text-fg" strokeWidth={1.75} />
                <p className="font-mono text-xs uppercase tracking-[0.16em]">
                  Queue clear · No pending organizer applications.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-fg bg-surface rounded-card shadow-[4px_4px_0px_var(--fg)]">
                <table className="w-full min-w-[720px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-fg bg-bg font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
                      <th className="px-5 py-3.5 font-semibold">Applicant</th>
                      <th className="px-5 py-3.5 font-semibold">Committee / Details</th>
                      <th className="px-5 py-3.5 font-semibold">ID Document</th>
                      <th className="px-5 py-3.5 font-semibold">Submitted</th>
                      <th className="px-5 py-3.5 text-right font-semibold">Decision</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {applications.map((application) => {
                      const isBusy = pendingId === application.id;
                      return (
                        <tr
                          key={application.id}
                          className="align-top transition-colors hover:bg-bg/50"
                        >
                          <td className="px-5 py-5">
                            <p className="font-display text-lg font-bold leading-snug text-fg">
                              {application.full_name}
                            </p>
                            <p className="mt-0.5 font-mono text-xs text-muted">
                              {application.email}
                            </p>
                          </td>

                          <td className="max-w-md px-5 py-5">
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-fg">
                              {application.corporate_details}
                            </p>
                          </td>

                          <td className="px-5 py-5">
                            <span className="inline-flex items-center gap-1.5 border border-line bg-bg px-2.5 py-1 font-mono text-[11px] text-fg rounded-card">
                              <FileText
                                className="h-3.5 w-3.5 shrink-0 text-muted"
                                strokeWidth={1.75}
                              />
                              <span className="max-w-[160px] truncate">
                                {fileName(application.id_card_path)}
                              </span>
                            </span>
                          </td>

                          <td className="px-5 py-5">
                            <span className="inline-flex items-center gap-1.5 font-mono text-xs tabular-nums text-muted whitespace-nowrap">
                              <Clock className="h-3.5 w-3.5 shrink-0 text-fg" strokeWidth={1.75} />
                              {formatWhen(application.created_at)}
                            </span>
                          </td>

                          <td className="px-5 py-5">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => review(application.id, "approve")}
                                className="inline-flex h-9 items-center gap-1.5 rounded-card border border-stamp bg-stamp px-3.5 font-mono text-[11px] font-bold uppercase tracking-wider text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                              >
                                <Check className="h-3.5 w-3.5" strokeWidth={2} />
                                Approve
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => review(application.id, "reject")}
                                className="inline-flex h-9 items-center gap-1.5 rounded-card border border-accent bg-transparent px-3.5 font-mono text-[11px] font-bold uppercase tracking-wider text-accent transition-colors hover:bg-accent hover:text-accent-fg disabled:opacity-50"
                              >
                                <X className="h-3.5 w-3.5" strokeWidth={2} />
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : null}

          {/* TAB 2: USERS DIRECTORY */}
          {activeTab === "users" ? (
            <div className="space-y-4">
              {/* Filter + Search Bar */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-1.5">
                  {(["all", "student", "organizer", "admin"] as RoleFilter[]).map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setRoleFilter(role)}
                      className={`h-9 rounded-card border px-3 font-mono text-[11px] font-bold uppercase tracking-wider transition-colors ${
                        roleFilter === role
                          ? "border-fg bg-fg text-bg"
                          : "border-line bg-surface text-muted hover:border-fg hover:text-fg"
                      }`}
                    >
                      {role === "all" ? `All (${users.length})` : `${role} (${roleCounts[role]})`}
                    </button>
                  ))}
                </div>

                <label className="relative block sm:w-72">
                  <span className="sr-only">Filter users by name or email</span>
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                    strokeWidth={1.75}
                  />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name or email…"
                    className="h-9 w-full rounded-card border border-line bg-surface pl-9 pr-3 text-sm text-fg placeholder:text-muted/60 focus:border-fg"
                  />
                </label>
              </div>

              {filteredUsers.length === 0 ? (
                <div className="border border-dashed border-line bg-surface p-10 rounded-card text-center font-mono text-xs uppercase tracking-[0.16em] text-muted">
                  No accounts match your filter.
                </div>
              ) : (
                <div className="overflow-x-auto border border-fg bg-surface rounded-card shadow-[4px_4px_0px_var(--fg)]">
                  <table className="w-full min-w-[740px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-fg bg-bg font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
                        <th className="px-5 py-3.5 font-semibold">Full Name</th>
                        <th className="px-5 py-3.5 font-semibold">Email</th>
                        <th className="px-5 py-3.5 font-semibold">Role</th>
                        <th className="px-5 py-3.5 font-semibold">Access Control</th>
                        <th className="px-5 py-3.5 text-right font-semibold">Joined</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {filteredUsers.map((account) => (
                        <tr
                          key={`${account.role}-${account.id}`}
                          className="transition-colors hover:bg-bg/50"
                        >
                          <td className="px-5 py-4 font-display text-base font-bold text-fg">
                            {account.full_name}
                          </td>
                          <td className="px-5 py-4 font-mono text-xs text-muted">
                            {account.email}
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center border px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] ${
                                account.role === "admin"
                                  ? "border-accent text-accent"
                                  : account.role === "organizer"
                                    ? "border-stamp text-stamp"
                                    : "border-line text-fg"
                              }`}
                            >
                              {account.role}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            {account.role === "student" ? (
                              <span className="font-mono text-[11px] text-muted">
                                Via Applications
                              </span>
                            ) : account.id === user.id ? (
                              <span className="font-mono text-[11px] uppercase tracking-wider text-muted">
                                Current Session
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={roleBusyId === account.id}
                                onClick={() => toggleOrganizerRole(account)}
                                className={`inline-flex h-8 items-center rounded-card border px-3 font-mono text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50 ${
                                  account.role === "admin"
                                    ? "border-accent text-accent hover:bg-accent hover:text-accent-fg"
                                    : "border-fg bg-bg text-fg hover:bg-fg hover:text-bg"
                                }`}
                              >
                                {roleBusyId === account.id
                                  ? "Saving…"
                                  : account.role === "admin"
                                    ? "Revoke Admin"
                                    : "Grant Admin"}
                              </button>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right font-mono text-xs tabular-nums text-muted">
                            {formatDate(account.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}