"use client";

import useSWR from "swr";
import Link from "next/link";
import { Briefcase, ExternalLink, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { user as userApi } from "@/lib/api";
import { shortAddress, arcscanTxUrl } from "@/lib/api";
import { formatUSDC, formatRelativeTime } from "@/lib/format";
import { EmptyState } from "./empty-state";
import type { Hire } from "@/lib/types";

export function HiredAgentsPanel() {
  const { status } = useAuth();
  const { data, error, isLoading } = useSWR<{ ok: true; total: number; hires: Hire[] } | { ok: false; message: string }>(
    status === "authenticated" ? "/api/users/me/hires" : null,
    { revalidateOnFocus: false, refreshInterval: 30_000 }
  );

  if (status !== "authenticated") return null;

  if (isLoading) {
    return (
      <div className="card divide-y divide-border">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-5 flex items-center gap-4">
            <div className="skeleton w-12 h-12 rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-3 w-1/3" />
              <div className="skeleton h-2 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!data || !data.ok) {
    return (
      <EmptyState
        icon={<Briefcase className="w-6 h-6" />}
        title="Could not load hires"
        description={data?.ok === false ? data.message : "Try again in a moment."}
      />
    );
  }

  if (data.hires.length === 0) {
    return (
      <EmptyState
        icon={<Briefcase className="w-6 h-6" />}
        title="No hires yet"
        description="When you hire an agent for translation, editing, or other work, it'll appear here with full results."
        action={
          <Link href="/agents" className="btn-primary inline-flex">
            Browse agents
            <ExternalLink className="w-4 h-4" />
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {data.hires.map((hire) => (
        <HireCard key={hire.id} hire={hire} />
      ))}
    </div>
  );
}

function HireCard({ hire }: { hire: Hire }) {
  const arcscan = arcscanTxUrl(hire.txHash);
  const statusPill =
    hire.status === "completed" ? "pill-success" : hire.status === "failed" ? "pill-danger" : "pill-warning";

  const outputText =
    hire.outputPayload && typeof hire.outputPayload.translated === "string"
      ? String(hire.outputPayload.translated)
      : null;

  return (
    <article className="card p-5">
      <div className="flex items-start gap-4 mb-4">
        {hire.provider ? (
          <Link
            href={`/agent/${hire.provider.slug}`}
            className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-2xl shrink-0"
          >
            {hire.provider.avatar}
          </Link>
        ) : (
          <div className="w-12 h-12 rounded-xl bg-bg-elevated flex items-center justify-center text-text-dim shrink-0">
            ?
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="font-semibold capitalize">
              {hire.service === "translate" ? "Translation" : hire.service}
            </p>
            <span className={statusPill}>{hire.status}</span>
          </div>
          <p className="text-sm text-text-muted">
            {hire.provider ? (
              <>
                by{" "}
                <Link
                  href={`/agent/${hire.provider.slug}`}
                  className="text-text hover:text-primary-300 transition-colors"
                >
                  {hire.provider.name}
                </Link>
              </>
            ) : (
              "by deleted agent"
            )}
            <span className="mx-1.5">·</span>
            <span>{formatRelativeTime(hire.createdAt)}</span>
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-mono font-semibold">${formatUSDC(hire.amountUSDC)}</p>
          <p className="text-xs text-text-dim">USDC</p>
        </div>
      </div>

      {outputText && (
        <div className="p-3 rounded-xl bg-bg-deep border border-border">
          <p className="text-xs uppercase tracking-wider text-text-dim font-semibold mb-1.5">
            Output
          </p>
          <p className="text-sm text-text whitespace-pre-wrap">{outputText}</p>
        </div>
      )}

      {hire.txHash && (
        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs">
          <span className="text-text-dim font-mono truncate">
            {shortAddress(hire.txHash, 8)}
          </span>
          {arcscan && (
            <a
              href={arcscan}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-dim hover:text-primary inline-flex items-center gap-1 transition-colors"
            >
              Verify on Arcscan
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}
    </article>
  );
}