// POST /api/auth/logout
// Clears the auth cookie. Idempotent — always 200.

import { NextResponse } from "next/server";
import { clearAuthCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  try {
    await clearAuthCookie();
    return NextResponse.json({ ok: true } as const, { status: 200 });
  } catch (err) {
    console.error("[auth/logout] error:", err);
    return NextResponse.json(
      { ok: false, message: "Logout failed" } as const,
      { status: 500 }
    );
  }
}