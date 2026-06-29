// GET /api/transactions → public ledger of recent USDC movements.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@agent-boss/db";

export const runtime = "nodejs";

/**
 * Local row shape used by this route. Mirrors the real Prisma
 * Transaction model + included Agent relation in
 * packages/db/schema.prisma. Declared locally because Vercel's
 * bundler-driven tsc does not always propagate the Prisma client's
 * generated delegate return-type into this file's resolution
 * context, leaving the .map callback parameter implicit any under
 * strict noImplicitAny. Field set is the exact subset this route
 * actually reads.
 */
interface TransactionRow {
  id: string;
  type: string;
  amountUSDC: number;
  memo: string | null;
  txHash: string | null;
  counterparty: string | null;
  createdAt: Date;
  agent: {
    slug: string;
    name: string;
    avatar: string;
  } | null;
}

export async function GET(req: NextRequest) {
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "50", 10), 200);
  const tipperAddress = req.nextUrl.searchParams.get("tipperAddress") || undefined;
  const agentSlug = req.nextUrl.searchParams.get("agentSlug") || undefined;

  // Resolve agentSlug → agentId. If slug is provided but doesn't match any
  // agent, return an empty list (REST-idiomatic for a collection endpoint).
  let agentId: string | undefined;
  if (agentSlug) {
    const agent = await prisma.agent.findUnique({
      where: { slug: agentSlug },
      select: { id: true },
    });
    if (!agent) {
      return NextResponse.json({ ok: true, transactions: [] });
    }
    agentId = agent.id;
  }

  const where: { counterparty?: string; agentId?: string } = {};
  if (tipperAddress) where.counterparty = tipperAddress;
  if (agentId) where.agentId = agentId;

  const txs: TransactionRow[] = await prisma.transaction.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { agent: true },
  });
  return NextResponse.json({
    ok: true,
    transactions: txs.map(
      (t: TransactionRow): {
        id: string;
        type: string;
        amount: number;
        memo: string | null;
        txHash: string | null;
        counterparty: string | null;
        agent: { slug: string; name: string; avatar: string } | null;
        createdAt: Date;
      } => ({
        id: t.id,
        type: t.type,
        amount: t.amountUSDC,
        memo: t.memo,
        txHash: t.txHash,
        counterparty: t.counterparty,
        agent: t.agent ? { slug: t.agent.slug, name: t.agent.name, avatar: t.agent.avatar } : null,
        createdAt: t.createdAt,
      })
    ),
  });
}
