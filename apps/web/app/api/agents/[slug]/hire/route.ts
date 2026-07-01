// POST /api/agents/[slug]/hire
// Body: { service, input, amountUSDC? }
// User hires an agent for a service. Pays via the platform wallet
// (mock fallback when unfunded, same as the agent-to-agent flow).
//
// Why a separate endpoint from /api/agents/hire?
// /api/agents/hire is agent-to-agent (buyer is another Agent).
// This endpoint is user-to-agent (buyer is the authenticated human).
// Both end up in AgentService, with userId OR buyerId set (never both).

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@agent-boss/db";
import { readAuthCookie } from "@/lib/auth";
import { transferUsdc } from "@/lib/arc";

export const runtime = "nodejs";

// Same service enum the agent-to-agent hire supports. Keep in sync
// with agents/hire.ts HireRequest.service.
const SUPPORTED_SERVICES = ["translate", "edit", "summarize", "generate_image"] as const;
type Service = (typeof SUPPORTED_SERVICES)[number];

interface HireBody {
  service?: unknown;
  input?: unknown;
  amountUSDC?: unknown;
}

interface ExecuteResult {
  ok: boolean;
  output?: unknown;
  error?: string;
}

export async function POST(
  req: NextRequest,
  ctx: { params: { slug: string } }
) {
  // 1) Auth: must be signed in.
  const session = await readAuthCookie();
  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Not authenticated" } as const,
      { status: 401 }
    );
  }

  // 2) Parse body.
  let body: HireBody;
  try {
    body = (await req.json()) as HireBody;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON body" } as const,
      { status: 400 }
    );
  }

  // 3) Validate fields.
  const service = typeof body.service === "string" ? body.service : "";
  if (!SUPPORTED_SERVICES.includes(service as Service)) {
    return NextResponse.json(
      {
        ok: false,
        message: `service must be one of: ${SUPPORTED_SERVICES.join(", ")}`,
      } as const,
      { status: 400 }
    );
  }

  const input =
    body.input && typeof body.input === "object" && !Array.isArray(body.input)
      ? (body.input as Record<string, unknown>)
      : null;
  if (!input) {
    return NextResponse.json(
      { ok: false, message: "input must be a JSON object" } as const,
      { status: 400 }
    );
  }

  // 4) Validate amount.
  let amount = 0.002;
  if (body.amountUSDC !== undefined) {
    if (typeof body.amountUSDC !== "number" || !Number.isFinite(body.amountUSDC)) {
      return NextResponse.json(
        { ok: false, message: "amountUSDC must be a number" } as const,
        { status: 400 }
      );
    }
    if (body.amountUSDC < 0.0001 || body.amountUSDC > 100) {
      return NextResponse.json(
        { ok: false, message: "amountUSDC must be between 0.0001 and 100" } as const,
        { status: 400 }
      );
    }
    amount = body.amountUSDC;
  }

  // 5) Look up the user (we need their id for AgentService.userId).
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, walletAddress: true },
  });
  if (!user) {
    return NextResponse.json(
      { ok: false, message: "User not found" } as const,
      { status: 404 }
    );
  }

  // 6) Look up the provider agent.
  const provider = await prisma.agent.findUnique({
    where: { slug: ctx.params.slug },
    select: { id: true, slug: true, name: true, walletAddress: true, active: true },
  });
  if (!provider) {
    return NextResponse.json(
      { ok: false, message: `Agent not found: ${ctx.params.slug}` } as const,
      { status: 404 }
    );
  }
  if (!provider.active) {
    return NextResponse.json(
      { ok: false, message: `Agent ${provider.slug} is inactive` } as const,
      { status: 400 }
    );
  }

  // 7) Create pending service record. userId is set, buyerId is null
  // (the AgentService model now allows either, never both).
  let service_record;
  try {
    service_record = await prisma.agentService.create({
      data: {
        userId: user.id,
        providerId: provider.id,
        service,
        inputPayload: JSON.stringify(input),
        amountUSDC: amount,
        status: "pending",
      },
    });
  } catch (e) {
    console.error("[api/agents/[slug]/hire] create failed:", e);
    return NextResponse.json(
      { ok: false, message: "Could not create hire record" } as const,
      { status: 500 }
    );
  }

  // 8) Settle USDC: platform wallet -> provider's wallet.
  // transferUsdc falls back to a labelled mock hash when the platform
  // wallet is unfunded (same behavior as agent-to-agent hire).
  let txHash: string;
  try {
    txHash = await transferUsdc(provider.walletAddress, amount);
  } catch (e: any) {
    await prisma.agentService.update({
      where: { id: service_record.id },
      data: { status: "failed" },
    });
    return NextResponse.json(
      {
        ok: false,
        message: `Settlement failed: ${e?.message ?? "unknown error"}`,
        serviceId: service_record.id,
      } as const,
      { status: 502 }
    );
  }

  // 9) Execute the service. For now only `translate` is wired (matches
  // the agent-to-agent hire). Other services return a "queued" response.
  let output: unknown = null;
  let executionOk = true;
  let executionError: string | undefined;

  if (service === "translate") {
    try {
      const result = await executeTranslate(input, provider);
      if (!result.ok) {
        executionOk = false;
        executionError = result.error;
      } else {
        output = result.output;
      }
    } catch (e: any) {
      executionOk = false;
      executionError = e?.message ?? "execution failed";
    }
  } else {
    // For services we don't yet auto-execute, just mark queued.
    output = { queued: true, note: `Service '${service}' execution will run async.` };
  }

  // 10) Atomically update balances + service status + transaction ledger.
  // Provider gets paid (balanceUSDC up, tipReceived up).
  // Transaction records the on-platform transfer.
  try {
    await prisma.$transaction([
      prisma.agent.update({
        where: { id: provider.id },
        data: {
          balanceUSDC: { increment: amount },
          tipReceived: { increment: amount },
        },
      }),
      prisma.agentService.update({
        where: { id: service_record.id },
        data: {
          status: executionOk ? "completed" : "failed",
          outputPayload: output !== null ? JSON.stringify(output) : null,
          txHash,
          completedAt: new Date(),
        },
      }),
      prisma.transaction.create({
        data: {
          agentId: provider.id,
          type: "service_received",
          amountUSDC: amount,
          counterparty: user.walletAddress ?? user.email,
          txHash,
          memo: `user hired ${provider.name} for ${service}`,
        },
      }),
    ]);
  } catch (e) {
    console.error("[api/agents/[slug]/hire] post-settlement update failed:", e);
    // Service record exists; settlement happened. Returning a partial
    // success is the safer choice — the txHash is the source of truth.
    return NextResponse.json(
      {
        ok: true,
        serviceId: service_record.id,
        txHash,
        status: "completed",
        message: "Hired successfully but ledger update had an issue; check /api/transactions.",
      } as const,
      { status: 200 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      serviceId: service_record.id,
      txHash,
      status: executionOk ? "completed" : "failed",
      output,
      executionError,
      message: executionOk
        ? `Hired ${provider.name} for ${service} ($${amount.toFixed(4)} USDC)`
        : `Hired ${provider.name} but service execution failed: ${executionError}`,
    } as const,
    { status: 200 }
  );
}

async function executeTranslate(
  input: Record<string, unknown>,
  provider: { id: string; slug: string; walletAddress: string }
): Promise<ExecuteResult> {
  const text = String(input.text ?? "");
  const targetLang = String(input.targetLang ?? "Spanish");
  if (!text.trim()) {
    return { ok: false, error: "input.text is required" };
  }
  // Reuse the agent's translate tool. Same fallback chain as the rest.
  try {
    const toolsModule = await import("@agent-boss/agents/tools");
    const result = await toolsModule.toolTranslate(
      {
        agentId: provider.id,
        agentSlug: provider.slug,
        walletAddress: provider.walletAddress,
      },
      text,
      targetLang
    );
    if (!result.ok) return { ok: false, error: result.error ?? "translate failed" };
    return { ok: true, output: result.data };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "translate exception" };
  }
}