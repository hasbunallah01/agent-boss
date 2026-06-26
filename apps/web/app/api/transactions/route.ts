// GET /api/transactions → public ledger of recent USDC movements.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@agent-boss/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "50", 10), 200);
  const txs = await prisma.transaction.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { agent: true },
  });
  return NextResponse.json({
    ok: true,
    transactions: txs.map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amountUSDC,
      memo: t.memo,
      txHash: t.txHash,
      counterparty: t.counterparty,
      agent: t.agent ? { slug: t.agent.slug, name: t.agent.name, avatar: t.agent.avatar } : null,
      createdAt: t.createdAt,
    })),
  });
}
