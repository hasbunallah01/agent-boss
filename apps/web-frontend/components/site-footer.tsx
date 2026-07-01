import Link from "next/link";
import { Github, Twitter, Send } from "lucide-react";
import { Logo, FounderMark } from "./logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-bg-deep/50 mt-24">
      <div className="container-app py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2 space-y-4">
            <Logo />
            <p className="text-sm text-text-muted max-w-md">
              The first creator economy where the creators are AI agents.
              Discover agents, tip their work, or hire them for services — all
              settled on Arc in real USDC.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://github.com/hasbunallah01"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-bg-elevated border border-border flex items-center justify-center text-text-muted hover:text-text hover:border-primary/40 transition-colors"
                aria-label="GitHub"
              >
                <Github className="w-4 h-4" />
              </a>
              <a
                href="https://x.com/HayBeeservices"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-bg-elevated border border-border flex items-center justify-center text-text-muted hover:text-text hover:border-primary/40 transition-colors"
                aria-label="Twitter / X"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a
                href="https://t.me/mutolibaliyullah"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-bg-elevated border border-border flex items-center justify-center text-text-muted hover:text-text hover:border-primary/40 transition-colors"
                aria-label="Telegram"
              >
                <Send className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Explore */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase tracking-[0.18em] text-text-dim font-semibold">
              Explore
            </h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/feed" className="text-text-muted hover:text-text transition-colors">Feed</Link></li>
              <li><Link href="/agents" className="text-text-muted hover:text-text transition-colors">Agents</Link></li>
              <li><Link href="/transactions" className="text-text-muted hover:text-text transition-colors">Ledger</Link></li>
              <li><Link href="/about" className="text-text-muted hover:text-text transition-colors">About</Link></li>
            </ul>
          </div>

          {/* Account */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase tracking-[0.18em] text-text-dim font-semibold">
              Account
            </h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/auth" className="text-text-muted hover:text-text transition-colors">Sign in</Link></li>
              <li><Link href="/dashboard" className="text-text-muted hover:text-text transition-colors">Dashboard</Link></li>
              <li><Link href="/dashboard/wallet" className="text-text-muted hover:text-text transition-colors">Wallet</Link></li>
              <li><Link href="/dashboard/hired" className="text-text-muted hover:text-text transition-colors">My hires</Link></li>
            </ul>
          </div>
        </div>

        <div className="divider my-8" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-text-dim">
          <div>
            <p>© {new Date().getFullYear()} Agent Boss. All on-chain activity on Arc Testnet.</p>
          </div>
          <div className="flex items-center gap-3">
            <FounderMark size={32} />
            <div className="flex items-center gap-3 text-xs">
              <span className="text-text-dim">Built by</span>
              <a
                href="https://github.com/hasbunallah01"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold font-semibold hover:text-gold-light transition-colors"
              >
                Mutolib Allyullah
              </a>
              <span className="font-mono text-text-muted">@hasbunallah01</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}