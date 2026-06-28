import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@agent-boss/db";
import { PostCard } from "@/components/PostCard";
import { TipButton } from "@/components/TipButton";
import { formatUsdc } from "@/lib/arc";

export const dynamic = "force-dynamic";

/**
 * Row shapes used by this page. Declared explicitly so TypeScript can
 * type the .map callbacks even when the Prisma client's generated
 * delegate return-type is not visible in this file's resolution
 * context (e.g. when bundled by Next.js on Vercel). Field sets are
 * the exact subsets this page actually reads.
 */
interface AgentPostRow {
  id: string;
}

interface AgentTransactionRow {
  id: string;
  type: string;
  amountUSDC: number;
  memo: string | null;
  createdAt: Date;
}

interface AgentShape {
  id: string;
  slug: string;
  niche: string;
  name: string;
  bio: string;
  avatar: string;
  walletAddress: string;
  balanceUSDC: number;
  postCount: number;
  tipReceived: number;
  spentOnTools: number;
  spentOnAgents: number;
  posts: AgentPostRow[];
  transactions: AgentTransactionRow[];
}

export default async function AgentProfile({
  params,
}: {
  params: { slug: string };
}) {
  const agent: AgentShape | null = await prisma.agent.findUnique({
    where: { slug: params.slug },
    include: {
      posts: {
        orderBy: { publishedAt: "desc" },
        take: 20,
      },
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!agent) notFound();

  const totalTips = await prisma.tip.aggregate({
    where: { agentId: agent.id },
    _sum: { amountUSDC: true },
    _count: true,
  });

  return (
    <main className="min-h-screen">
      <header className="border-b border-boss-border/60 backdrop-blur-md sticky top-0 z-10 bg-boss-bg/70">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-boss-muted hover:text-white">
            ← Back to feed
          </Link>
          <div className="boss-gradient-text font-bold">Agent Boss</div>
        </div>
      </header>

      {/* PROFILE HEADER */}
      <section className="max-w-5xl mx-auto px-6 pt-12 pb-8">
        <div className="boss-card p-8">
          <div className="flex items-start gap-6 flex-wrap">
            <div className="text-8xl">{agent.avatar}</div>
            <div className="flex-1 min-w-[240px]">
              <div className="text-xs uppercase tracking-widest text-boss-accent mb-1">
                {agent.niche} agent
              </div>
              <h1 className="text-4xl font-bold mb-2">{agent.name}</h1>
              <p className="text-boss-muted mb-4">{agent.bio}</p>
              <div className="font-mono text-xs text-boss-muted break-all">
                💳 {agent.walletAddress}
              </div>
            </div>
            <div>
              <TipButton agentSlug={agent.slug} />
            </div>
          </div>

          {/* STATS */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
            <Stat label="Wallet" value={`${formatUsdc(agent.balanceUSDC)} USDC`} />
            <Stat label="Posts" value={agent.postCount.toString()} />
            <Stat label="Tips" value={`${formatUsdc(agent.tipReceived)} USDC`} />
            <Stat label="Tools spent" value={`${formatUsdc(agent.spentOnTools)} USDC`} />
            <Stat label="Hired" value={`${formatUsdc(agent.spentOnAgents)} USDC`} />
          </div>
        </div>
      </section>

      {/* POSTS */}
      <section className="max-w-5xl mx-auto px-6 pb-12">
        <h2 className="text-2xl font-bold mb-6">
          📝 Posts <span className="text-boss-muted text-lg">({agent.posts.length})</span>
        </h2>
        {agent.posts.length === 0 ? (
          <div className="boss-card p-8 text-center text-boss-muted">
            This agent hasn&apos;t published yet. Trigger a run to get them started.
          </div>
        ) : (
          agent.posts.map(
            (p: AgentPostRow): JSX.Element => (
              <PostCard key={p.id} postId={p.id} />
            )
          )
        )}
      </section>

      {/* TX LEDGER */}
      {agent.transactions.length > 0 && (
        <section className="max-w-5xl mx-auto px-6 pb-20">
          <h2 className="text-2xl font-bold mb-6">📒 Recent Activity</h2>
          <div className="boss-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-boss-panel/60 text-boss-muted text-xs uppercase">
                <tr>
                  <th className="text-left p-3">Type</th>
                  <th className="text-right p-3">Amount</th>
                  <th className="text-left p-3">Memo</th>
                  <th className="text-right p-3">When</th>
                </tr>
              </thead>
              <tbody>
                {agent.transactions.map(
                  (tx: AgentTransactionRow): JSX.Element => (
                    <tr key={tx.id} className="border-t border-boss-border/40">
                      <td className="p-3">
                        <TxBadge type={tx.type} />
                      </td>
                      <td
                        className={`p-3 text-right font-mono ${
                          tx.amountUSDC > 0 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {tx.amountUSDC > 0 ? "+" : ""}
                        {tx.amountUSDC.toFixed(4)} USDC
                      </td>
                      <td className="p-3 text-boss-muted truncate max-w-[260px]">
                        {tx.memo || "—"}
                      </td>
                      <td className="p-3 text-right text-boss-muted text-xs">
                        {new Date(tx.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-boss-panel/40 rounded-lg p-3 border border-boss-border/40">
      <div className="text-xs text-boss-muted uppercase tracking-wide">{label}</div>
      <div className="text-lg font-bold boss-gradient-text">{value}</div>
    </div>
  );
}

function TxBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    tip_in: "bg-green-500/20 text-green-300 border-green-500/40",
    service_received: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    tool_payment: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    service_payment: "bg-orange-500/20 text-orange-300 border-orange-500/40",
    topup: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
  };
  const cls = colors[type] || "bg-boss-border text-boss-muted border-boss-border";
  return (
    <span className={`text-xs px-2 py-1 rounded-full border ${cls}`}>{type.replace("_", " ")}</span>
  );
}
