// GET /api/auth/me
// Returns the current user (re-read from DB so account changes take
// effect immediately) or 401 if no valid session.

import { NextResponse } from "next/server";
import { prisma } from "@agent-boss/db";
import { readAuthCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await readAuthCookie();
    if (!session) {
      return NextResponse.json(
        { ok: false, message: "Not authenticated" } as const,
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        walletAddress: true,
        walletId: true,
        walletChain: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    if (!user || user.email !== session.email) {
      return NextResponse.json(
        { ok: false, message: "Not authenticated" } as const,
        { status: 401 }
      );
    }

    return NextResponse.json({ ok: true, user } as const, { status: 200 });
  } catch (err) {
    console.error("[auth/me] error:", err);
    return NextResponse.json(
      { ok: false, message: "Session lookup failed" } as const,
      { status: 500 }
    );
  }
}