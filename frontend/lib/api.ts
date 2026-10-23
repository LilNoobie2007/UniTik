/*
 * File: frontend/lib/api.ts
 * UNITIK CORE ARCHITECTURE MANDATE
 * - Frontend: Next.js / BFF
 * - Backend: PHP 8+ (PDO/PostgreSQL)
 * - DO NOT use client-side database calls.
 * - DO NOT trust client inputs. Always sanitize.
 * - Preserve existing logic during modifications.
 *
 * The browser never sends a user id. The PHP session cookie is the identity.
 */

export type ApiError = Error & { status?: number };

const base = () => process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${base()}${path}`, {
    method: body === undefined ? "GET" : "POST",
    credentials: "include",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const payload = (await response.json()) as {
    status?: string;
    message?: string;
    data?: T;
  };

  if (!response.ok || payload.status === "error") {
    const error = new Error(payload.message || "Request failed.") as ApiError;
    error.status = response.status;
    throw error;
  }

  return payload.data as T;
}
