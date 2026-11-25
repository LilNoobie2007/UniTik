"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { ApiError, api, type AuthResponse, type User } from "./api";

export type AuthStatus = "loading" | "authenticated" | "signed-out" | "error";

type AuthContextValue = {
  user: User | null;
  status: AuthStatus;
  error: string;
  refresh: () => Promise<User | null>;
  clearSession: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

let inflightMe: Promise<AuthResponse> | null = null;

function fetchMe(force = false): Promise<AuthResponse> {
  if (force || inflightMe === null) {
    inflightMe = api<AuthResponse>("/me.php").finally(() => {
      inflightMe = null;
    });
  }
  return inflightMe;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [error, setError] = useState("");

  const load = useCallback(async (force = false): Promise<User | null> => {
    try {
      const data = await fetchMe(force);
      setUser(data.user);
      setError("");
      setStatus("authenticated");
      return data.user;
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) {
        setUser(null);
        setError("");
        setStatus("signed-out");
        return null;
      }
      setUser(null);
      setError(err instanceof ApiError ? err.message : "The campus server didn't answer.");
      setStatus("error");
      return null;
    }
  }, []);

  useEffect(() => {
    let active = true;

    fetchMe(false)
      .then((data) => {
        if (!active) return;
        setUser(data.user);
        setError("");
        setStatus("authenticated");
      })
      .catch((err: unknown) => {
        if (!active) return;
        if (err instanceof ApiError && err.status === 401) {
          setUser(null);
          setError("");
          setStatus("signed-out");
          return;
        }
        setUser(null);
        setError(err instanceof ApiError ? err.message : "The campus server didn't answer.");
        setStatus("error");
      });

    return () => {
      active = false;
    };
  }, []);

  const refresh = useCallback(() => load(true), [load]);

  const clearSession = useCallback(() => {
    setUser(null);
    setError("");
    setStatus("signed-out");
  }, []);

  return (
    <AuthContext.Provider value={{ user, status, error, refresh, clearSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error("useAuth must be used inside <AuthProvider>.");
  }
  return ctx;
}