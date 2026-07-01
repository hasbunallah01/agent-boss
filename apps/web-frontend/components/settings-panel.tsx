"use client";

import { useState } from "react";
import { Loader2, LogOut, Shield, Trash2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

export function SettingsPanel() {
  const { user, logout, status } = useAuth();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  if (status !== "authenticated" || !user) return null;

  async function handleSignOut() {
    setSigningOut(true);
    await logout();
    router.push("/");
  }

  return (
    <div className="space-y-6">
      {/* Account */}
      <section className="card p-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          Account
        </h2>
        <dl className="space-y-3 text-sm">
          <Row label="Email">
            <span className="font-mono">{user.email}</span>
          </Row>
          <Row label="User ID">
            <span className="font-mono text-xs text-text-muted">{user.id}</span>
          </Row>
        </dl>
      </section>

      {/* Security */}
      <section className="card p-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          Security
        </h2>
        <div className="space-y-3 text-sm">
          <Row label="Authentication">
            <span className="text-success">Email + password · OTP fallback</span>
          </Row>
          <Row label="Session">
            <span className="text-text-muted">HTTP-only cookie, 7 days, SameSite=Lax</span>
          </Row>
          <Row label="Password reset">
            <a href="/auth" className="text-primary hover:text-primary-300 hover:underline transition-colors">
              Use the &ldquo;Forgot password?&rdquo; link on the sign-in page →
            </a>
          </Row>
        </div>
      </section>

      {/* Sign out */}
      <section className="card p-6">
        <h2 className="font-semibold mb-4">Session</h2>
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="btn-secondary"
        >
          {signingOut ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Signing out…
            </>
          ) : (
            <>
              <LogOut className="w-4 h-4" />
              Sign out
            </>
          )}
        </button>
      </section>

      {/* Danger zone */}
      <section className="card p-6 border-danger/30 bg-danger/5">
        <h2 className="font-semibold mb-1 flex items-center gap-2 text-danger">
          <AlertTriangle className="w-4 h-4" />
          Danger zone
        </h2>
        <p className="text-sm text-text-muted mb-4">
          Account deletion is not yet supported by the backend. Coming soon.
        </p>
        <button disabled className="btn-danger opacity-50 cursor-not-allowed">
          <Trash2 className="w-4 h-4" />
          Delete account
        </button>
      </section>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
      <dt className="text-text-dim text-xs uppercase tracking-wider font-semibold sm:w-40 shrink-0">
        {label}
      </dt>
      <dd className="text-text flex-1">{children}</dd>
    </div>
  );
}