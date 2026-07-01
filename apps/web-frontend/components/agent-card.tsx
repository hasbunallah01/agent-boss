"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Agent } from "@/lib/types";
import { formatUSDC } from "@/lib/format";

interface AgentCardProps {
  agent: Agent;
  variant?: "default" | "compact" | "featured";
}

const NICHE_GRADIENT: Record<string, string> = {
  writer: "from-primary to-accent",
  artist: "from-pink-500 to-orange-500",
  translator: "from-emerald-500 to-cyan-500",
  curator: "from-amber-500 to-rose-500",
  musician: "from-violet-500 to-fuchsia-500",
  analyst: "from-sky-500 to-indigo-500",
};

export function AgentCard({ agent, variant = "default" }: AgentCardProps) {
  const grad = NICHE_GRADIENT[agent.niche] ?? "from-primary to-accent";

  if (variant === "compact") {
    return (
      <Link
        href={`/agent/${agent.slug}`}
        className="group flex items-center gap-3 p-3 rounded-xl bg-bg-surface border border-border hover:border-primary/40 transition-all"
      >
        <div
          className={`w-10 h-10 shrink-0 rounded-lg bg-gradient-to-br ${grad} flex items-center justify-center text-xl shadow-glow-sm`}
        >
          {agent.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate group-hover:text-primary-300 transition-colors">
            {agent.name}
          </p>
          <p className="text-xs text-text-dim capitalize">{agent.niche}</p>
        </div>
        <ArrowUpRight className="w-4 h-4 text-text-dim group-hover:text-primary transition-colors" />
      </Link>
    );
  }

  if (variant === "featured") {
    return (
      <Link
        href={`/agent/${agent.slug}`}
        className="group card card-hover p-6 relative overflow-hidden"
      >
        <div
          className={`absolute -top-12 -right-12 w-48 h-48 rounded-full bg-gradient-to-br ${grad} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity`}
        />
        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <div
              className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center text-3xl shadow-glow-sm`}
            >
              {agent.avatar}
            </div>
            <span className="pill-primary capitalize">{agent.niche}</span>
          </div>
          <h3 className="font-bold text-lg mb-1 group-hover:text-primary-300 transition-colors">
            {agent.name}
          </h3>
          <p className="text-sm text-text-muted line-clamp-2 mb-4">{agent.bio}</p>
          <div className="flex items-center justify-between text-xs text-text-dim">
            <span>{agent.postCount} posts</span>
            <span className="font-mono">${formatUSDC(agent.tipReceived)} earned</span>
          </div>
        </div>
      </Link>
    );
  }

  // Default variant
  return (
    <Link
      href={`/agent/${agent.slug}`}
      className="group card card-hover p-5 relative overflow-hidden"
    >
      <div
        className={`absolute -top-8 -right-8 w-32 h-32 rounded-full bg-gradient-to-br ${grad} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity`}
      />
      <div className="relative">
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-2xl shadow-glow-sm`}
          >
            {agent.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate group-hover:text-primary-300 transition-colors">
                {agent.name}
              </h3>
              <span className="pill capitalize text-[10px]">{agent.niche}</span>
            </div>
            <p className="text-xs text-text-muted line-clamp-2">{agent.bio}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-border">
          <Stat label="Posts" value={String(agent.postCount)} />
          <Stat label="Tips" value={`$${formatUSDC(agent.tipReceived)}`} mono />
          <Stat label="Active" value={agent.active ? "Yes" : "No"} mono={false} />
        </div>
      </div>
    </Link>
  );
}

function Stat({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-text-dim font-semibold">
        {label}
      </p>
      <p className={mono ? "font-mono text-sm font-semibold mt-0.5" : "text-sm font-semibold mt-0.5"}>
        {value}
      </p>
    </div>
  );
}