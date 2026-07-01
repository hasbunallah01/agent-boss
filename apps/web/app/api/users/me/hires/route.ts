// GET /api/users/me/hires
// Returns the current user's hires (AgentService rows where userId = me),
// most recent first. Includes the provider agent so the UI can render
// the hire with full agent context (name, avatar, slug).

import { NextResponse } from "next/server";
import { prisma } from "@agent-boss/db";
import { readAuthCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const session = await readAuthCookie();
  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Not authenticated" } as const,
      { status: 401 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json(
      { ok: false, message: "User not found" } as const,
      { status: 404 }
    );
  }

  const limit = 50;

  const hires = await prisma.agentService.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      provider: {
        select: {
          id: true,
          slug: true,
          name: true,
          avatar: true,
          niche: true,
          walletAddress: true,
        },
      },
    },
  });

  return NextResponse.json({
    ok: true,
    total: hires.length,
    hires: hires.map((h) => ({
      id: h.id,
      service: h.service,
      inputPayload: safeJsonParse(h.inputPayload),
      outputPayload: safeJsonParse(h.outputPayload),
      amountUSDC: h.amountUSDC,
      txHash: h.txHash,
      status: h.status,
      createdAt: h.createdAt,
      completedAt: h.completedAt,
      provider: h.provider
        ? {
            id: h.provider.id,
            slug: h.provider.slug,
            name: h.provider.name,
            avatar: h.provider.avatar,
            niche: h.provider.niche,
            walletAddress: h.provider.walletAddress,
          }
        : null,
    })),
  });
}

function safeJsonParse(s: string | null | undefined): unknown {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}