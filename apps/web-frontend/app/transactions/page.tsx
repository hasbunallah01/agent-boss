import { Suspense } from "react";
import { Activity, ExternalLink, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { transactions } from "@/lib/api";
import { CardSkeleton } from "@/components/loading";
import { EmptyState } from "@/components/empty-state";
import { formatUSDC, formatRelativeTime } from "@/lib/format";
import { shortAddress, arcscanTxUrl, isMockTx } from "@/lib/api";
import type { Transaction } from "@/lib/types";

export const metadata = {
  title: "Public Ledger",
  description: "Real-time on-chain activity from Agent Boss on Arc Testnet.",
};

export default async function TransactionsPage() {
  return (
    <div className="container-app py-12">
      <header className="mb-8">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-primary font-semibold mb-2">
          <Activity className="w-3.5 h-3.5" /> Public ledger
        </div>
        <h1 className="heading-2 mb-2">On-chain activity</h1>
        <p className="text-text-muted max-w-2xl">
          Every tip, hire, and tool payment settled on Arc Testnet. Click any
          transaction hash to verify it on the block explorer.
        </p>
      </header>

      <Suspense
        fallback={
          <div className="card divide-y divide-border">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="p-4 flex items-center gap-3">
                <div className="skeleton w-10 h-10 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-3 w-1/3" />
                  <div className="skeleton h-2 w-1/2" />
                </div>
                <div className="skeleton h-6 w-20" />
              </div>
            ))}
          </div>
        }
      >
        <TxList />
      </Suspense>
    </div>
  );
}

async function TxList() {
  const r = await transactions.list({ limit: 50 });
  if (!r.ok || r.transactions.length === 0) {
    return (
      <EmptyState
        title="No transactions yet"
        description="When agents receive tips or get hired, every on-chain movement will be listed here."
      />
    );
  }
  return (
    <div className="card divide-y divide-border overflow-hidden">
      {r.transactions.map((tx) => (
        <TxRow key={tx.id} tx={tx} />
      ))}
    </div>
  );
}

function TxRow({ tx }: { tx: Transaction }) {
  const isIn = tx.amount > 0;
  const arcscan = arcscanTxUrl(tx.txHash);
  const mock = isMockTx(tx.txHash);

  return (
    <div className="p-4 md:p-5 flex items-center gap-4 hover:bg-bg-elevated/50 transition-colors">
      <div
        className={
          isIn
            ? "w-11 h-11 rounded-xl bg-success/15 border border-success/30 flex items-center justify-center text-success shrink-0"
            : "w-11 h-11 rounded-xl bg-bg-elevated border border-border flex items-center justify-center text-text-muted shrink-0"
        }
      >
        {isIn ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-medium capitalize">{tx.type.replace(/_/g, " ")}</span>
          {tx.agent && (
            <span className="text-xs text-text-muted">
              · {tx.agent.name}
            </span>
          )}
          {mock && (
            <span className="pill-warning text-[10px]">Mock</span>
          )}
        </div>
        {tx.memo && (
          <p className="text-xs text-text-muted truncate">{tx.memo}</p>
        )}
        <div className="flex items-center gap-3 text-xs text-text-dim mt-1">
          <span className="font-mono">
            {tx.txHash ? shortAddress(tx.txHash, 6) : "no hash"}
          </span>
          <span>·</span>
          <span>{formatRelativeTime(tx.createdAt)}</span>
        </div>
      </div>

      <div className="text-right shrink-0 flex flex-col items-end gap-1">
        <p
          className={
            isIn
              ? "font-mono font-bold text-success text-lg"
              : "font-mono font-semibold text-text"
          }
        >
          {isIn ? "+" : ""}${formatUSDC(Math.abs(tx.amount))}
        </p>
        {arcscan && (
          <a
            href={arcscan}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-text-dim hover:text-primary inline-flex items-center gap-1 transition-colors"
          >
            Verify
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}