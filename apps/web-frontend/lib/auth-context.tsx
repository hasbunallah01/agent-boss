"use client";

// Auth context — wraps the app, exposes the current user + login/register helpers.
// Uses the JWT cookie set by /api/auth/verify (OTP) or /api/auth/login (password).
// The cookie is HTTP-only and SameSite=lax, so it rides along with every fetch
// (credentials: include).

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { auth, ApiError } from "./api";
import type { User } from "./types";

interface AuthState {
  user: User | null;
  status: "loading" | "authenticated" | "unauthenticated";
  refresh: () => Promise<void>;
  // OTP flow
  login: (email: string, code: string) => Promise<User>;
  requestOtp: (email: string) => Promise<void>;
  // Password flow
  register: (body: {
    email: string;
    password: string;
    displayName?: string;
  }) => Promise<User>;
  loginWithPassword: (email: string, password: string) => Promise<User>;
  // Password reset
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<User>;
  // Account management
  saveAvatar: (avatarUrl: string, displayName?: string) => Promise<User>;
  updateUser: (user: User) => void;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");

  const refresh = useCallback(async () => {
    try {
      const r = await auth.me();
      if (r.ok) {
        setUser(r.user);
        setStatus("authenticated");
      } else {
        setUser(null);
        setStatus("unauthenticated");
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setUser(null);
        setStatus("unauthenticated");
      } else {
        // Network error — leave the previous state, don't sign the user out
        // eslint-disable-next-line no-console
        console.warn("[auth] refresh failed:", e);
        if (status === "loading") setStatus("unauthenticated");
      }
    }
  }, [status]);

  const requestOtp = useCallback(async (email: string) => {
    await auth.requestOtp(email);
  }, []);

  const login = useCallback(async (email: string, code: string) => {
    const r = await auth.verifyOtp(email, code);
    if (!r.ok) throw new Error(r.message);
    setUser(r.user);
    setStatus("authenticated");
    return r.user;
  }, []);

  const register = useCallback(
    async (body: { email: string; password: string; displayName?: string }) => {
      const r = await auth.register(body);
      if (!r.ok) throw new Error(r.message);
      setUser(r.user);
      setStatus("authenticated");
      return r.user;
    },
    []
  );

  const loginWithPassword = useCallback(async (email: string, password: string) => {
    const r = await auth.login({ email, password });
    if (!r.ok) throw new Error(r.message);
    setUser(r.user);
    setStatus("authenticated");
    return r.user;
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    await auth.forgotPassword(email);
  }, []);

  const resetPassword = useCallback(async (token: string, newPassword: string) => {
    const r = await auth.resetPassword({ token, newPassword });
    if (!r.ok) throw new Error(r.message);
    setUser(r.user);
    setStatus("authenticated");
    return r.user;
  }, []);

  const saveAvatar = useCallback(
    async (avatarUrl: string, displayName?: string) => {
      const { account } = await import("./api");
      const r = await account.saveAvatar({ avatarUrl, displayName });
      if (!r.ok) throw new Error(r.message);
      setUser(r.user);
      return r.user;
    },
    []
  );

  const updateUser = useCallback((u: User) => {
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    try {
      await auth.logout();
    } catch {
      // ignore — we clear locally regardless
    }
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      status,
      refresh,
      login,
      requestOtp,
      register,
      loginWithPassword,
      requestPasswordReset,
      resetPassword,
      saveAvatar,
      updateUser,
      logout,
    }),
    [
      user,
      status,
      refresh,
      login,
      requestOtp,
      register,
      loginWithPassword,
      requestPasswordReset,
      resetPassword,
      saveAvatar,
      updateUser,
      logout,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}