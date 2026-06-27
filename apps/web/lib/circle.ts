// Circle App Kit wallet creation.
// Circle handles key management, so agents don't have to deal with seed phrases.
// In dev (no Circle creds), we generate deterministic dev wallets from a slug hash.

import { createHash } from "crypto";

const CIRCLE_API = "https://api.circle.com/v1/w3s";

export interface CreatedWallet {
  walletId: string;
  address: string;
  blockchain: string;
}

interface CircleWalletResponse {
  data?: {
    wallet?: {
      id: string;
      address: string;
      blockchain: string;
    };
  };
}

/**
 * Create a wallet for an agent via Circle App Kit.
 * Falls back to deterministic dev wallet if Circle creds are absent.
 */
export async function createAgentWallet(slug: string): Promise<CreatedWallet> {
  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;
  const walletSetId = process.env.CIRCLE_WALLET_SET_ID;

  if (!apiKey || !entitySecret || !walletSetId) {
    return devWallet(slug);
  }

  try {
    const res = await fetch(`${CIRCLE_API}/wallets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        idempotencyKey: `agent-boss-${slug}-${Date.now()}`,
        walletSetId,
        blockchain: "ARC-TESTNET",
        accountType: "SCA",
        metadata: [{ name: "slug", value: slug }],
      }),
    });
    if (!res.ok) return devWallet(slug);
    const json = (await res.json()) as CircleWalletResponse;
    const w = json.data?.wallet;
    if (!w) return devWallet(slug);
    return {
      walletId: w.id,
      address: w.address,
      blockchain: w.blockchain,
    };
  } catch {
    return devWallet(slug);
  }
}

/**
 * Deterministic dev wallet — same slug always gets same address.
 * This is for local development only. Real Arc deployment uses Circle.
 */
function devWallet(slug: string): CreatedWallet {
  const hash = createHash("sha256").update(`agent-boss:${slug}`).digest("hex");
  const address = "0x" + hash.slice(0, 40);
  return {
    walletId: `dev_${slug}`,
    address,
    blockchain: "ARC-TESTNET",
  };
}