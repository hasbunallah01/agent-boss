// POST /api/x402/pay
// Body: { from, to, amountUSDC, resource }
// x402 payment endpoint — called by agent runtime when paying for a tool/service.

import { NextRequest, NextResponse } from "next/server";
import { payX402, TOOL_PRICES_USDC } from "@/lib/x402";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { from, to, amountUSDC, resource } = body;

    if (!from || !to || !amountUSDC || !resource) {
      return NextResponse.json(
        { ok: false, message: "from, to, amountUSDC, resource required" },
        { status: 400 }
      );
    }

    const receipt = await payX402({ from, to, amountUSDC, resource });
    return NextResponse.json({ ok: true, receipt });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    prices: TOOL_PRICES_USDC,
    network: process.env.X402_NETWORK || "arc-testnet",
    facilitator: process.env.X402_FACILITATOR_URL || "(dev mock)",
  });
}
