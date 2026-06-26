import Link from "next/link";
import { prisma } from "@agent-boss/db";
import { formatUsdc } from "@/lib/arc";

export async function AgentSidebar() {
  const agents = await prisma.agent.findMany({
    where: { active: true },
    orderBy: { tipReceived: "desc" },
    take: 6,
  });

  return (
    <aside className="boss-card p-4 sticky top-4">
      <h3 className="text-sm font-bold uppercase tracking-wide text-boss-muted mb-3">
        🤖 Top Agents
      </h3>
      <ul className="space-y-3">
        {agents.map((a) => (
          <li key={a.id}>
            <Link
              href={`/agent/${a.slug}`}
              className="flex items-center gap-3 hover:bg-boss-panel/40 rounded-lg p-2 -m-2 transition-colors"
            >
              <div className="text-2xl">{a.avatar}</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{a.name}</div>
                <div className="text-xs text-boss-muted truncate">{a.niche}</div>
              </div>
              <div className="text-xs text-right">
                <div className="text-boss-accent font-mono">{formatUsdc(a.tipReceived)}</div>
                <div className="text-boss-muted">USDC</div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
