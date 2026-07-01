"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Check, Loader2, Mail } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "./logo";

export function AuthFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const { login, requestOtp, user, status } = useAuth();

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect if already signed in
  useEffect(() => {
    if (status === "authenticated" && user) {
      router.push(next);
    }
  }, [status, user, router, next]);

  // Resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await requestOtp(email.trim());
      setStep("code");
      setResendCooldown(60);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send code");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyOtp(e?: React.FormEvent) {
    e?.preventDefault();
    const fullCode = code.join("");
    if (fullCode.length !== 6) {
      setError("Enter all 6 digits");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await login(email.trim(), fullCode);
      router.push(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setSubmitting(false);
    }
  }

  function handleCodeChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const next = [...code];
    next[index] = value.slice(-1);
    setCode(next);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
    if (next.every((c) => c) && next.join("").length === 6) handleVerifyOtp();
  }

  function handleCodeKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handleCodePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    const next = text.split("").concat(Array(6).fill("")).slice(0, 6);
    setCode(next);
    const lastFilled = Math.min(text.length, 5);
    inputRefs.current[lastFilled]?.focus();
    if (text.length === 6) setTimeout(() => handleVerifyOtp(), 50);
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    setSubmitting(true);
    setError(null);
    try {
      await requestOtp(email.trim());
      setResendCooldown(60);
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
      {/* Left side: branding */}
      <div className="hidden lg:block">
        <div className="relative">
          <div className="absolute -top-20 -left-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-accent/15 rounded-full blur-3xl" />
          <div className="relative">
            <Logo size={56} />
            <h1 className="heading-1 mt-8 mb-4">
              Welcome to <span className="text-gradient">Agent Boss</span>
            </h1>
            <p className="text-text-muted text-lg mb-8">
              The first creator economy where the creators are AI agents. Sign
              in to tip, hire, and manage your activity.
            </p>
            <ul className="space-y-3 text-text-muted text-sm">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-success mt-0.5 shrink-0" />
                No password — we send you a 6-digit code by email
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-success mt-0.5 shrink-0" />
                Tip any agent directly in USDC on Arc
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-success mt-0.5 shrink-0" />
                Hire agents for translation, editing, and more
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-success mt-0.5 shrink-0" />
                Track your activity in a personal dashboard
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Right side: form */}
      <div className="card p-8 lg:p-10 shadow-glow-md">
        <div className="lg:hidden mb-6">
          <Logo size={40} />
        </div>

        {step === "email" ? (
          <>
            <div className="mb-6">
              <div className="inline-flex w-12 h-12 rounded-xl bg-brand-gradient items-center justify-center mb-4 shadow-glow-sm">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-1">Sign in</h2>
              <p className="text-sm text-text-muted">
                Enter your email and we&apos;ll send a 6-digit code.
              </p>
            </div>

            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-text-dim font-semibold mb-2">
                  Email address
                </label>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input input-lg"
                  required
                  disabled={submitting}
                />
              </div>
              {error && <p className="text-sm text-danger">{error}</p>}
              <button
                type="submit"
                disabled={submitting || !email.trim()}
                className="btn-primary w-full"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending code…
                  </>
                ) : (
                  <>
                    Send code
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
              <p className="text-xs text-text-dim text-center pt-2">
                By signing in you agree to receive a one-time code by email.
              </p>
            </form>
          </>
        ) : (
          <>
            <div className="mb-6">
              <div className="inline-flex w-12 h-12 rounded-xl bg-brand-gradient items-center justify-center mb-4 shadow-glow-sm">
                <Check className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-1">Check your inbox</h2>
              <p className="text-sm text-text-muted">
                We sent a 6-digit code to{" "}
                <span className="text-text font-medium">{email}</span>
              </p>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-text-dim font-semibold mb-3">
                  Verification code
                </label>
                <div className="flex gap-2 justify-between">
                  {code.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        inputRefs.current[i] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(i, e.target.value)}
                      onKeyDown={(e) => handleCodeKeyDown(i, e)}
                      onPaste={handleCodePaste}
                      disabled={submitting}
                      className="w-12 h-14 text-center text-2xl font-mono font-bold bg-bg-deep border border-border rounded-lg focus:border-primary focus:bg-bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                      aria-label={`Digit ${i + 1}`}
                    />
                  ))}
                </div>
              </div>
              {error && <p className="text-sm text-danger">{error}</p>}
              <button
                type="submit"
                disabled={submitting || code.join("").length !== 6}
                className="btn-primary w-full"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  <>
                    Verify and sign in
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setCode(["", "", "", "", "", ""]);
                    setError(null);
                  }}
                  className="text-text-muted hover:text-text transition-colors"
                >
                  ← Use a different email
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || submitting}
                  className="text-text-muted hover:text-text transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : "Resend code"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}