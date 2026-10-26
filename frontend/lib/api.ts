/**
 * UniTik API Client Utility
 * 
 * Implements the Zero-Trust architecture by relying strictly on HttpOnly cookies
 * for session auth. The client never handles, stores, or transmits raw user IDs.
 * 
 * @module ApiClient
 * @see README.md for dual-identity session architecture notes.
 */

export const API_BASE = "http://localhost/UniTik/backend";

/**
 * Valid strict roles defined in the Supabase schema.
 */
export type Role = "student" | "organizer" | "admin";

/**
 * Standardized user payload returned by the BFF (Backend-For-Frontend).
 */
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

/**
 * Custom Error wrapper to capture HTTP status codes natively.
 */
export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * Normalizes endpoint paths to prevent double-slash routing errors.
 * 
 * @param path - The relative route (e.g., '/login.php' or 'login.php')
 */
function endpoint(path: string): string {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${suffix}`;
}

/**
 * Core API Fetch Wrapper
 * 
 * Intercepts all frontend-to-backend communication.
 * Automatically enforces HttpOnly credentials for dual-identity 
 * session management and handles JSON parsing gracefully.
 * 
 * @param path - The relative PHP endpoint
 * @param init - Optional fetch configuration overrides
 * @returns Strongly typed generic payload data
 * @throws {ApiError} If the server returns a non-2xx status
 */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  
  // Enforce JSON expectations for the backend API
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  
  // Handle multipart/form-data organically without overwriting boundaries
  const isForm = typeof FormData !== "undefined" && init.body instanceof FormData;
  if (init.body !== undefined && !isForm && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Execute the secure cross-origin request
  const response = await fetch(endpoint(path), {
    ...init,
    headers,
    credentials: "include", // CRITICAL: Ensures PHP sessions stick across requests
  });

  let payload: unknown = null;
  const text = await response.text();
  
  // Graceful JSON parsing to prevent crash loops on HTML error pages
  if (text !== "") {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = null;
    }
  }

  // Trap and format server-side exceptions
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