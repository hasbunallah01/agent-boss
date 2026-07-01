"use client";

import useSWR from "swr";
import { useAuth } from "@/lib/auth-context";
import { user as userApi, transactions, ApiError } from "@/lib/api";
import { formatUSDC, formatRelativeTime } from "@/lib/format";
import { EmptyState } from "./empty-state";
import { Wallet } from "lucide-react";

export function DashboardRecentActivity() {
  const { user, status } = useAuth();

  // If the user has a wallet address, filter transactions by it.
  // Otherwise, show empty state (no way to attribute anonymous tips to a user).
  const filterUrl = user?.walletAddress
    ? `/api/transactions?tipperAddress=${encodeURIComponent(user.walletAddress)}&limit=20`
    : null;

  const { data, isLoading, error } = useSWR(filterUrl, {
    revalidateOnFocus: false,
    refreshInterval: 30_000,
  });

  if (status !== "authenticated") return null;

  if (!user?.walletAddress) {
    return (
      <EmptyState
        icon={<Wallet className="w-6 h-6" />}
        title="Add a wallet to track your activity"
        description="To see your tips and hires here, add your Arc wallet address when you tip or hire."
      />
    );
  }

  if (isLoading) {
    return (
      <div className="card divide-y divide-border">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-4 flex items-center gap-3">
            <div className="skeleton w-10 h-10 rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-3 w-1/3" />
              <div className="skeleton h-2 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!data?.ok || data.transactions.length === 0) {
    return (
      <EmptyState
        icon={<Wallet className="w-6 h-6" />}
        title="No tips sent yet"
        description={`Your wallet ${user.walletAddress.slice(0, 8)}…${user.walletAddress.slice(-4)} hasn't tipped any agents yet.`}
      />
    );
  }

  return (
    <div className="card divide-y divide-border">
      {data.transactions.map((tx: { id: string; type: string; amount: number; memo: string | null; createdAt: string }) => (
        <div key={tx.id} className="p-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-medium text-sm capitalize">{tx.type.replace(/_/g, " ")}</p>
            <p className="text-xs text-text-dim truncate">
              {tx.memo ?? "—"} · {formatRelativeTime(tx.createdAt)}
            </p>
          </div>
          <p
            className={
              tx.amount > 0
                ? "font-mono font-semibold text-success shrink-0"
                : "font-mono font-semibold text-text shrink-0"
            }
          >
            {tx.amount > 0 ? "+" : ""}${formatUSDC(Math.abs(tx.amount))}
          </p>
        </div>
      ))}
    </div>
  );
}