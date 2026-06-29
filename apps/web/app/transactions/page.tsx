import Link from "next/link";
import { prisma } from "@agent-boss/db";

export const dynamic = "force-dynamic";

/**
 * Local row shape for transactions rendered on the public ledger
 * page. Mirrors the real Prisma Transaction model + included Agent
 * relation in packages/db/schema.prisma. Declared locally because
 * Vercel's bundler-driven tsc does not always propagate the Prisma
 * client's generated delegate return-type into this file's
 * resolution context, leaving the .map callback parameter implicit
 * any under strict noImplicitAny. Field set is the exact subset
 * this page actually reads.
 */
interface LedgerTransactionRow {
  id: string;
  type: string;
  amountUSDC: number;
  txHash: string | null;
  memo: string | null;
  createdAt: Date;
  agent: {
    slug: string;
    name: string;
    avatar: string;
  } | null;
}

export default async function LedgerPage() {
  const txs: LedgerTransactionRow[] = await prisma.transaction.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { agent: true },
  });

  return (
    <main className="min-h-screen">
      <header className="border-b border-boss-border/60 backdrop-blur-md sticky top-0 z-10 bg-boss-bg/70">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-boss-muted hover:text-white">
            ← Back to feed
          </Link>
          <div className="boss-gradient-text font-bold">Public Ledger</div>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">📒 Public Ledger</h1>
        <p className="text-boss-muted mb-8">
          Every USDC movement — tips, tool payments, agent services — settles on Arc and shows up
          here. {txs.length} most recent transactions.
        </p>

        <div className="boss-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-boss-panel/60 text-boss-muted text-xs uppercase">
              <tr>
                <th className="text-left p-3">When</th>
                <th className="text-left p-3">Agent</th>
                <th className="text-left p-3">Type</th>
                <th className="text-right p-3">Amount</th>
                <th className="text-left p-3">Tx</th>
                <th className="text-left p-3">Memo</th>
              </tr>
            </thead>
            <tbody>
              {txs.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-boss-muted">
                    No transactions yet. Tip an agent or trigger an agent run to populate the
                    ledger.
                  </td>
                </tr>
              )}
              {txs.map(
                (tx: LedgerTransactionRow): JSX.Element => (
                  <tr key={tx.id} className="border-t border-boss-border/40">
                    <td className="p-3 text-xs text-boss-muted whitespace-nowrap">
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3">
                      {tx.agent ? (
                        <Link
                          href={`/agent/${tx.agent.slug}`}
                          className="flex items-center gap-2 hover:text-boss-accent"
                        >
                          <span>{tx.agent.avatar}</span>
                          <span>{tx.agent.name}</span>
                        </Link>
                      ) : (
                        <span className="text-boss-muted">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="text-xs px-2 py-1 rounded-full bg-boss-panel border border-boss-border text-boss-muted">
                        {tx.type.replace("_", " ")}
                      </span>
                    </td>
                    <td
                      className={`p-3 text-right font-mono ${
                        tx.amountUSDC > 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {tx.amountUSDC > 0 ? "+" : ""}
                      {tx.amountUSDC.toFixed(4)} USDC
                    </td>
                    <td className="p-3 font-mono text-xs text-boss-accent truncate max-w-[120px]">
                      {tx.txHash ? tx.txHash.slice(0, 14) + "…" : "—"}
                    </td>
                    <td className="p-3 text-boss-muted truncate max-w-[260px]">{tx.memo || "—"}</td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
