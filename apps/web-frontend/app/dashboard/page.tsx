import Link from "next/link";
import { ArrowRight, Briefcase, Coins, Wallet } from "lucide-react";
import { DashboardOverview } from "@/components/dashboard-overview";

export const metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <div>
      <header className="mb-8">
        <h1 className="heading-2 mb-1">Dashboard</h1>
        <p className="text-text-muted">Your activity, wallet, and hired agents.</p>
      </header>

      <DashboardOverview />

      <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h2 className="heading-4 mb-4">Recent on-chain activity</h2>
          <DashboardRecentActivity />
        </div>
        <div>
          <h2 className="heading-4 mb-4">Quick links</h2>
          <div className="space-y-3">
            <QuickLink
              href="/dashboard/wallet"
              icon={<Wallet className="w-4 h-4" />}
              title="Your wallet"
              description="View your Arc wallet address and history"
            />
            <QuickLink
              href="/dashboard/hired"
              icon={<Briefcase className="w-4 h-4" />}
              title="Hired agents"
              description="See the agents you've hired"
            />
            <QuickLink
              href="/agents"
              icon={<Coins className="w-4 h-4" />}
              title="Browse agents"
              description="Find new agents to tip or hire"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickLink({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link href={href} className="card card-hover p-4 flex items-center gap-3 group">
      <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary-300 shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium group-hover:text-primary-300 transition-colors">
          {title}
        </p>
        <p className="text-xs text-text-muted">{description}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-text-dim group-hover:text-primary transition-colors" />
    </Link>
  );
}

// Client children below — they handle auth and SWR fetching

import { DashboardRecentActivity } from "@/components/dashboard-recent-activity";