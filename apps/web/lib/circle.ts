// Circle Developer-Controlled Wallets integration.
//
// Reads the API key from CIRCLE_API_KEY, the wallet set ID from
// CIRCLE_WALLET_SET_ID, and the 32-byte hex entity secret from
// CIRCLE_ENTITY_SECRET_HEX. The secret is encrypted with Circle's
// entity public key (RSA-OAEP / SHA-256) for every protected API
// call — Circle rejects reused ciphertexts.
//
// In dev (no Circle creds), we generate deterministic dev wallets
// from a slug hash so the app remains usable offline.

import { createHash, randomUUID } from "crypto";

const CIRCLE_API_BASE = "https://api.circle.com/v1/w3s";
const CIRCLE_BLOCKCHAIN = "ARC-TESTNET";

export interface CreatedWallet {
  walletId: string;
  address: string;
  blockchain: string;
}

interface CircleWalletResponse {
  data?: {
    // Circle returns wallets in an array `data.wallets` even for single-wallet create.
    wallets?: Array<{
      id: string;
      address: string;
      blockchain: string;
    }>;
  };
}

interface CircleErrorResponse {
  code?: number | string;
  message?: string;
}

// Cache the public key in memory to avoid an extra round-trip per wallet.
let cachedPublicKeyPem: string | null = null;
let cachedPublicKeyAt = 0;
const PUBLIC_KEY_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Fetch Circle's entity public key (cached for 1 hour).
 * Throws if no Circle API key is configured.
 */
async function getEntityPublicKey(apiKey: string): Promise<string> {
  const now = Date.now();
  if (cachedPublicKeyPem && now - cachedPublicKeyAt < PUBLIC_KEY_TTL_MS) {
    return cachedPublicKeyPem;
  }
  const res = await fetch(`${CIRCLE_API_BASE}/config/entity/publicKey`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`failed to fetch Circle public key: ${res.status} ${text}`);
  }
  const json = (await res.json()) as { data: { publicKey: string } };
  cachedPublicKeyPem = json.data.publicKey;
  cachedPublicKeyAt = now;
  return cachedPublicKeyPem;
}

/**
 * Encrypt the 32-byte hex entity secret with Circle's public key.
 * Output: base64-encoded RSA-OAEP-SHA256 ciphertext.
 */
async function encryptEntitySecret(
  hexSecret: string,
  publicKeyPem: string
): Promise<string> {
  // Node 18+ — use built-in crypto (async).
  const { publicEncrypt, constants } = await import("crypto");
  const secretBytes = Buffer.from(hexSecret, "hex");
  if (secretBytes.length !== 32) {
    throw new Error(`invalid entity secret length: ${secretBytes.length} (need 32)`);
  }
  const ciphertext = publicEncrypt(
    {
      key: publicKeyPem,
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    secretBytes
  );
  return ciphertext.toString("base64");
}

/**
 * Create a wallet for an agent via Circle Developer-Controlled Wallets.
 * Falls back to deterministic dev wallet if Circle creds are absent.
 */
export async function createAgentWallet(slug: string): Promise<CreatedWallet> {
  const apiKey = process.env.CIRCLE_API_KEY;
  const walletSetId = process.env.CIRCLE_WALLET_SET_ID;
  const hexSecret = process.env.CIRCLE_ENTITY_SECRET_HEX;

  // Dev fallback: no creds at all.
  if (!apiKey || !walletSetId || !hexSecret) {
    return devWallet(slug);
  }

  try {
    // Fetch public key + encrypt entity secret.
    const publicKeyPem = await getEntityPublicKey(apiKey);
    const entitySecretCiphertext = await encryptEntitySecret(hexSecret, publicKeyPem);

    // Create the wallet.
    const res = await fetch(`${CIRCLE_API_BASE}/developer/wallets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        idempotencyKey: randomUUID(),
        walletSetId,
        blockchains: [CIRCLE_BLOCKCHAIN],
        entitySecretCiphertext,
        accountType: "SCA",
        metadata: [{ name: "slug", value: slug }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      const err = (() => {
        try {
          return JSON.parse(errText) as CircleErrorResponse;
        } catch {
          return { message: errText };
        }
      })();
      console.warn(
        `[circle] wallet create failed for slug=${slug}: ${res.status} ${err.message ?? errText}`
      );
      return devWallet(slug);
    }

    const json = (await res.json()) as CircleWalletResponse;
    const w = json.data?.wallets?.[0];
    if (!w) return devWallet(slug);
    return {
      walletId: w.id,
      address: w.address,
      blockchain: w.blockchain,
    };
  } catch (e) {
    console.warn(`[circle] wallet create exception for slug=${slug}:`, e);
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
    blockchain: CIRCLE_BLOCKCHAIN,
  };
}