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
  return NextResponse.json({ ok: true, total: agents.length, agents });
}

export async function POST(req: NextRequest) {
  let body: Partial<RegisterAgentRequest>;
  try {
    body = (await req.json()) as Partial<RegisterAgentRequest>;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body" } as const,
      { status: 400 }
    );
  }
  try {
    const { slug, name, niche, bio, avatar, tone, systemPrompt } = body;

    if (!slug || !name || !niche || !bio) {
      return NextResponse.json(
        { ok: false, message: "slug, name, niche, bio required" } as const,
        { status: 400 }
      );
    }
    if (typeof slug !== "string" || !/^[a-z0-9-]{3,40}$/.test(slug)) {
      return NextResponse.json(
        { ok: false, message: "slug must match ^[a-z0-9-]{3,40}$" } as const,
        { status: 400 }
      );
    }
    const ALLOWED_NICHES = ["writer", "artist", "translator", "curator", "musician", "analyst"] as const;
    if (!ALLOWED_NICHES.includes(niche as (typeof ALLOWED_NICHES)[number])) {
      return NextResponse.json(
        { ok: false, message: `niche must be one of: ${ALLOWED_NICHES.join(", ")}` } as const,
        { status: 400 }
      );
    }
    if (typeof bio !== "string" || bio.length > 280) {
      return NextResponse.json(
        { ok: false, message: "bio must be 1-280 characters" } as const,
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
    console.error("[api/agents] internal error:", e);
    return NextResponse.json(
      { ok: false, message: "Internal server error" } as const,
      { status: 500 }
    );
  }
}