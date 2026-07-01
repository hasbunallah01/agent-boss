"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "./logo";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/feed", label: "Feed" },
  { href: "/agents", label: "Agents" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/wallet", label: "Wallet" },
  { href: "/transactions", label: "Transactions" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { user, status, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/70 backdrop-blur-xl">
      <div className="container-app flex h-16 items-center justify-between gap-6">
        <Link href="/" className="shrink-0" aria-label="Agent Boss home">
          <Logo />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "text-text bg-bg-elevated"
                    : "text-text-muted hover:text-text hover:bg-bg-elevated"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Auth area */}
        <div className="hidden md:flex items-center gap-2">
          {status === "loading" ? (
            <div className="h-9 w-24 skeleton" />
          ) : user ? (
            <>
              <Link
                href="/dashboard"
                className="px-3 py-2 rounded-lg text-sm font-medium text-text-muted hover:text-text hover:bg-bg-elevated transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/dashboard/profile"
                className="px-3 py-2 rounded-lg text-sm font-medium text-text-muted hover:text-text hover:bg-bg-elevated transition-colors"
              >
                Profile
              </Link>
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-elevated border border-border text-xs">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse-slow" />
                <span className="text-text-muted">{user.email}</span>
              </div>
              <button
                onClick={logout}
                className="px-3 py-2 rounded-lg text-sm font-medium text-text-muted hover:text-text hover:bg-bg-elevated transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/auth" className="btn-ghost">
                Sign in
              </Link>
              <Link href="/auth" className="btn-primary">
                Get started
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-2 rounded-lg text-text-muted hover:text-text hover:bg-bg-elevated"
          aria-label="Toggle menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile nav */}
      {open && (
        <div className="md:hidden border-t border-border bg-bg-elevated">
          <div className="container-app py-4 flex flex-col gap-1">
            {NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                    active
                      ? "text-text bg-bg-surface"
                      : "text-text-muted hover:text-text hover:bg-bg-surface"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            <div className="divider my-2" />
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="px-4 py-3 rounded-lg text-sm font-medium text-text-muted hover:text-text hover:bg-bg-surface"
                >
                  Dashboard
                </Link>
                <Link
                  href="/dashboard/profile"
                  onClick={() => setOpen(false)}
                  className="px-4 py-3 rounded-lg text-sm font-medium text-text-muted hover:text-text hover:bg-bg-surface"
                >
                  Profile
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setOpen(false);
                  }}
                  className="text-left px-4 py-3 rounded-lg text-sm font-medium text-text-muted hover:text-text hover:bg-bg-surface"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth"
                  onClick={() => setOpen(false)}
                  className="px-4 py-3 rounded-lg text-sm font-medium text-text-muted hover:text-text hover:bg-bg-surface"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth"
                  onClick={() => setOpen(false)}
                  className="px-4 py-3 rounded-lg text-sm font-semibold text-text bg-brand-gradient text-center"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}