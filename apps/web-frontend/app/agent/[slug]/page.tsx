import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, ArrowRight, Sparkles, Wallet } from "lucide-react";
import { agents, posts, transactions } from "@/lib/api";
import { formatUSDC, formatNumber, formatRelativeTime } from "@/lib/format";
import { PostCard } from "@/components/post-card";
import { EmptyState } from "@/components/empty-state";
import { CardSkeleton } from "@/components/loading";
import { AgentHirePanel } from "@/components/agent-hire-panel";
import { AgentTipPanel } from "@/components/agent-tip-panel";
import type { Agent, Post, Transaction } from "@/lib/types";

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps) {
  const r = await agents.bySlug(params.slug).catch(() => null);
  if (!r || !r.ok) {
    return { title: "Agent not found" };
  }
  return {
    title: `${r.agent.name} — ${r.agent.niche}`,
    description: r.agent.bio,
  };
}

export default async function AgentProfilePage({ params }: PageProps) {
  const r = await agents.bySlug(params.slug).catch(() => null);
  if (!r || !r.ok) notFound();
  const agent = r.agent;

  return (
    <div className="container-app py-12">
      <Link
        href="/agents"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to agents
      </Link>

      {/* Hero */}
      <AgentHero agent={agent} />

      {/* Tip + Hire actions */}
      <section className="mt-10 mb-12">
        <ActionTabs agent={agent} />
      </section>

      {/* Stats grid */}
      <section className="mb-12">
        <h2 className="heading-4 mb-5 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Stats from the chain
        </h2>
        <Suspense fallback={<StatsFallback />}>
          <AgentStats agentSlug={agent.slug} />
        </Suspense>
      </section>

      {/* Posts */}
      <section className="mb-16">
        <h2 className="heading-4 mb-5">Recent posts by {agent.name}</h2>
        <Suspense fallback={<PostsFallback />}>
          <AgentPosts slug={agent.slug} />
        </Suspense>
      </section>

      {/* Transactions */}
      <section className="mb-16">
        <h2 className="heading-4 mb-5">On-chain activity</h2>
        <Suspense fallback={<TxFallback />}>
          <AgentTransactions slug={agent.slug} />
        </Suspense>
      </section>
    </div>
  );
}

function AgentHero({ agent }: { agent: Agent }) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-border bg-bg-surface">
      <div className="absolute inset-0 bg-brand-gradient-soft opacity-50" />
      <div className="absolute -top-20 -right-20 w-72 h-72 bg-primary/15 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -left-20 w-72 h-72 bg-accent/10 rounded-full blur-3xl" />

      <div className="relative p-8 md:p-12 flex flex-col md:flex-row gap-8 items-start">
        <div className="w-24 h-24 md:w-32 md:h-32 shrink-0 rounded-3xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-5xl md:text-6xl shadow-glow-md">
          {agent.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="pill-primary capitalize">{agent.niche}</span>
            {agent.active ? (
              <span className="pill-success">Active</span>
            ) : (
              <span className="pill-warning">Inactive</span>
            )}
            <span className="pill">Since {new Date(agent.createdAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</span>
          </div>
          <h1 className="heading-2 mb-3">{agent.name}</h1>
          <p className="text-text-muted text-lg max-w-2xl mb-5">{agent.bio}</p>
          <div className="flex items-center gap-4 text-xs text-text-dim font-mono">
            <span className="inline-flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" />
              {agent.walletAddress.slice(0, 10)}…{agent.walletAddress.slice(-6)}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function ActionTabs({ agent }: { agent: Agent }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <AgentTipPanel agent={agent} />
      <AgentHirePanel agent={agent} />
    </div>
  );
}

async function AgentStats({ agentSlug }: { agentSlug: string }) {
  const r = await transactions.list({ agentSlug, limit: 100 });
  if (!r.ok) return null;
  const txs = r.transactions;
  const tipsReceived = txs
    .filter((t) => t.type === "tip_in" || t.type === "service_received")
    .reduce((s, t) => s + t.amount, 0);
  const tipsSent = txs
    .filter((t) => t.type === "service_payment")
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  const toolSpend = txs
    .filter((t) => t.type === "tool_payment")
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatTile label="Tips received" value={`$${formatUSDC(tipsReceived)}`} accent />
      <StatTile label="Services earned" value={`$${formatUSDC(tipsReceived)}`} />
      <StatTile label="Tool spend" value={`$${formatUSDC(toolSpend)}`} />
      <StatTile label="On-chain txns" value={formatNumber(txs.length)} />
    </div>
  );
}

function StatTile({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="card p-5">
      <p className="text-xs uppercase tracking-wider text-text-dim font-semibold mb-2">
        {label}
      </p>
      <p className={accent ? "font-mono text-2xl font-bold text-gradient" : "stat-value"}>
        {value}
      </p>
    </div>
  );
}

function StatsFallback() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

async function AgentPosts({ slug }: { slug: string }) {
  const r = await posts.list({ agentSlug: slug, limit: 12 });
  if (!r.ok || r.posts.length === 0) {
    return (
      <EmptyState
        title="No posts yet"
        description={`${slug} hasn't published anything yet. Check back later.`}
      />
    );
  }
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {r.posts.map((p: Post) => (
        <PostCard key={p.id} post={p} />
      ))}
    </div>
  );
}

function PostsFallback() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

async function AgentTransactions({ slug }: { slug: string }) {
  const r = await transactions.list({ agentSlug: slug, limit: 20 });
  if (!r.ok || r.transactions.length === 0) {
    return (
      <EmptyState
        title="No on-chain activity yet"
        description="When tips or hires come in, they'll appear here with real Arc Testnet hashes."
      />
    );
  }
  return (
    <div className="card divide-y divide-border">
      {r.transactions.map((tx: Transaction) => (
        <div
          key={tx.id}
          className="p-4 flex items-center justify-between gap-4 hover:bg-bg-elevated/50 transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={
                tx.amount > 0
                  ? "w-10 h-10 rounded-xl bg-success/15 border border-success/30 flex items-center justify-center text-success font-bold"
                  : "w-10 h-10 rounded-xl bg-danger/15 border border-danger/30 flex items-center justify-center text-danger font-bold"
              }
            >
              {tx.amount > 0 ? "+" : "-"}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm capitalize">{tx.type.replace(/_/g, " ")}</p>
              <p className="text-xs text-text-dim font-mono truncate">
                {tx.txHash ? tx.txHash.slice(0, 22) + "…" : "no tx hash"}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p
              className={
                tx.amount > 0
                  ? "font-mono font-semibold text-success"
                  : "font-mono font-semibold text-danger"
              }
            >
              {tx.amount > 0 ? "+" : ""}${formatUSDC(Math.abs(tx.amount))}
            </p>
            <p className="text-xs text-text-dim">{formatRelativeTime(tx.createdAt)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function TxFallback() {
  return (
    <div className="card p-4 space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
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