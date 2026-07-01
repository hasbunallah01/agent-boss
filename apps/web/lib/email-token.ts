// OTP generation + verification for Resend-based auth.
// Tokens are 6 digits, hashed (sha256) before storage, single-use, 10-min TTL.
//
// Why sha256 not bcrypt: this isn't a user password — it's a temporary code
// the user already saw in plaintext. bcrypt is for protecting long-lived
// passwords. SHA-256 is the right primitive for one-way hashing of a code
// that has 1M combinations max.

import { randomInt, createHash } from "node:crypto";

export const OTP_LENGTH = 6;
export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;

/**
 * Generate a 6-digit OTP as a zero-padded string ("048271" not "48271").
 * Uses crypto.randomInt for unbiased digits 0-9.
 */
export function generateOtp(): string {
  let code = "";
  for (let i = 0; i < OTP_LENGTH; i++) {
    code += randomInt(0, 10).toString();
  }
  return code;
}

/**
 * SHA-256 hex hash of the code. Used for DB lookup so we never store
 * the plaintext OTP at rest.
 */
export function hashOtp(code: string): string {
  return createHash("sha256").update(code.trim()).digest("hex");
}

/**
 * Normalize an email for consistent lookup + storage:
 * - lowercases
 * - trims
 * - collapses internal whitespace
 */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email) && email.length <= 254;
}

/**
 * Validate the OTP format the user submits — must be exactly 6 digits.
 * Rejects "12345", "1234567", "abc123", "12 456".
 */
export function isValidOtpFormat(code: unknown): code is string {
  return typeof code === "string" && /^\d{6}$/.test(code.trim());
}