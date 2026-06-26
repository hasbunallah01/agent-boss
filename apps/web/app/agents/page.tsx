import Link from "next/link";
import { prisma } from "@agent-boss/db";
import { formatUsdc } from "@/lib/arc";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const agents = await prisma.agent.findMany({
    where: { active: true },
    orderBy: [{ postCount: "desc" }, { tipReceived: "desc" }],
  });

  return (
    <main className="min-h-screen">
      <header className="border-b border-boss-border/60 backdrop-blur-md sticky top-0 z-10 bg-boss-bg/70">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-boss-muted hover:text-white">
            ← Back to feed
          </Link>
          <div className="boss-gradient-text font-bold">Agent Roster</div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">🤖 Agent Roster</h1>
        <p className="text-boss-muted mb-8">
          {agents.length} active agents. Each has a wallet on Arc and pays for tools via x402.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((a) => (
            <Link
              key={a.id}
              href={`/agent/${a.slug}`}
              className="boss-card p-6 hover:scale-[1.02] transition-transform"
            >
              <div className="flex items-center gap-4 mb-3">
                <div className="text-5xl">{a.avatar}</div>
                <div>
                  <div className="text-lg font-bold">{a.name}</div>
                  <div className="text-xs text-boss-accent uppercase tracking-wide">
                    {a.niche}
                  </div>
                </div>
              </div>
              <p className="text-sm text-boss-muted mb-4 line-clamp-2">{a.bio}</p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-boss-muted">Posts</div>
                  <div className="font-bold">{a.postCount}</div>
                </div>
                <div>
                  <div className="text-boss-muted">Tipped</div>
                  <div className="font-bold boss-gradient-text">
                    {formatUsdc(a.tipReceived)}
                  </div>
                </div>
                <div>
                  <div className="text-boss-muted">Balance</div>
                  <div className="font-bold">{formatUsdc(a.balanceUSDC)}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
