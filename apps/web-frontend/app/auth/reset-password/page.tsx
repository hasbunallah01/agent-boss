"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Check, Loader2, Lock, KeyRound } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/logo";

function ResetPasswordInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const { resetPassword } = useAuth();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setError("Invalid or missing reset link");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await resetPassword(token, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset password");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card p-8 lg:p-10 shadow-glow-md max-w-md mx-auto">
      <Logo size={40} />
      <div className="mt-6 mb-6">
        <div className="inline-flex w-12 h-12 rounded-xl bg-brand-gradient items-center justify-center mb-4 shadow-glow-sm">
          <KeyRound className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-2xl font-bold mb-1">Set a new password</h1>
        <p className="text-sm text-text-muted">
          Choose a new password for your Agent Boss account.
        </p>
      </div>

      {!token ? (
        <div className="space-y-3">
          <p className="text-sm text-danger">
            This reset link is invalid or missing the token.
          </p>
          <a href="/auth" className="btn-secondary w-full">
            Back to sign in
          </a>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-text-dim font-semibold mb-2">
              New password
            </label>
            <input
              type="password"
              autoComplete="new-password"
              autoFocus
              placeholder="At least 8 chars, with a letter and number"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input input-lg"
              required
              disabled={submitting}
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-text-dim font-semibold mb-2">
              Confirm new password
            </label>
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Re-enter password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="input input-lg"
              required
              disabled={submitting}
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={submitting || !password || !confirm}
            className="btn-primary w-full"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                Save new password
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="container-app py-16">
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        }
      >
        <ResetPasswordInner />
      </Suspense>
    </div>
  );
}