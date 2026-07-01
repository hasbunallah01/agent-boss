// Password hashing + verification helpers.
// Uses bcryptjs (pure-JS, works on Node 24 + Edge runtime fallback to scrypt).
//
// Cost factor: 12 is a good balance for a hackathon demo — ~150ms per hash
// on a modest server. Production would tune to ~250ms.

import bcrypt from "bcryptjs";
import { randomBytes, createHash } from "crypto";

const BCRYPT_COST = 12;
const MIN_PASSWORD_LEN = 8;
const MAX_PASSWORD_LEN = 128;

export function isValidPassword(pw: unknown): pw is string {
  if (typeof pw !== "string") return false;
  if (pw.length < MIN_PASSWORD_LEN || pw.length > MAX_PASSWORD_LEN) return false;
  // Require at least 1 letter and 1 number for password strength.
  if (!/[a-zA-Z]/.test(pw)) return false;
  if (!/[0-9]/.test(pw)) return false;
  return true;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!hash) return false;
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

/**
 * Generate a password-reset token. Returns the raw token to email + the
 * hash to store in the DB (we never persist the raw token).
 */
export function generateResetToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("base64url"); // 43-char URL-safe token
  const hash = createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

export function hashResetToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}