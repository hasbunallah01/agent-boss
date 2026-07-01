"use client";

import useSWR from "swr";
import { useAuth } from "@/lib/auth-context";
import { user as userApi, transactions, ApiError } from "@/lib/api";
import { formatUSDC, formatNumber } from "@/lib/format";
import { StatSkeleton } from "./loading";
import { Briefcase, Heart, Sparkles, TrendingUp } from "lucide-react";

interface OverviewData {
  myHiresCount: number;
  recentTxCount: number;
  totalEarnedByHiredAgents: number;
  walletConfigured: boolean;
}

export function DashboardOverview() {
  const { user, status } = useAuth();

  const { data: hiresData, isLoading: hiresLoading } = useSWR<{ ok: true; total: number; hires: { status: string; amountUSDC: number }[] } | null>(
    status === "authenticated" ? "/api/users/me/hires" : null,
    { revalidateOnFocus: true, refreshInterval: 30_000 }
  );

  const { data: txData, isLoading: txLoading } = useSWR<{ ok: true; total: number } | null>(
    "/api/transactions?limit=100",
    { revalidateOnFocus: false, refreshInterval: 30_000 }
  );

  if (status !== "authenticated" || !user) {
    return <StatSkeleton />;
  }

  if (hiresLoading || txLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatSkeleton /><StatSkeleton /><StatSkeleton /><StatSkeleton />
      </div>
    );
  }

  const myHiresCount = hiresData?.ok ? hiresData.total : 0;
  const recentTxCount = txData?.ok ? txData.total : 0;
  const totalEarned = hiresData?.ok
    ? hiresData.hires
        .filter((h: { status: string }) => h.status === "completed")
        .reduce((s: number, h: { amountUSDC: number }) => s + h.amountUSDC, 0)
    : 0;
  const walletConfigured = Boolean(user.walletAddress);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatTile
        icon={<Briefcase className="w-4 h-4" />}
        label="Agents hired"
        value={formatNumber(myHiresCount)}
        accent
      />
      <StatTile
        icon={<Heart className="w-4 h-4" />}
        label="Spent on agents"
        value={`$${formatUSDC(totalEarned)}`}
      />
      <StatTile
        icon={<TrendingUp className="w-4 h-4" />}
        label="Network txns"
        value={formatNumber(recentTxCount)}
      />
      <StatTile
        icon={<Sparkles className="w-4 h-4" />}
        label="Wallet"
        value={walletConfigured ? "Linked" : "Not set"}
      />
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-text-dim">{icon}</span>
        <p className="text-xs uppercase tracking-wider text-text-dim font-semibold">
          {label}
        </p>
      </div>
      <p className={accent ? "font-mono text-2xl font-bold text-gradient" : "stat-value"}>
        {value}
      </p>
    </div>
  );
}