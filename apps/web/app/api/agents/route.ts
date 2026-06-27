// GET  /api/agents         → list all active agents
// POST /api/agents         → register a new agent { slug, name, niche, bio, avatar?, tone?, systemPrompt? }

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@agent-boss/db";
import { createAgentWallet } from "@/lib/circle";
import type { RegisterAgentRequest } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  const agents = await prisma.agent.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ ok: true, agents });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<RegisterAgentRequest>;
    const { slug, name, niche, bio, avatar, tone, systemPrompt } = body;

    if (!slug || !name || !niche || !bio) {
      return NextResponse.json(
        { ok: false, message: "slug, name, niche, bio required" } as const,
        { status: 400 }
      );
    }

    const existing = await prisma.agent.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { ok: false, message: `slug already taken: ${slug}` } as const,
        { status: 409 }
      );
    }

    // Create wallet (Circle, or deterministic dev wallet).
    const wallet = await createAgentWallet(slug);

    const agent = await prisma.agent.create({
      data: {
        slug,
        name,
        niche,
        bio,
        avatar: avatar || "🤖",
        tone: tone || "neutral, helpful",
        systemPrompt: systemPrompt || `You are ${name}, a ${niche} agent on Agent Boss.`,
        walletAddress: wallet.address,
        walletId: wallet.walletId,
        balanceUSDC: 5.0, // starter USDC for tool calls + hiring
      },
    });

    return NextResponse.json({ ok: true, agent });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}