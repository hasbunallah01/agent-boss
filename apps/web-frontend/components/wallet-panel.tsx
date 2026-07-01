"use client";

import { useState } from "react";
import useSWR from "swr";
import { Copy, ExternalLink, Wallet, Check, Loader2, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { shortAddress } from "@/lib/api";
import { account } from "@/lib/api";
import { formatUSDC } from "@/lib/format";
import { ClientOnly } from "@/components/client-only";

export function WalletPanel() {
  const { user, status, refresh } = useAuth();

  if (status !== "authenticated" || !user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <ClientOnly fallback={null}>
        <WalletPanelInner userId={user.id} onRefresh={refresh} />
      </ClientOnly>
    </div>
  );
}

function WalletPanelInner({
  userId: _userId,
  onRefresh,
}: {
  userId: string;
  onRefresh: () => Promise<void>;
}) {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const address = user?.walletAddress ?? null;
  const {
    data: bal,
    isLoading: balLoading,
    mutate: refreshBalance,
  } = useSWR(address ? "/api/account/balance" : null, {
    revalidateOnFocus: false,
    refreshInterval: 60_000,
  });

  async function handleCopy() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  async function handleGenerateWallet() {
    setGenerating(true);
    setGenError(null);
    try {
      const r = await account.generateWallet();
      if (!r.ok) throw new Error(r.message);
      await onRefresh();
      await refreshBalance();
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Could not generate wallet");
    } finally {
      setGenerating(false);
    }
  }

  // Status text — only show active state when we have a real address
  const statusLabel = address ? "Wallet Active" : "Wallet not created";
  const statusColor = address ? "text-success" : "text-warning";
  const statusDot = address ? "bg-success" : "bg-warning";

  return (
    <>
      {/* Main wallet card */}
      <div className="card p-6 md:p-8 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-brand-gradient flex items-center justify-center text-white shadow-glow-md shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-text-dim font-semibold mb-1">
              Arc Testnet wallet
            </p>
            <p className="text-text-muted text-sm">
              {address
                ? "This is the wallet you use to tip and hire agents."
                : "You don't have an Arc wallet yet."}
            </p>
          </div>
        </div>

        {address ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-bg-deep border border-border">
              <code className="flex-1 font-mono text-sm truncate">{address}</code>
              <button
                onClick={handleCopy}
                className="shrink-0 p-2 rounded-lg bg-bg-elevated hover:bg-bg-subtle text-text-muted hover:text-text transition-colors"
                aria-label="Copy address"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-success" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <a
                href="https://faucet.circle.com"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary flex-1"
              >
                <ExternalLink className="w-4 h-4" />
                Fund via Circle Faucet
              </a>
              <a
                href={`https://testnet.arcscan.app/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                View on Arcscan
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-warning/10 border border-warning/30">
              <p className="text-sm text-text font-semibold mb-1">
                No wallet yet
              </p>
              <p className="text-xs text-text-muted">
                Generate a free Arc wallet to start tipping and hiring agents.
              </p>
            </div>
            <button
              onClick={handleGenerateWallet}
              disabled={generating}
              className="btn-primary w-full"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Generate Wallet
                </>
              )}
            </button>
            {genError && <p className="text-sm text-danger">{genError}</p>}
          </div>
        )}
      </div>

      {/* Balance + status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-6">
          <p className="text-xs uppercase tracking-wider text-text-dim font-semibold mb-2">
            USDC balance
          </p>
          {!address ? (
            <>
              <p className="stat-value text-text-dim">—</p>
              <p className="text-xs text-text-dim mt-1.5">
                Generate a wallet to see your balance
              </p>
            </>
          ) : balLoading ? (
            <div className="skeleton h-9 w-32 mt-1" />
          ) : bal && bal.ok ? (
            <>
              <p className="stat-value">
                ${formatUSDC(bal.balanceUSDC)}
              </p>
              <p className="text-xs text-text-dim mt-1.5">
                {bal.balanceUSDC === 0
                  ? "Fund via Circle Faucet to start tipping"
                  : `On Arc Testnet · ${shortAddress(bal.walletAddress ?? address, 4)}`}
              </p>
            </>
          ) : (
            <>
              <p className="stat-value text-text-dim">—</p>
              <p className="text-xs text-text-dim mt-1.5">
                Could not read balance
              </p>
            </>
          )}
        </div>
        <div className="card p-6">
          <p className="text-xs uppercase tracking-wider text-text-dim font-semibold mb-2">
            Status
          </p>
          <p className={`text-lg font-semibold flex items-center gap-2 ${statusColor}`}>
            <span className={`w-2 h-2 rounded-full ${statusDot}`} />
            {statusLabel}
          </p>
          <p className="text-xs text-text-dim mt-1.5">
            {address
              ? `Chain: ${user?.walletChain ?? "ARC-TESTNET"}`
              : "Click Generate Wallet to create one"}
          </p>
        </div>
      </div>

      {/* Fund via Faucet instructions */}
      <div className="card p-6">
        <h3 className="font-semibold mb-2">Funding your wallet</h3>
        <p className="text-sm text-text-muted mb-4">
          To tip agents or hire them, fund your Arc Testnet wallet with testnet USDC.
        </p>
        <ol className="space-y-3 text-sm">
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-primary/15 border border-primary/30 text-primary-300 flex items-center justify-center text-xs font-bold">1</span>
            <div>
              <p className="text-text">Open the Circle faucet</p>
              <a
                href="https://faucet.circle.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline inline-flex items-center gap-1"
              >
                faucet.circle.com
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-primary/15 border border-primary/30 text-primary-300 flex items-center justify-center text-xs font-bold">2</span>
            <p className="text-text">Paste your Arc wallet address and request 20 USDC</p>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-primary/15 border border-primary/30 text-primary-300 flex items-center justify-center text-xs font-bold">3</span>
            <p className="text-text">Return here — your balance will refresh automatically</p>
          </li>
        </ol>
      </div>
    </>
  );
}