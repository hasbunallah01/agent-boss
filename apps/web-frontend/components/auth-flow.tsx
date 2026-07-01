"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Check, Loader2, Mail, Lock, KeyRound } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "./logo";

type Mode = "signin" | "signup";
type Method = "otp" | "password";

export function AuthFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const {
    login,
    requestOtp,
    register,
    loginWithPassword,
    requestPasswordReset,
    user,
    status,
  } = useAuth();

  const [mode, setMode] = useState<Mode>("signin");
  const [method, setMethod] = useState<Method>("otp");

  // OTP state
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Password state
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password || !displayName.trim()) {
      setError("Email, display name, and password are required");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await register({ email: email.trim(), password, displayName: displayName.trim() });
      router.push(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLoginWithPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Email and password are required");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await loginWithPassword(email.trim(), password);
      router.push(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await requestPasswordReset(email.trim());
      setForgotSent(true);
    } catch (err) {
      // Don't leak existence — show same success state
      setForgotSent(true);
      void err;
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
                Get a free Arc wallet on signup — ready to send USDC
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

        {/* Mode + Method tabs */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-bg-deep rounded-xl border border-border mb-6">
          <button
            type="button"
            onClick={() => { setMode("signin"); setShowForgot(false); setError(null); }}
            className={`py-2 text-sm font-semibold rounded-lg transition-all ${mode === "signin" ? "bg-bg-elevated text-text shadow-sm" : "text-text-muted hover:text-text"}`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => { setMode("signup"); setShowForgot(false); setError(null); }}
            className={`py-2 text-sm font-semibold rounded-lg transition-all ${mode === "signup" ? "bg-bg-elevated text-text shadow-sm" : "text-text-muted hover:text-text"}`}
          >
            Create account
          </button>
        </div>

        {mode === "signin" ? (
          <>
            {/* Method tabs (OTP / Password) */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-bg-deep/50 rounded-lg mb-6">
              <button
                type="button"
                onClick={() => { setMethod("otp"); setStep("email"); setError(null); }}
                className={`py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${method === "otp" ? "bg-bg-elevated text-text" : "text-text-muted hover:text-text"}`}
              >
                <Mail className="w-3.5 h-3.5" />
                Email code
              </button>
              <button
                type="button"
                onClick={() => { setMethod("password"); setError(null); }}
                className={`py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${method === "password" ? "bg-bg-elevated text-text" : "text-text-muted hover:text-text"}`}
              >
                <Lock className="w-3.5 h-3.5" />
                Password
              </button>
            </div>

            {method === "otp" ? (
              step === "email" ? (
                <>
                  <div className="mb-6">
                    <div className="inline-flex w-12 h-12 rounded-xl bg-brand-gradient items-center justify-center mb-4 shadow-glow-sm">
                      <Mail className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold mb-1">Sign in with code</h2>
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
                      Or sign in with a password below.
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
              )
            ) : showForgot ? (
              <>
                <div className="mb-6">
                  <div className="inline-flex w-12 h-12 rounded-xl bg-brand-gradient items-center justify-center mb-4 shadow-glow-sm">
                    <KeyRound className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold mb-1">Reset password</h2>
                  <p className="text-sm text-text-muted">
                    {forgotSent
                      ? `If an account exists for ${email}, a reset link is on its way.`
                      : "Enter your email and we'll send a reset link."}
                  </p>
                </div>
                {!forgotSent && (
                  <form onSubmit={handleForgot} className="space-y-4">
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
                          Sending…
                        </>
                      ) : (
                        <>
                          Send reset link
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowForgot(false); setForgotSent(false); setError(null); }}
                      className="text-xs text-text-muted hover:text-text transition-colors w-full text-center"
                    >
                      ← Back to sign in
                    </button>
                  </form>
                )}
                {forgotSent && (
                  <button
                    type="button"
                    onClick={() => { setShowForgot(false); setForgotSent(false); setError(null); }}
                    className="btn-secondary w-full"
                  >
                    ← Back to sign in
                  </button>
                )}
              </>
            ) : (
              <>
                <div className="mb-6">
                  <div className="inline-flex w-12 h-12 rounded-xl bg-brand-gradient items-center justify-center mb-4 shadow-glow-sm">
                    <Lock className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold mb-1">Sign in with password</h2>
                  <p className="text-sm text-text-muted">
                    Enter your email and password.
                  </p>
                </div>

                <form onSubmit={handleLoginWithPassword} className="space-y-4">
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
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs uppercase tracking-wider text-text-dim font-semibold">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => { setShowForgot(true); setError(null); }}
                        className="text-xs text-primary hover:text-primary-300 transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <input
                      type="password"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input input-lg"
                      required
                      disabled={submitting}
                    />
                  </div>
                  {error && <p className="text-sm text-danger">{error}</p>}
                  <button
                    type="submit"
                    disabled={submitting || !email.trim() || !password}
                    className="btn-primary w-full"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Signing in…
                      </>
                    ) : (
                      <>
                        Sign in
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                  <p className="text-xs text-text-dim text-center pt-2">
                    Or sign in with an email code above.
                  </p>
                </form>
              </>
            )}
          </>
        ) : (
          <>
            <div className="mb-6">
              <div className="inline-flex w-12 h-12 rounded-xl bg-brand-gradient items-center justify-center mb-4 shadow-glow-sm">
                <KeyRound className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-1">Create your account</h2>
              <p className="text-sm text-text-muted">
                Set a password and get a free Arc wallet — ready to tip agents and hire them.
              </p>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
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
              <div>
                <label className="block text-xs uppercase tracking-wider text-text-dim font-semibold mb-2">
                  Display name
                </label>
                <input
                  type="text"
                  autoComplete="name"
                  placeholder="Your name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="input input-lg"
                  required
                  disabled={submitting}
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-text-dim font-semibold mb-2">
                  Password
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
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
                  Confirm password
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input input-lg"
                  required
                  disabled={submitting}
                />
              </div>
              {error && <p className="text-sm text-danger">{error}</p>}
              <button
                type="submit"
                disabled={submitting || !email.trim() || !password || !displayName.trim()}
                className="btn-primary w-full"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating account…
                  </>
                ) : (
                  <>
                    Create account
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
              <p className="text-xs text-text-dim text-center pt-2">
                By creating an account you agree to our terms. Your password is hashed with bcrypt.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}