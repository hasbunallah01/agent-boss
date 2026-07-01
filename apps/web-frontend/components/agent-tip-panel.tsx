"use client";

import { useState } from "react";
import { Coins, Heart, Loader2, ExternalLink } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useAuthModal } from "@/lib/auth-modal-context";
import { tips, ApiError, shortAddress, arcscanTxUrl } from "@/lib/api";
import { formatUSDC } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Agent } from "@/lib/types";

const PRESET_AMOUNTS = [0.01, 0.05, 0.1, 0.5, 1];

interface TipResult {
  ok: boolean;
  message: string;
  txHash?: string;
  netUSDC?: number;
  feeUSDC?: number;
}

export function AgentTipPanel({ agent }: { agent: Agent }) {
  const { user, status } = useAuth();
  const { triggerWithReason } = useAuthModal();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(0.05);
  const [customAmount, setCustomAmount] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [tipperName, setTipperName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<TipResult | null>(null);

  const isAuthed = status === "authenticated";

  function start() {
    if (!isAuthed) {
      triggerWithReason("Sign in to tip this agent.");
      return;
    }
    // Pre-fill wallet address from user profile if available
    if (user?.walletAddress && !walletAddress) {
      setWalletAddress(user.walletAddress);
    }
    setOpen(true);
    setResult(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!walletAddress.trim()) {
      setResult({ ok: false, message: "Enter your wallet address" });
      return;
    }
    if (amount < 0.0001 || amount > 100) {
      setResult({ ok: false, message: "Amount must be between 0.0001 and 100 USDC" });
      return;
    }
    setSubmitting(true);
    setResult(null);
    try {
      const r = await tips.create({
        agentSlug: agent.slug,
        amountUSDC: amount,
        action: "like",
        tipperAddress: walletAddress.trim(),
        tipperName: tipperName.trim() || undefined,
      });
      if (r.ok) {
        setResult({
          ok: true,
          message: r.message,
          txHash: r.txHash,
          netUSDC: r.netUSDC,
          feeUSDC: r.feeUSDC,
        });
      } else {
        setResult({ ok: false, message: r.message });
      }
    } catch (e) {
      setResult({
        ok: false,
        message: e instanceof ApiError ? e.message : "Tip failed",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={start}
        className="card card-hover p-6 text-left group flex items-center gap-4"
      >
        <div className="w-12 h-12 rounded-xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-pink-300 group-hover:scale-110 transition-transform">
          <Heart className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wider text-text-dim font-semibold mb-1">
            Quick action
          </p>
          <p className="font-semibold text-lg group-hover:text-primary-300 transition-colors">
            Tip {agent.name}
          </p>
          <p className="text-xs text-text-muted mt-0.5">
            Send USDC directly to their wallet on Arc.
          </p>
        </div>
        <div className="text-text-dim group-hover:text-primary transition-colors">→</div>
      </button>
    );
  }

  return (
    <div className="card p-6 border-pink-500/30 shadow-glow-sm">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center text-pink-300">
          <Heart className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-text-dim font-semibold">Tip</p>
          <p className="font-semibold">Support {agent.name}&apos;s work</p>
        </div>
      </div>

      {result?.ok ? (
        <TipSuccess
          message={result.message}
          txHash={result.txHash}
          netUSDC={result.netUSDC}
          feeUSDC={result.feeUSDC}
          onClose={() => {
            setOpen(false);
            setResult(null);
          }}
        />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount presets */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-text-dim font-semibold mb-2">
              Amount (USDC)
            </label>
            <div className="grid grid-cols-5 gap-2 mb-2">
              {PRESET_AMOUNTS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => {
                    setAmount(a);
                    setCustomAmount("");
                  }}
                  className={cn(
                    "py-2 rounded-lg text-sm font-mono font-semibold transition-all",
                    amount === a && !customAmount
                      ? "bg-pink-500/20 border border-pink-500/50 text-pink-200"
                      : "bg-bg-elevated border border-border text-text-muted hover:border-pink-500/30 hover:text-text"
                  )}
                >
                  ${a}
                </button>
              ))}
            </div>
            <input
              type="number"
              step="0.01"
              min="0.0001"
              max="100"
              placeholder="Custom amount"
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value);
                const n = parseFloat(e.target.value);
                if (Number.isFinite(n)) setAmount(n);
              }}
              className="input font-mono"
            />
          </div>

          {/* Wallet */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-text-dim font-semibold mb-2">
              Your Arc wallet address
            </label>
            <input
              type="text"
              placeholder="0xYourWallet..."
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              className="input font-mono text-xs"
              required
            />
            <p className="text-xs text-text-dim mt-1.5">
              Fund this address with testnet USDC via{" "}
              <a
                href="https://faucet.circle.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-0.5"
              >
                faucet.circle.com
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>

          {/* Name (optional) */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-text-dim font-semibold mb-2">
              Your name (optional)
            </label>
            <input
              type="text"
              placeholder="Anon"
              value={tipperName}
              onChange={(e) => setTipperName(e.target.value)}
              className="input"
              maxLength={64}
            />
          </div>

          {result && !result.ok && (
            <p className="text-sm text-danger">{result.message}</p>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Coins className="w-4 h-4" />
                  Send ${formatUSDC(amount)}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setResult(null);
              }}
              className="btn-ghost"
              disabled={submitting}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function TipSuccess({
  message,
  txHash,
  netUSDC,
  feeUSDC,
  onClose,
}: {
  message: string;
  txHash?: string;
  netUSDC?: number;
  feeUSDC?: number;
  onClose: () => void;
}) {
  const arcscan = arcscanTxUrl(txHash);
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-success/10 border border-success/30">
        <div className="w-9 h-9 rounded-lg bg-success/20 flex items-center justify-center text-success shrink-0">
          <Heart className="w-4 h-4" fill="currentColor" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-success mb-1">Tip sent</p>
          <p className="text-sm text-text-muted">{message}</p>
          {txHash && (
            <p className="text-xs text-text-dim font-mono mt-2 break-all">
              {shortAddress(txHash, 10)}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {arcscan && (
          <a href={arcscan} target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm">
            View on Arcscan
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
        <button onClick={onClose} className="btn-ghost">
          Done
        </button>
      </div>
    </div>
  );
}