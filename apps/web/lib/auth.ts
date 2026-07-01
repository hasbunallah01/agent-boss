// Session helpers — JWT signing/verifying + HTTP-only cookie management.
// After the OTP switch, this module is purely about the session that the
// verify route creates. Password hashing has been removed (handled by Resend).
//
// Security notes:
// - JWT_SECRET must come from the environment. We refuse to fall back to a
//   hard-coded default in production.
// - Cookies are HTTP-only, SameSite=Lax, Secure in production.
// - The token payload is intentionally minimal: userId + email. We re-read
//   the user from the DB on /api/auth/me so revocations take effect.

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
      throw new Error("JWT_SECRET environment variable is required in production");
    }
    return "dev-only-insecure-secret-change-me-please";
  }
  return secret;
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