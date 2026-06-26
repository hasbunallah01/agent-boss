// POST /api/tip
// Body: { agentSlug, amountUSDC, action, postId?, tipperAddress, tipperName? }
// Human tipping an agent in USDC. Settlement on Arc, recorded in DB.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@agent-boss/db";
import { transferUsdc } from "@/lib/arc";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentSlug, amountUSDC, action, postId, tipperAddress, tipperName } = body;

    if (!agentSlug || typeof amountUSDC !== "number" || amountUSDC <= 0) {
      return NextResponse.json(
        { ok: false, message: "agentSlug and positive amountUSDC required" },
        { status: 400 }
      );
    }
    if (!["like", "boost", "feature"].includes(action)) {
      return NextResponse.json(
        { ok: false, message: "action must be like|boost|feature" },
        { status: 400 }
      );
    }
    if (!tipperAddress) {
      return NextResponse.json(
        { ok: false, message: "tipperAddress required" },
        { status: 400 }
      );
    }

    const agent = await prisma.agent.findUnique({ where: { slug: agentSlug } });
    if (!agent) {
      return NextResponse.json({ ok: false, message: `agent not found: ${agentSlug}` }, { status: 404 });
    }

    // Settle on Arc (or simulate in dev).
    const txHash = await transferUsdc(agent.walletAddress, amountUSDC);

    // Persist the tip + ledger entry.
    const platformFeeBps = parseInt(process.env.PLATFORM_FEE_BPS || "100", 10);
    const fee = (amountUSDC * platformFeeBps) / 10000;
    const net = amountUSDC - fee;

    const tip = await prisma.$transaction(async (tx) => {
      const t = await tx.tip.create({
        data: {
          agentId: agent.id,
          tipperAddress,
          tipperName,
          amountUSDC,
          txHash,
          action,
          postId,
        },
      });

      // Update post stats if applicable.
      if (postId) {
        await tx.post.update({
          where: { id: postId },
          data: {
            tips: { increment: net },
            boostCount: action === "boost" ? { increment: 1 } : undefined,
            featured: action === "feature" ? true : undefined,
          },
        });
      }

      // Update agent stats.
      await tx.agent.update({
        where: { id: agent.id },
        data: {
          balanceUSDC: { increment: net },
          tipReceived: { increment: net },
        },
      });

      // Ledger entries.
      await tx.transaction.createMany({
        data: [
          {
            agentId: agent.id,
            type: "tip_in",
            amountUSDC: net,
            counterparty: tipperAddress,
            txHash,
            memo: `${action} tip from ${tipperName || tipperAddress.slice(0, 8)}`,
          },
          ...(fee > 0
            ? [
                {
                  agentId: agent.id,
                  type: "tool_payment" as const,
                  amountUSDC: -fee,
                  txHash,
                  memo: "platform fee",
                },
              ]
            : []),
        ],
      });

      return t;
    });

    return NextResponse.json({
      ok: true,
      tipId: tip.id,
      txHash,
      netUSDC: net,
      feeUSDC: fee,
      message: `Tipped ${agent.name} ${amountUSDC} USDC (net ${net.toFixed(4)})`,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e.message }, { status: 500 });
  }
}
