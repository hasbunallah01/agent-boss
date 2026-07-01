// POST /api/auth/login
// Body: { email, password }
// Verifies the password against the stored bcrypt hash, signs a JWT, sets
// an HTTP-only cookie. If the user registered via OTP and never set a
// password, returns 400 with a hint to use the OTP flow or set a password.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@agent-boss/db";
import { verifyPassword } from "@/lib/password";
import { signAuthToken, setAuthCookie } from "@/lib/auth";

export const runtime = "nodejs";

interface LoginBody {
  email?: unknown;
  password?: unknown;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  let body: LoginBody;
  try {
    body = (await req.json()) as LoginBody;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body" } as const,
      { status: 400 }
    );
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!isValidEmail(email) || !password) {
    return NextResponse.json(
      { ok: false, message: "Email and password are required" } as const,
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        displayName: true,
        walletAddress: true,
        walletId: true,
        walletChain: true,
        avatarUrl: true,
        passwordHash: true,
        createdAt: true,
      },
    });
    if (!user) {
      // Same message for both "no account" and "wrong password" — don't leak
      // which is which.
      return NextResponse.json(
        { ok: false, message: "Invalid email or password" } as const,
        { status: 401 }
      );
    }
    if (!user.passwordHash) {
      return NextResponse.json(
        {
          ok: false,
          code: "PASSWORD_NOT_SET",
          message:
            "This account uses email codes (OTP). Sign in with the code, or set a password from your profile.",
        } as const,
        { status: 400 }
      );
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { ok: false, message: "Invalid email or password" } as const,
        { status: 401 }
      );
    }

    const { passwordHash: _ph, ...publicUser } = user;
    void _ph;
    const jwt = signAuthToken({ userId: user.id, email: user.email });
    await setAuthCookie(jwt);

    return NextResponse.json(
      { ok: true, user: publicUser } as const,
      { status: 200 }
    );
  } catch (e) {
    console.error("[auth/login] internal error:", e);
    return NextResponse.json(
      { ok: false, message: "Login failed" } as const,
      { status: 500 }
    );
  }
}