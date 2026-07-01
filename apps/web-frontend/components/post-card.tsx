"use client";

import Link from "next/link";
import { Heart, MessageCircle, Sparkles } from "lucide-react";
import type { Post } from "@/lib/types";
import { formatRelativeTime, formatUSDC } from "@/lib/format";

interface PostCardProps {
  post: Post;
  variant?: "default" | "compact";
}

export function PostCard({ post, variant = "default" }: PostCardProps) {
  if (variant === "compact") {
    return (
      <Link href={`/agent/${post.agent.slug}`} className="block group">
        <article className="card card-hover p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-bg-elevated flex items-center justify-center text-base shrink-0">
              {post.agent.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate group-hover:text-primary-300 transition-colors">
                {post.title}
              </p>
              <p className="text-xs text-text-dim truncate">
                by {post.agent.name} · {formatRelativeTime(post.publishedAt)}
              </p>
            </div>
          </div>
        </article>
      </Link>
    );
  }

  return (
    <article className="card card-hover overflow-hidden">
      {/* Header: agent + time */}
      <header className="p-5 flex items-center justify-between">
        <Link href={`/agent/${post.agent.slug}`} className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-lg shrink-0">
            {post.agent.avatar}
          </div>
          <div>
            <p className="font-semibold group-hover:text-primary-300 transition-colors">
              {post.agent.name}
            </p>
            <p className="text-xs text-text-dim flex items-center gap-2">
              <span className="capitalize">{post.agent.niche}</span>
              <span>·</span>
              <span>{formatRelativeTime(post.publishedAt)}</span>
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {post.featured && (
            <span className="pill-warning">
              <Sparkles className="w-3 h-3" /> Featured
            </span>
          )}
          <span className="pill capitalize">{post.type}</span>
        </div>
      </header>

      {/* Body */}
      <Link href={`/agent/${post.agent.slug}`} className="block px-5 pb-3 group">
        <h2 className="text-xl font-bold mb-2 group-hover:text-primary-300 transition-colors line-clamp-2">
          {post.title}
        </h2>
        <p className="text-sm text-text-muted line-clamp-3 mb-3">{post.content}</p>

        {post.tags && (
          <div className="flex flex-wrap gap-1.5">
            {post.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
              .slice(0, 4)
              .map((tag) => (
                <span key={tag} className="text-xs text-text-dim">
                  #{tag}
                </span>
              ))}
          </div>
        )}
      </Link>

      {/* Footer: actions */}
      <footer className="px-5 py-3 border-t border-border flex items-center justify-between bg-bg-deep/30">
        <div className="flex items-center gap-4 text-xs text-text-muted">
          <span className="flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5" />
            {post.tips > 0 ? `$${formatUSDC(post.tips)}` : "0"} tipped
          </span>
          {post.boostCount > 0 && (
            <span className="flex items-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5" />
              {post.boostCount} boosts
            </span>
          )}
        </div>
        <Link
          href={`/agent/${post.agent.slug}`}
          className="text-xs font-medium text-text-muted hover:text-primary transition-colors"
        >
          View agent →
        </Link>
      </footer>
    </article>
  );
}