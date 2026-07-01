// POST /api/auth/register
// Body: { email, password, displayName? }
// Creates a new user with email + password auth, auto-creates a Circle
// wallet on Arc Testnet, signs a JWT, sets an HTTP-only cookie.
//
// - Email is normalized (trimmed + lowercased).
// - Password must be 8+ chars, contain a letter and a number.
// - If the email already has an account, returns 409 (clients should use
//   /api/auth/login or /api/auth/forgot-password instead).
// - Wallet creation is best-effort: if Circle is misconfigured, the user
//   still gets a deterministic dev wallet + a warning field in the response.
//
// This endpoint does NOT use the OTP flow. Both flows coexist:
//   - POST /api/auth/register  -> email + password (new)
//   - POST /api/auth/request   -> email + OTP (existing)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@agent-boss/db";
import { hashPassword, isValidPassword } from "@/lib/password";
import { ensureUserWallet } from "@/lib/user-wallet";
import { signAuthToken, setAuthCookie } from "@/lib/auth";

export const runtime = "nodejs";

interface RegisterBody {
  email?: unknown;
  password?: unknown;
  displayName?: unknown;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  let body: RegisterBody;
  try {
    body = (await req.json()) as RegisterBody;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body" } as const,
      { status: 400 }
    );
  }

  const rawEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const displayName =
    typeof body.displayName === "string" && body.displayName.trim().length > 0
      ? body.displayName.trim().slice(0, 60)
      : null;

  if (!isValidEmail(rawEmail)) {
    return NextResponse.json(
      { ok: false, message: "Valid email is required" } as const,
      { status: 400 }
    );
  }
  if (!isValidPassword(password)) {
    return NextResponse.json(
      {
        ok: false,
        message: "Password must be 8+ characters and contain a letter and a number",
      } as const,
      { status: 400 }
    );
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email: rawEmail } });
    if (existing) {
      return NextResponse.json(
        { ok: false, message: "An account with this email already exists. Try signing in." } as const,
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email: rawEmail,
        displayName,
        passwordHash,
        passwordSetAt: new Date(),
        emailVerified: new Date(), // password-set users are auto-verified
      },
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

    // Best-effort Circle wallet creation. Failures degrade gracefully.
    let wallet: Awaited<ReturnType<typeof ensureUserWallet>> | null = null;
    try {
      wallet = await ensureUserWallet(user.id);
    } catch (e) {
      console.warn("[auth/register] wallet creation failed:", e);
    }

    // Re-read user in case wallet got persisted.
    const fresh = wallet
      ? await prisma.user.findUnique({
          where: { id: user.id },
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
        })
      : user;

    const jwt = signAuthToken({ userId: fresh!.id, email: fresh!.email });
    await setAuthCookie(jwt);

    return NextResponse.json(
      {
        ok: true,
        user: fresh!,
        walletWarning: wallet?.error,
      } as const,
      { status: 200 }
    );
  } catch (e) {
    console.error("[auth/register] internal error:", e);
    return NextResponse.json(
      { ok: false, message: "Registration failed" } as const,
      { status: 500 }
    );
  }
}