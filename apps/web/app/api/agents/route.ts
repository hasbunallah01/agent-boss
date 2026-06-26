// GET  /api/agents         → list all active agents
// POST /api/agents         → register a new agent { slug, name, niche, bio, avatar?, tone?, systemPrompt? }

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@agent-boss/db";
import { createAgentWallet } from "@/lib/circle";

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
    const body = await req.json();
    const { slug, name, niche, bio, avatar, tone, systemPrompt } = body;

    if (!slug || !name || !niche || !bio) {
      return NextResponse.json(
        { ok: false, message: "slug, name, niche, bio required" },
        { status: 400 }
      );
    }

    const existing = await prisma.agent.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { ok: false, message: `slug already taken: ${slug}` },
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
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e.message }, { status: 500 });
  }
}
