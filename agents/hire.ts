// Agent-to-agent service hiring.
// Example: WriterAgent pays TranslatorAgent 0.002 USDC to translate its post.
// The settlement runs via x402 (or direct Arc transfer) and both wallets update.

import { prisma } from "../packages/db/index.js";
import { runAgentTick } from "./runtime.js";
import { toolTranslate } from "./tools/index.js";
import { payX402 } from "../apps/web/lib/x402.js";

export interface HireRequest {
  buyerSlug: string;
  providerSlug: string;
  service: "translate" | "edit" | "summarize" | "generate_image";
  input: Record<string, any>;
  amountUSDC?: number;
}

export interface HireResult {
  ok: boolean;
  message: string;
  serviceId?: string;
  output?: any;
}

/**
 * Hire another agent for a service. Settles payment via x402.
 */
export async function hireAgent(req: HireRequest): Promise<HireResult> {
  const [buyer, provider] = await Promise.all([
    prisma.agent.findUnique({ where: { slug: req.buyerSlug } }),
    prisma.agent.findUnique({ where: { slug: req.providerSlug } }),
  ]);
  if (!buyer) return { ok: false, message: `buyer not found: ${req.buyerSlug}` };
  if (!provider) return { ok: false, message: `provider not found: ${req.providerSlug}` };
  if (buyer.id === provider.id) return { ok: false, message: "an agent cannot hire itself" };
  if (!buyer.active || !provider.active)
    return { ok: false, message: "buyer or provider is inactive" };

  const amount = req.amountUSDC ?? 0.002;
  if (buyer.balanceUSDC < amount)
    return {
      ok: false,
      message: `buyer ${buyer.name} has $${buyer.balanceUSDC.toFixed(4)}, needs $${amount}`,
    };

  // Create pending service record
  const service = await prisma.agentService.create({
    data: {
      buyerId: buyer.id,
      providerId: provider.id,
      service: req.service,
      inputPayload: JSON.stringify(req.input),
      amountUSDC: amount,
      status: "pending",
    },
  });

  // Settle via x402 (buyer → provider)
  let receipt;
  try {
    receipt = await payX402({
      from: buyer.walletAddress,
      to: provider.walletAddress,
      amountUSDC: amount,
      resource: `agent_service:${req.service}`,
    });
  } catch (e: any) {
    await prisma.agentService.update({
      where: { id: service.id },
      data: { status: "failed" },
    });
    return { ok: false, message: `x402 settlement failed: ${e.message}` };
  }

  // Execute the service
  let output: any = null;
  try {
    output = await executeService(req, provider);
  } catch (e: any) {
    await prisma.agentService.update({
      where: { id: service.id },
      data: { status: "failed" },
    });
    return { ok: false, message: `service execution failed: ${e.message}` };
  }

  // Update balances + service record atomically
  await prisma.$transaction([
    prisma.agent.update({
      where: { id: buyer.id },
      data: {
        balanceUSDC: { decrement: amount },
        spentOnAgents: { increment: amount },
      },
    }),
    prisma.agent.update({
      where: { id: provider.id },
      data: {
        balanceUSDC: { increment: amount },
        tipReceived: { increment: amount },
      },
    }),
    prisma.agentService.update({
      where: { id: service.id },
      data: {
        status: "completed",
        outputPayload: JSON.stringify(output),
        txHash: receipt.txHash,
        completedAt: new Date(),
      },
    }),
    prisma.transaction.createMany({
      data: [
        {
          agentId: buyer.id,
          type: "service_payment",
          amountUSDC: -amount,
          counterparty: provider.walletAddress,
          txHash: receipt.txHash,
          memo: `hired ${provider.name} for ${req.service}`,
        },
        {
          agentId: provider.id,
          type: "service_received",
          amountUSDC: amount,
          counterparty: buyer.walletAddress,
          txHash: receipt.txHash,
          memo: `service: ${req.service} for ${buyer.name}`,
        },
      ],
    }),
  ]);

  return {
    ok: true,
    message: `${buyer.name} paid ${provider.name} $${amount.toFixed(4)} USDC for ${req.service}`,
    serviceId: service.id,
    output,
  };
}

async function executeService(
  req: HireRequest,
  provider: any
): Promise<any> {
  switch (req.service) {
    case "translate": {
      const text = String(req.input.text || "");
      const target = String(req.input.targetLang || "Spanish");
      const result = await toolTranslate(
        {
          agentId: provider.id,
          agentSlug: provider.slug,
          walletAddress: provider.walletAddress,
        },
        text,
        target
      );
      if (!result.ok) throw new Error(result.error || "translate failed");
      return result.data;
    }
    default:
      throw new Error(`unsupported service: ${req.service}`);
  }
}

/**
 * Run all agents once. Used by cron / manual trigger.
 */
export async function tickAllAgents(): Promise<{ ran: number; results: string[] }> {
  const agents = await prisma.agent.findMany({ where: { active: true } });
  const results: string[] = [];
  for (const a of agents) {
    const ctx = {
      id: a.id,
      slug: a.slug,
      name: a.name,
      niche: a.niche,
      bio: a.bio,
      avatar: a.avatar,
      tone: a.tone,
      systemPrompt: a.systemPrompt,
      walletAddress: a.walletAddress,
      balanceUSDC: a.balanceUSDC,
    };
    const r = await runAgentTick(ctx);
    results.push(`${r.ok ? "✅" : "❌"} ${r.message}`);
  }
  return { ran: agents.length, results };
}
