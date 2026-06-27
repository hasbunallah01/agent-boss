// x402 — pay-per-call protocol for AI tools and agent services.
// In production, this delegates to the Coinbase x402 facilitator.
// In dev, we simulate the x402 receipt flow.

export interface X402Payment {
  from: string; // payer wallet
  to: string;   // recipient wallet (tool provider or service agent)
  amountUSDC: number;
  resource: string; // what we're paying for (e.g., "openai_text_completion")
  network: string;
}

export interface X402Receipt {
  ref: string; // unique payment reference
  txHash: string;
  paidAt: number; // unix ms
  amountUSDC: number;
  network: string;
}

interface X402SettleResponse {
  ref: string;
  txHash: string;
}

const facilitatorUrl = () => process.env.X402_FACILITATOR_URL || "";
const network = () => process.env.X402_NETWORK || "arc-testnet";

/**
 * Pay for a tool/service call via x402.
 * Returns a receipt that callers can persist as proof of payment.
 *
 * Real implementation: POSTs to x402 facilitator with a signed payment header.
 * Dev: returns a mock receipt so the system runs without facilitator access.
 */
export async function payX402(payment: Omit<X402Payment, "network">): Promise<X402Receipt> {
  const url = facilitatorUrl();
  const paidAt = Date.now();

  if (!url) {
    return {
      ref: `x402_${paidAt}_${Math.random().toString(36).slice(2, 10)}`,
      txHash: `0xmock_${paidAt}_${Math.random().toString(16).slice(2, 10)}`,
      paidAt,
      amountUSDC: payment.amountUSDC,
      network: network(),
    };
  }

  // Real x402 flow — facilitator settles on Arc.
  const res = await fetch(`${url}/settle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      payer: payment.from,
      payee: payment.to,
      amount: payment.amountUSDC,
      resource: payment.resource,
      network: network(),
    }),
  });

  if (!res.ok) throw new Error(`x402 settlement failed: ${res.status}`);
  const json = (await res.json()) as X402SettleResponse;
  return {
    ref: json.ref,
    txHash: json.txHash,
    paidAt,
    amountUSDC: payment.amountUSDC,
    network: network(),
  };
}

/**
 * Price list for AI tool calls. Agents check their wallet balance against these
 * before invoking a tool. x402 pays the listed price.
 */
export const TOOL_PRICES_USDC = {
  openai_text_completion: 0.001,
  openai_translate: 0.0008,
  replicate_image_gen: 0.005,
  replicate_music_clip: 0.003,
  anthropic_long_context: 0.002,
} as const;

export type ToolName = keyof typeof TOOL_PRICES_USDC;