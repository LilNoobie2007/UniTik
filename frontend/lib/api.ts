/**
 * UniTik API client.
 * Session auth is the HttpOnly cookie. Do not write a user id to localStorage or a JS cookie.
 */

export const API_BASE = "http://localhost/UniTik/backend";

export type Role = "student" | "organizer" | "admin";

export type User = {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  created_at: string;
};

export type AuthResponse = {
  ok: true;
  user: User;
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function endpoint(path: string): string {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${suffix}`;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  const isForm = typeof FormData !== "undefined" && init.body instanceof FormData;
  if (init.body !== undefined && !isForm && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(endpoint(path), {
    ...init,
    headers,
    credentials: "include",
  });

  let payload: unknown = null;
  const text = await response.text();
  if (text !== "") {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const message =
      payload !== null &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : "Request failed.";
    throw new ApiError(response.status, message);
  }

  return payload as T;
}
