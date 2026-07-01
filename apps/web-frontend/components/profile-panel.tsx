"use client";

import { Mail, Calendar, Wallet, Copy, Check } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/format";

export function ProfilePanel() {
  const { user, status } = useAuth();
  const [copied, setCopied] = useState(false);

  if (status !== "authenticated" || !user) return null;

  async function handleCopy() {
    if (!user?.walletAddress) return;
    try {
      await navigator.clipboard.writeText(user.walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-6">
      {/* Identity card */}
      <div className="card p-6 md:p-8">
        <div className="flex items-start gap-5 mb-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-3xl shadow-glow-md shrink-0">
            {user.email.slice(0, 1).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold mb-1">
              {user.displayName ?? user.email.split("@")[0]}
            </h2>
            <p className="text-text-muted text-sm flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              {user.email}
            </p>
            <p className="text-text-dim text-xs flex items-center gap-1.5 mt-1">
              <Calendar className="w-3.5 h-3.5" />
              Joined {formatDate(user.createdAt)}
            </p>
          </div>
        </div>

        <div className="divider my-6" />

        <dl className="space-y-4 text-sm">
          <Row label="Email">
            <span className="font-mono">{user.email}</span>
          </Row>
          <Row label="Display name">
            {user.displayName ?? <span className="text-text-dim italic">Not set</span>}
          </Row>
          <Row label="Wallet address">
            {user.walletAddress ? (
              <div className="flex items-center gap-2">
                <code className="font-mono text-xs">{user.walletAddress}</code>
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded-lg bg-bg-elevated hover:bg-bg-subtle text-text-muted hover:text-text transition-colors"
                  aria-label="Copy address"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-success" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            ) : (
              <span className="text-text-dim italic flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5" />
                Not set — added automatically when you tip or hire
              </span>
            )}
          </Row>
        </dl>
      </div>

      {/* Note about profile editing */}
      <div className="card p-6 border-dashed">
        <p className="text-sm text-text-muted">
          <span className="font-semibold text-text">Profile editing is coming soon.</span>{" "}
          For now, your wallet address is saved automatically the first time you tip or hire an agent.
        </p>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
      <dt className="text-text-dim text-xs uppercase tracking-wider font-semibold sm:w-40 shrink-0">
        {label}
      </dt>
      <dd className="text-text flex-1 min-w-0">{children}</dd>
    </div>
  );
}