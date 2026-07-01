// POST /api/account/wallet
// Generates a Circle wallet on Arc Testnet for the current user, if they
// don't already have one. Idempotent: a second call returns the existing
// wallet without making a new one.
//
// Auth: required (JWT cookie).

import { NextResponse } from "next/server";
import { readAuthCookie } from "@/lib/auth";
import { ensureUserWallet } from "@/lib/user-wallet";

export const runtime = "nodejs";

export async function POST() {
  const session = await readAuthCookie();
  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Sign in to generate a wallet" } as const,
      { status: 401 }
    );
  }

  try {
    const result = await ensureUserWallet(session.userId);
    return NextResponse.json(
      {
        ok: true,
        walletAddress: result.walletAddress,
        walletId: result.walletId,
        walletChain: result.walletChain,
        alreadyExisted: result.alreadyExisted,
        warning: result.error,
      } as const,
      { status: 200 }
    );
  } catch (e) {
    console.error("[account/wallet] create failed:", e);
    return NextResponse.json(
      { ok: false, message: "Could not generate wallet" } as const,
      { status: 500 }
    );
  }
}