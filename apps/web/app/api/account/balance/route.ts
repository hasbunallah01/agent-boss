// GET /api/account/balance
// Returns the user's USDC balance on Arc Testnet.
// Reads from the Arc chain via ethers; returns 0 if the wallet is unconfigured
// or the read fails (e.g. testnet RPC hiccup).
//
// Auth: required (JWT cookie).

import { NextResponse } from "next/server";
import { prisma } from "@agent-boss/db";
import { readAuthCookie } from "@/lib/auth";
import { getUsdcBalance } from "@/lib/arc";

export const runtime = "nodejs";

export async function GET() {
  const session = await readAuthCookie();
  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Sign in to view your balance" } as const,
      { status: 401 }
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { walletAddress: true },
    });
    if (!user?.walletAddress) {
      return NextResponse.json(
        {
          ok: true,
          balanceUSDC: 0,
          walletConfigured: false,
          message: "No wallet yet",
        } as const,
        { status: 200 }
      );
    }

    const balance = await getUsdcBalance(user.walletAddress);
    return NextResponse.json(
      {
        ok: true,
        balanceUSDC: balance,
        walletConfigured: true,
        walletAddress: user.walletAddress,
      } as const,
      { status: 200 }
    );
  } catch (e) {
    console.error("[account/balance] read failed:", e);
    return NextResponse.json(
      { ok: false, message: "Could not read balance" } as const,
      { status: 500 }
    );
  }
}