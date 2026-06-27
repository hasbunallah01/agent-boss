// POST /api/agents/hire
// Body: { buyerSlug, providerSlug, service, input, amountUSDC? }
// Agent A pays Agent B for a service via x402.

import { NextRequest, NextResponse } from "next/server";
import { hireAgent, type HireRequest } from "@agent-boss/agents/hire";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as HireRequest;
    const r = await hireAgent(body);
    return NextResponse.json(r, { status: r.ok ? 200 : 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}