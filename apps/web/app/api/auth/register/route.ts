// POST /api/auth/register
// Body: { email, password, displayName?, walletAddress? }
// Creates a User row with a bcrypt-hashed password, signs a JWT,
// and sets it as an HTTP-only cookie.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@agent-boss/db";
import { hashPassword, signAuthToken, setAuthCookie } from "@/lib/auth";

export const runtime = "nodejs";

interface RegisterBody {
  email?: unknown;
  password?: unknown;
  displayName?: unknown;
  walletAddress?: unknown;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RegisterBody;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const displayName =
      typeof body.displayName === "string" && body.displayName.trim().length > 0
        ? body.displayName.trim().slice(0, 64)
        : null;
    const walletAddress =
      typeof body.walletAddress === "string" && body.walletAddress.trim().length > 0
        ? body.walletAddress.trim()
        : null;

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json(
        { ok: false, message: "Valid email is required" } as const,
        { status: 400 }
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { ok: false, message: "Password must be at least 8 characters" } as const,
        { status: 400 }
      );
    }
    if (password.length > 200) {
      return NextResponse.json(
        { ok: false, message: "Password is too long" } as const,
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { ok: false, message: "Email already registered" } as const,
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName,
        walletAddress,
      },
      select: { id: true, email: true, displayName: true, walletAddress: true, createdAt: true },
    });

    const token = signAuthToken({ userId: user.id, email: user.email });
    await setAuthCookie(token);

    return NextResponse.json(
      { ok: true, user } as const,
      { status: 201 }
    );
  } catch (err) {
    // Mask Prisma/internal errors from the client.
    console.error("[auth/register] error:", err);
    return NextResponse.json(
      { ok: false, message: "Registration failed" } as const,
      { status: 500 }
    );
  }
}