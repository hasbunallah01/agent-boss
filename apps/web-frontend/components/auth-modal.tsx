"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Loader2, Mail, X, Lock } from "lucide-react";
import { useAuthModal } from "@/lib/auth-modal-context";
import { useAuth } from "@/lib/auth-context";

/**
 * Two-step OTP modal: email → code. Triggered anywhere a guest tries a
 * protected action. On success, the modal closes and the user's state is
 * fresh, so subsequent actions work without a refresh.
 */
export function AuthModal() {
  const { open, reason, close } = useAuthModal();
  const { login, requestOtp, user } = useAuth();

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Close on user state change (e.g. logged in from another tab)
  useEffect(() => {
    if (user && open) {
      close();
    }
  }, [user, open, close]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setStep("email");
      setEmail("");
      setCode(["", "", "", "", "", ""]);
      setError(null);
      setResendCooldown(0);
    }
  }, [open]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // Lock body scroll while open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await requestOtp(email.trim());
      setStep("code");
      setResendCooldown(60);
      // Focus first code input
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
      // Success — modal will auto-close via the user-state effect
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
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    if (next.every((c) => c) && next.join("").length === 6) {
      // Auto-submit when all 6 digits filled
      handleVerifyOtp();
    }
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
    if (text.length === 6) {
      setTimeout(() => handleVerifyOtp(), 50);
    }
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
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={close}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-md glass rounded-2xl shadow-glow-lg overflow-hidden"
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Top gradient strip */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />

            <button
              onClick={close}
              className="absolute top-4 right-4 p-2 rounded-lg text-text-muted hover:text-text hover:bg-bg-subtle transition-colors z-10"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-8">
              {reason && (
                <div className="mb-4 px-3 py-2 rounded-lg bg-primary-soft border border-primary/30 text-xs text-text-muted">
                  <span className="text-primary-300">Sign in required:</span>{" "}
                  {reason}
                </div>
              )}

              {step === "email" ? (
                <>
                  <div className="mb-6">
                    <div className="inline-flex w-12 h-12 rounded-xl bg-brand-gradient items-center justify-center mb-4 shadow-glow-sm">
                      <Mail className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold mb-1">Sign in to Agent Boss</h2>
                    <p className="text-sm text-text-muted">
                      We&apos;ll email you a 6-digit code. No password needed.
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

                    {error && (
                      <p className="text-sm text-danger">{error}</p>
                    )}

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
                      We never share your address.
                    </p>

                    <Link
                      href="/auth"
                      onClick={close}
                      className="mt-2 text-xs text-primary hover:text-primary-300 hover:underline transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Lock className="w-3 h-3" />
                      Sign in with email + password instead
                    </Link>
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
                          Verify and continue
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}