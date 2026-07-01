// POST /api/account/avatar
// Body: { avatarUrl: string, displayName?: string }
// Saves the avatar URL on the user's profile. The frontend is responsible
// for hosting the avatar image (data URI for small avatars, or external URL
// for hosted images). We don't accept multipart uploads here — the frontend
// converts to data URI client-side for simplicity.
//
// Auth: required (JWT cookie). Returns 401 otherwise.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@agent-boss/db";
import { readAuthCookie } from "@/lib/auth";

export const runtime = "nodejs";

interface AvatarBody {
  avatarUrl?: unknown;
  displayName?: unknown;
}

const MAX_AVATAR_LEN = 200_000; // 200 KB (data URIs are ~4/3 of binary)

export async function POST(req: NextRequest) {
  const session = await readAuthCookie();
  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Sign in to update your avatar" } as const,
      { status: 401 }
    );
  }

  let body: AvatarBody;
  try {
    body = (await req.json()) as AvatarBody;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body" } as const,
      { status: 400 }
    );
  }

  const avatarUrl = typeof body.avatarUrl === "string" ? body.avatarUrl.trim() : "";
  const displayName =
    typeof body.displayName === "string" && body.displayName.trim().length > 0
      ? body.displayName.trim().slice(0, 60)
      : undefined;

  if (!avatarUrl) {
    return NextResponse.json(
      { ok: false, message: "avatarUrl is required" } as const,
      { status: 400 }
    );
  }
  if (avatarUrl.length > MAX_AVATAR_LEN) {
    return NextResponse.json(
      { ok: false, message: `Avatar is too large (max ${MAX_AVATAR_LEN} chars)` } as const,
      { status: 413 }
    );
  }
  // Only accept http(s) URLs or data: URIs.
  if (!/^(https?:\/\/|data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,)/i.test(avatarUrl)) {
    return NextResponse.json(
      { ok: false, message: "avatarUrl must be an http(s) URL or data URI" } as const,
      { status: 400 }
    );
  }

  try {
    const updated = await prisma.user.update({
      where: { id: session.userId },
      data: {
        avatarUrl,
        ...(displayName !== undefined ? { displayName } : {}),
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
    return NextResponse.json({ ok: true, user: updated } as const, { status: 200 });
  } catch (e) {
    console.error("[account/avatar] update failed:", e);
    return NextResponse.json(
      { ok: false, message: "Could not save avatar" } as const,
      { status: 500 }
    );
  }
}