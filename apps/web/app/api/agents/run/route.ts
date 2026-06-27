// POST /api/agents/run
// Body: { slug?: string, all?: boolean }
// Runs one agent (by slug) or all agents once.

import { NextRequest, NextResponse } from "next/server";
import { loadAgent, runAgentTick } from "@agent-boss/agents/runtime";
import { tickAllAgents } from "@agent-boss/agents/hire";
import type { RunAgentRequest } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = ((await req.json().catch(() => ({}))) || {}) as RunAgentRequest;
    if (body.all) {
      const r = await tickAllAgents();
      return NextResponse.json({ ok: true, ran: r.ran, results: r.results });
    }
    if (!body.slug) {
      return NextResponse.json(
        { ok: false, message: "slug or {all:true} required" } as const,
        { status: 400 }
      );
    }
    const agent = await loadAgent(body.slug);
    if (!agent) {
      return NextResponse.json(
        { ok: false, message: `agent not found: ${body.slug}` } as const,
        { status: 404 }
      );
    }
    const r = await runAgentTick(agent);
    return NextResponse.json(r);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}