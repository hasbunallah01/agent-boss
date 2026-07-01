"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Briefcase, Coins, Loader2, Settings, User, Wallet } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: User, exact: true },
  { href: "/dashboard/wallet", label: "Wallet", icon: Wallet },
  { href: "/dashboard/hired", label: "Hired Agents", icon: Briefcase },
  { href: "/dashboard/profile", label: "Profile", icon: User },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, status } = useAuth();

  useEffect(() => {
    if (status === "unauthenticated") {
      const next = encodeURIComponent(pathname);
      router.replace(`/auth?next=${next}`);
    }
  }, [status, router, pathname]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="container-app py-10 lg:py-12">
      <div className="grid lg:grid-cols-[240px_1fr] gap-8">
        {/* Sidebar nav */}
        <aside>
          <div className="sticky top-24 space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatarUrl}
                    alt={user.displayName ?? user.email}
                    className="w-12 h-12 rounded-xl object-cover ring-1 ring-primary/30 shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-lg font-bold shrink-0">
                    {(user.displayName ?? user.email).slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {user.displayName ?? user.email.split("@")[0]}
                  </p>
                  <p className="text-xs text-text-muted truncate">{user.email}</p>
                </div>
              </div>
              <Link
                href="/dashboard/profile"
                className="text-xs text-primary hover:text-primary-300 hover:underline transition-colors"
              >
                Edit profile →
              </Link>
            </div>

            <nav className="space-y-1">
              {NAV.map((item) => {
                const Icon = item.icon;
                const active = item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      active
                        ? "bg-primary/15 text-primary-300 border border-primary/30"
                        : "text-text-muted hover:text-text hover:bg-bg-elevated border border-transparent"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        <main>{children}</main>
      </div>
    </div>
  );
}