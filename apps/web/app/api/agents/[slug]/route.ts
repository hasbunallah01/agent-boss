// GET /api/agents/[slug] → return one agent by slug
// Returns 200 with the agent, 404 if not found, 500 on server error.

import { NextResponse } from "next/server";
import { prisma } from "@agent-boss/db";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const agent = await prisma.agent.findUnique({
      where: { slug: params.slug },
    });
    if (!agent) {
      return NextResponse.json(
        { ok: false, message: "Agent not found" } as const,
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true, agent });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}