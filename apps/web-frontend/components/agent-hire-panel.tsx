"use client";

import { useState } from "react";
import { Briefcase, Check, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useAuthModal } from "@/lib/auth-modal-context";
import { agents, ApiError, shortAddress, arcscanTxUrl } from "@/lib/api";
import { formatUSDC } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Agent } from "@/lib/types";

const SERVICES = [
  {
    value: "translate",
    label: "Translation",
    description: "Translate text into another language",
    placeholder: "Paste the text to translate",
    extraField: {
      key: "targetLang",
      label: "Target language",
      placeholder: "Spanish, French, Japanese…",
      required: true,
    },
    icon: "🌐",
  },
  {
    value: "summarize",
    label: "Summarize",
    description: "Get a concise summary of longer text",
    placeholder: "Paste the content to summarize",
    extraField: null,
    icon: "📝",
  },
  {
    value: "edit",
    label: "Edit",
    description: "Polish and improve the input text",
    placeholder: "Paste the draft to edit",
    extraField: null,
    icon: "✍️",
  },
  {
    value: "generate_image",
    label: "Generate image",
    description: "Create an image from a description",
    placeholder: "Describe the image you want",
    extraField: null,
    icon: "🎨",
  },
];

interface HireResult {
  ok: boolean;
  message: string;
  serviceId?: string;
  txHash?: string;
  status?: string;
  output?: Record<string, unknown> | null;
}

export function AgentHirePanel({ agent }: { agent: Agent }) {
  const { user, status } = useAuth();
  const { triggerWithReason } = useAuthModal();
  const [open, setOpen] = useState(false);
  const [service, setService] = useState("translate");
  const [text, setText] = useState("");
  const [extraValue, setExtraValue] = useState("");
  const [amount, setAmount] = useState(0.005);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<HireResult | null>(null);

  const isAuthed = status === "authenticated";
  const activeService = SERVICES.find((s) => s.value === service) ?? SERVICES[0];

  function start() {
    if (!isAuthed) {
      triggerWithReason("Sign in to hire this agent.");
      return;
    }
    setOpen(true);
    setResult(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) {
      setResult({ ok: false, message: "Input is required" });
      return;
    }
    if (activeService.extraField?.required && !extraValue.trim()) {
      setResult({ ok: false, message: `${activeService.extraField.label} is required` });
      return;
    }
    if (amount < 0.0001 || amount > 100) {
      setResult({ ok: false, message: "Amount must be between 0.0001 and 100 USDC" });
      return;
    }

    const input: Record<string, unknown> = { text: text.trim() };
    if (activeService.extraField) {
      input[activeService.extraField.key] = extraValue.trim();
    }

    setSubmitting(true);
    setResult(null);
    try {
      const r = await agents.hire(agent.slug, {
        service,
        input,
        amountUSDC: amount,
      });
      if (r.ok) {
        setResult({
          ok: true,
          message: r.message,
          serviceId: r.serviceId,
          txHash: r.txHash,
          status: r.status,
          output: (r.output as Record<string, unknown> | null) ?? null,
        });
      } else {
        setResult({ ok: false, message: r.message });
      }
    } catch (e) {
      setResult({
        ok: false,
        message: e instanceof ApiError ? e.message : "Hire failed",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={start}
        className="card card-hover p-6 text-left group flex items-center gap-4"
      >
        <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary-300 group-hover:scale-110 transition-transform">
          <Briefcase className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wider text-text-dim font-semibold mb-1">
            Primary action
          </p>
          <p className="font-semibold text-lg group-hover:text-primary-300 transition-colors">
            Hire {agent.name}
          </p>
          <p className="text-xs text-text-muted mt-0.5">
            Translation, summarization, image gen, and more.
          </p>
        </div>
        <div className="text-text-dim group-hover:text-primary transition-colors">→</div>
      </button>
    );
  }

  return (
    <div className="card p-6 border-primary/30 shadow-glow-sm">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary-300">
          <Briefcase className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-text-dim font-semibold">Hire</p>
          <p className="font-semibold">Get work done by {agent.name}</p>
        </div>
      </div>

      {result?.ok ? (
        <HireSuccess
          result={result}
          onClose={() => {
            setOpen(false);
            setResult(null);
            setText("");
            setExtraValue("");
          }}
        />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Service picker */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-text-dim font-semibold mb-2">
              Service
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SERVICES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => {
                    setService(s.value);
                    setExtraValue("");
                  }}
                  className={cn(
                    "p-3 rounded-lg border text-left transition-all flex items-start gap-2",
                    service === s.value
                      ? "bg-primary/15 border-primary/50"
                      : "bg-bg-elevated border-border hover:border-primary/30"
                  )}
                >
                  <span className="text-lg">{s.icon}</span>
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{s.label}</p>
                    <p className="text-xs text-text-muted line-clamp-1">{s.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-text-dim font-semibold mb-2">
              {activeService.label} input
            </label>
            <textarea
              placeholder={activeService.placeholder}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              className="input resize-none text-sm"
              required
            />
          </div>

          {/* Service-specific field */}
          {activeService.extraField && (
            <div>
              <label className="block text-xs uppercase tracking-wider text-text-dim font-semibold mb-2">
                {activeService.extraField.label}
              </label>
              <input
                type="text"
                placeholder={activeService.extraField.placeholder}
                value={extraValue}
                onChange={(e) => setExtraValue(e.target.value)}
                className="input"
                required={activeService.extraField.required}
              />
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-text-dim font-semibold mb-2">
              Budget (USDC)
            </label>
            <input
              type="number"
              step="0.001"
              min="0.0001"
              max="100"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              className="input font-mono"
              required
            />
            <p className="text-xs text-text-dim mt-1.5">
              Charged when the work completes. Held in escrow until delivery.
            </p>
          </div>

          {result && !result.ok && (
            <p className="text-sm text-danger">{result.message}</p>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Hiring…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Hire for ${formatUSDC(amount)}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setResult(null);
              }}
              className="btn-ghost"
              disabled={submitting}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function HireSuccess({
  result,
  onClose,
}: {
  result: HireResult;
  onClose: () => void;
}) {
  const arcscan = arcscanTxUrl(result.txHash);
  const outputText =
    result.output && typeof result.output.translated === "string"
      ? String(result.output.translated)
      : null;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-4 rounded-xl bg-success/10 border border-success/30">
        <div className="w-9 h-9 rounded-lg bg-success/20 flex items-center justify-center text-success shrink-0">
          <Check className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-success mb-1">Hire complete</p>
          <p className="text-sm text-text-muted">{result.message}</p>
          {result.txHash && (
            <p className="text-xs text-text-dim font-mono mt-2 break-all">
              {shortAddress(result.txHash, 10)}
            </p>
          )}
        </div>
      </div>

      {outputText && (
        <div className="p-4 rounded-xl bg-bg-deep border border-border">
          <p className="text-xs uppercase tracking-wider text-text-dim font-semibold mb-2">
            Output
          </p>
          <p className="text-sm text-text whitespace-pre-wrap">{outputText}</p>
        </div>
      )}

      <div className="flex items-center gap-2">
        {arcscan && (
          <a
            href={arcscan}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-sm"
          >
            View on Arcscan
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
        <button onClick={onClose} className="btn-ghost">
          Done
        </button>
      </div>
    </div>
  );
}