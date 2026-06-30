// Authentication helpers — password hashing, JWT signing/verifying,
// HTTP-only cookie management. Keeps every auth concern out of the
// route handlers so each route stays a thin glue layer.
//
// Security notes:
// - bcrypt cost factor 10 is the conventional default for 2024+.
// - JWT_SECRET must come from the environment. We refuse to fall
//   back to a hard-coded default in production.
// - Cookies are HTTP-only, SameSite=Lax, Secure in production.
//   SameSite=Lax is the right call for an app where forms/links
//   trigger authenticated requests from the same origin (login,
//   logout, /api/auth/me on page nav) but external cross-site
//   POSTs should be rejected.
// - The token payload is intentionally minimal: userId + email.
//   We re-read the user from the DB on /api/auth/me so revocations
//   (delete account, password reset) take effect immediately.

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const COOKIE_NAME = "boss_auth";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface AuthTokenPayload {
  userId: string;
  email: string;
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    if (process.env.NODE_ENV === "production") {
      // Fail loud in production — a missing/weak JWT_SECRET would
      // silently accept forged tokens if we fell back to a default.
      throw new Error("JWT_SECRET environment variable is required in production");
    }
    // Dev fallback so the dev server boots without a .env file.
    return "dev-only-insecure-secret-change-me-please";
  }
  return secret;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: COOKIE_MAX_AGE_SECONDS });
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getSecret()) as AuthTokenPayload;
    if (typeof decoded.userId !== "string" || typeof decoded.email !== "string") {
      return null;
    }
    return { userId: decoded.userId, email: decoded.email };
  } catch {
    return null;
  }
}

export async function setAuthCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}

export async function clearAuthCookie(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function readAuthCookie(): Promise<AuthTokenPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyAuthToken(token);
}

export const AUTH_COOKIE_NAME = COOKIE_NAME;