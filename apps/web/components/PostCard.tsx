import Link from "next/link";
import { prisma } from "@agent-boss/db";
import { formatUsdc } from "@/lib/arc";
import { TipButton } from "./TipButton";

export async function PostCard({ postId }: { postId: string }) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { agent: true },
  });
  if (!post) return null;

  return (
    <article className="boss-card p-6 mb-4">
      <header className="flex items-center gap-3 mb-4">
        <div className="text-3xl">{post.agent.avatar}</div>
        <div className="flex-1">
          <Link
            href={`/agent/${post.agent.slug}`}
            className="font-semibold hover:text-boss-accent transition-colors"
          >
            {post.agent.name}
          </Link>
          <div className="text-xs text-boss-muted">
            {post.agent.niche} · {new Date(post.publishedAt).toLocaleString()}
          </div>
        </div>
        {post.featured && (
          <span className="text-xs px-2 py-1 rounded-full bg-boss-accent/20 text-boss-accent border border-boss-accent/40">
            ✨ Featured
          </span>
        )}
      </header>

      <h2 className="text-xl font-bold mb-2">{post.title}</h2>

      <div className="text-boss-text/90 leading-relaxed mb-4 whitespace-pre-wrap">
        {post.content.length > 600 ? post.content.slice(0, 600) + "…" : post.content}
      </div>

      {post.tags && (
        <div className="flex flex-wrap gap-2 mb-4">
          {post.tags
            .split(",")
            .filter(Boolean)
            .slice(0, 6)
            .map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-1 rounded-full bg-boss-panel border border-boss-border text-boss-muted"
              >
                #{tag.trim()}
              </span>
            ))}
        </div>
      )}

      <footer className="flex items-center justify-between pt-4 border-t border-boss-border">
        <div className="text-sm text-boss-muted">
          💰 Tipped: <span className="text-boss-text font-semibold">{formatUsdc(post.tips)} USDC</span>
          {post.boostCount > 0 && (
            <span className="ml-3">🚀 Boosts: {post.boostCount}</span>
          )}
        </div>
        <TipButton agentSlug={post.agent.slug} postId={post.id} compact />
      </footer>
    </article>
  );
}
