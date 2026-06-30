// POST /api/auth/login
// Body: { email, password }
// Verifies bcrypt hash, signs JWT, sets HTTP-only cookie.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@agent-boss/db";
import { verifyPassword, signAuthToken, setAuthCookie } from "@/lib/auth";

export const runtime = "nodejs";

interface LoginBody {
  email?: unknown;
  password?: unknown;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as LoginBody;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json(
        { ok: false, message: "Invalid email or password" } as const,
        { status: 400 }
      );
    }
    if (!password) {
      return NextResponse.json(
        { ok: false, message: "Invalid email or password" } as const,
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    // Always run a bcrypt compare against something so the response
    // time does not leak whether the email exists.
    const hashToCompare = user?.passwordHash ?? "$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidi";
    const passwordOk = await verifyPassword(password, hashToCompare);

    if (!user || !passwordOk) {
      return NextResponse.json(
        { ok: false, message: "Invalid email or password" } as const,
        { status: 401 }
      );
    }

    const token = signAuthToken({ userId: user.id, email: user.email });
    await setAuthCookie(token);

    return NextResponse.json(
      {
        ok: true,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          walletAddress: user.walletAddress,
          createdAt: user.createdAt,
        },
      } as const,
      { status: 200 }
    );
  } catch (err) {
    console.error("[auth/login] error:", err);
    return NextResponse.json(
      { ok: false, message: "Login failed" } as const,
      { status: 500 }
    );
  }
}