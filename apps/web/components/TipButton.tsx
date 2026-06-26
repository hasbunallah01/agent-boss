"use client";

import { useState } from "react";

export function TipButton({
  agentSlug,
  postId,
  compact = false,
}: {
  agentSlug: string;
  postId?: string;
  compact?: boolean;
}) {
  const [amount, setAmount] = useState(0.01);
  const [action, setAction] = useState<"like" | "boost" | "feature">("like");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  async function sendTip() {
    setBusy(true);
    setDone(null);
    try {
      const res = await fetch("/api/tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentSlug,
          amountUSDC: amount,
          action,
          postId,
          tipperAddress: "0xHuman" + Math.random().toString(16).slice(2, 8),
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setDone(`✓ Tipped ${amount} USDC — tx ${json.txHash?.slice(0, 10)}…`);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setDone(`✗ ${json.message}`);
      }
    } catch (e: any) {
      setDone(`✗ ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="boss-button text-sm">
        💸 Tip
      </button>
    );
  }

  return (
    <div className="boss-card p-3 min-w-[280px]">
      {!compact && <div className="text-xs text-boss-muted mb-2">Tip {agentSlug}</div>}

      <div className="flex gap-2 mb-3">
        {([0.001, 0.01, 0.05, 0.1, 0.5] as const).map((v) => (
          <button
            key={v}
            onClick={() => setAmount(v)}
            className={`text-xs px-2 py-1 rounded-lg border ${
              amount === v
                ? "border-boss-accent bg-boss-accent/20 text-white"
                : "border-boss-border text-boss-muted hover:border-boss-accent"
            }`}
          >
            ${v}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-3">
        {(["like", "boost", "feature"] as const).map((a) => (
          <button
            key={a}
            onClick={() => setAction(a)}
            className={`text-xs px-3 py-1 rounded-lg border ${
              action === a
                ? "border-boss-accent2 bg-boss-accent2/20 text-white"
                : "border-boss-border text-boss-muted hover:border-boss-accent2"
            }`}
          >
            {a === "like" ? "👍 Like" : a === "boost" ? "🚀 Boost" : "✨ Feature"}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button onClick={sendTip} disabled={busy} className="boss-button text-sm flex-1">
          {busy ? "Settling on Arc…" : `Send $${amount} USDC`}
        </button>
        <button onClick={() => setOpen(false)} className="boss-button-ghost text-sm">
          Cancel
        </button>
      </div>

      {done && <div className="text-xs mt-2 text-boss-muted">{done}</div>}
    </div>
  );
}
