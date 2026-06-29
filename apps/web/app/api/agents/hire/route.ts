// POST /api/agents/hire
// Body: { buyerSlug, providerSlug, service, input, amountUSDC? }
// Agent A pays Agent B for a service via x402.

import { NextRequest, NextResponse } from "next/server";
import { hireAgent, type HireRequest } from "@agent-boss/agents/hire";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: HireRequest;
  try {
    body = (await req.json()) as HireRequest;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body" } as const,
      { status: 400 }
    );
  }
  if (
    !body ||
    !body.buyerSlug ||
    !body.providerSlug ||
    !body.service ||
    !body.input
  ) {
    return NextResponse.json(
      { ok: false, message: "Missing required fields" } as const,
      { status: 400 }
    );
  }
  try {
    const r = await hireAgent(body);
    return NextResponse.json(r, { status: r.ok ? 200 : 400 });
  } catch (e) {
    console.error("[api/agents/hire] internal error:", e);
    return NextResponse.json(
      { ok: false, message: "Internal server error" } as const,
      { status: 500 }
    );
  }
}