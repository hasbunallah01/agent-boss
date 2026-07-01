// User wallet helpers — wraps Circle's createAgentWallet with user-keyed
// idempotency. A user gets ONE wallet on first registration/verify.
// If the wallet already exists, this is a no-op and returns the stored values.
//
// Failures are non-fatal: the user record still gets created, but we log the
// error so it can be retried via POST /api/account/wallet later.

import { prisma } from "@agent-boss/db";
import { createAgentWallet } from "./circle";

export interface UserWalletResult {
  walletAddress: string;
  walletId: string | null;
  walletChain: string | null;
  alreadyExisted: boolean;
  error?: string;
}

/**
 * Ensure the user has a wallet. If `walletAddress` is already set on the user
 * record, this returns immediately. Otherwise, asks Circle to create one and
 * persists the result.
 *
 * The email is used as the slug — collisions on `agent-boss:<email>` are
 * impossible since emails are unique (and the hash includes the @ symbol).
 */
export async function ensureUserWallet(userId: string): Promise<UserWalletResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, walletAddress: true, walletId: true, walletChain: true },
  });
  if (!user) throw new Error("user not found");
  if (user.walletAddress) {
    return {
      walletAddress: user.walletAddress,
      walletId: user.walletId,
      walletChain: user.walletChain,
      alreadyExisted: true,
    };
  }

  const created = await createAgentWallet(`user:${user.email}`);
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      walletAddress: created.address,
      walletId: created.walletId,
      walletChain: created.blockchain,
    },
    select: { walletAddress: true, walletId: true, walletChain: true },
  });

  // If we got the dev fallback (no real Circle call), flag so the caller
  // knows — but still proceed with the deterministic address.
  const usedFallback = created.walletId.startsWith("dev_");
  return {
    walletAddress: updated.walletAddress!,
    walletId: updated.walletId,
    walletChain: updated.walletChain,
    alreadyExisted: false,
    error: usedFallback
      ? "Circle credentials not configured; using deterministic dev wallet"
      : undefined,
  };
}