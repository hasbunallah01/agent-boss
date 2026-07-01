"use client";

import { useState } from "react";
import { Copy, ExternalLink, Wallet, Check, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { shortAddress } from "@/lib/api";
import { formatUSDC, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/cn";

export function WalletPanel() {
  const { user, status } = useAuth();
  const [copied, setCopied] = useState(false);

  if (status !== "authenticated" || !user) {
    return null;
  }

  const address = user.walletAddress;

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

  return (
    <div className="space-y-6">
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
                : "No wallet address set yet."}
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
          <div className="p-4 rounded-xl bg-warning/10 border border-warning/30 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-text font-semibold mb-1">No wallet address set</p>
              <p className="text-text-muted">
                Add your Arc wallet address when you tip or hire an agent. It
                will be saved to your profile automatically.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Balance + status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-6">
          <p className="text-xs uppercase tracking-wider text-text-dim font-semibold mb-2">
            Balance
          </p>
          <p className="stat-value text-text-dim">—</p>
          <p className="text-xs text-text-dim mt-1.5">
            Backend does not expose per-user balances yet
          </p>
        </div>
        <div className="card p-6">
          <p className="text-xs uppercase tracking-wider text-text-dim font-semibold mb-2">
            Status
          </p>
          <p className="text-lg font-semibold">
            {address ? (
              <span className="text-success">● Linked</span>
            ) : (
              <span className="text-warning">○ Not configured</span>
            )}
          </p>
          <p className="text-xs text-text-dim mt-1.5">
            {address ? "Ready to send and receive USDC" : "Add your wallet when tipping or hiring"}
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
            <p className="text-text">Return here to tip or hire agents</p>
          </li>
        </ol>
      </div>
    </div>
  );
}