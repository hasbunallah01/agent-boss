// POST /api/auth/reset-password
// Body: { token, newPassword }
// Verifies the token, marks it used, sets the user's passwordHash.
// Returns 200 + signs the user in (sets JWT cookie) so they don't have
// to log in separately after resetting.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@agent-boss/db";
import {
  hashPassword,
  hashResetToken,
  isValidPassword,
} from "@/lib/password";
import { signAuthToken, setAuthCookie } from "@/lib/auth";

export const runtime = "nodejs";

interface ResetBody {
  token?: unknown;
  newPassword?: unknown;
}

export async function POST(req: NextRequest) {
  let body: ResetBody;
  try {
    body = (await req.json()) as ResetBody;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body" } as const,
      { status: 400 }
    );
  }
  const token = typeof body.token === "string" ? body.token : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  if (!token || !isValidPassword(newPassword)) {
    return NextResponse.json(
      {
        ok: false,
        message: "Password must be 8+ characters and contain a letter and a number",
      } as const,
      { status: 400 }
    );
  }

  try {
    const tokenHash = hashResetToken(token);
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return NextResponse.json(
        { ok: false, message: "This reset link is invalid or has expired." } as const,
        { status: 401 }
      );
    }

    const passwordHash = await hashPassword(newPassword);
    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id: record.userId ?? "" },
        data: { passwordHash, passwordSetAt: new Date() },
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
      await tx.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      });
      return u;
    });

    const jwt = signAuthToken({ userId: updated.id, email: updated.email });
    await setAuthCookie(jwt);

    return NextResponse.json(
      { ok: true, user: updated } as const,
      { status: 200 }
    );
  } catch (e) {
    console.error("[auth/reset-password] internal error:", e);
    return NextResponse.json(
      { ok: false, message: "Password reset failed" } as const,
      { status: 500 }
    );
  }
}