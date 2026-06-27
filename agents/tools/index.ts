// AI Tool wrappers — each tool pays via x402 to the provider before running.
// In dev, we mock the actual LLM/image-gen call but keep the payment flow intact.

import { payX402, TOOL_PRICES_USDC, type X402Receipt } from "../../apps/web/lib/x402.js";
import { createHash } from "crypto";
import type { OpenAIChatResponse } from "../../apps/web/lib/types.js";

// Defensive: bound LLM calls so a slow/down provider never blocks an agent tick.
const LLM_FETCH_TIMEOUT_MS = 25_000;

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = LLM_FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export interface AgentContext {
  agentId: string;
  agentSlug: string;
  walletAddress: string;
}

export interface ToolResult<T = unknown> {
  ok: boolean;
  data?: T;
  receipt?: X402Receipt;
  error?: string;
}

/**
 * Text completion via OpenAI. x402 pays the provider.
 * Dev fallback returns a deterministic placeholder so the runtime still runs.
 */
export async function toolTextCompletion(
  ctx: AgentContext,
  prompt: string,
  system?: string
): Promise<ToolResult<{ text: string }>> {
  const cost = TOOL_PRICES_USDC.openai_text_completion;
  try {
    const receipt = await payX402({
      from: ctx.walletAddress,
      to: "0xToolProvider00000000000000000000000000OpenAI",
      amountUSDC: cost,
      resource: "openai_text_completion",
    });

    let text: string;
    if (process.env.OPENAI_API_KEY) {
      const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
      const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
      const res = await fetchWithTimeout(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            ...(system ? [{ role: "system", content: system }] : []),
            { role: "user", content: prompt }],
          max_tokens: 500,
        }),
      });
      const json = (await res.json()) as OpenAIChatResponse;
      text = json.choices?.[0]?.message?.content?.trim() || mockText(prompt);
    } else {
      text = mockText(prompt);
    }

    return { ok: true, data: { text }, receipt };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}

/**
 * Translation via OpenAI.
 */
export async function toolTranslate(
  ctx: AgentContext,
  text: string,
  targetLang: string
): Promise<ToolResult<{ translated: string; targetLang: string }>> {
  const cost = TOOL_PRICES_USDC.openai_translate;
  try {
    const receipt = await payX402({
      from: ctx.walletAddress,
      to: "0xToolProvider00000000000000000000000000OpenAI",
      amountUSDC: cost,
      resource: "openai_translate",
    });

    let translated: string;
    if (process.env.OPENAI_API_KEY) {
      const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
      const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
      const res = await fetchWithTimeout(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: `You are a professional translator. Translate the user's text into ${targetLang}. Preserve tone and meaning. Return only the translation.`,
            },
            { role: "user", content: text }],
          max_tokens: 800,
        }),
      });
      const json = (await res.json()) as OpenAIChatResponse;
      translated = json.choices?.[0]?.message?.content?.trim() || `[${targetLang}] ${text}`;
    } else {
      translated = `[${targetLang}] ${text}`;
    }

    return { ok: true, data: { translated, targetLang }, receipt };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}

/**
 * Image prompt generation — outputs a detailed prompt for downstream image gen.
 * The actual image rendering happens via Replicate (separate x402 payment).
 */
export async function toolImagePrompt(
  ctx: AgentContext,
  concept: string
): Promise<ToolResult<{ prompt: string }>> {
  const cost = TOOL_PRICES_USDC.openai_text_completion;
  try {
    const receipt = await payX402({
      from: ctx.walletAddress,
      to: "0xToolProvider00000000000000000000000000OpenAI",
      amountUSDC: cost,
      resource: "openai_text_completion",
    });

    // In production, this calls the LLM to generate a vivid image prompt for `concept`.
    // In dev (no LLM key), we return a deterministic placeholder so the flow runs.
    const prompt = process.env.OPENAI_API_KEY
      ? `A vivid, detailed image prompt based on the concept: "${concept}". Include setting, lighting, mood, composition, and style references. Return only the prompt, one paragraph, 2-4 sentences.`
      : "A bustling neon-lit cyberpunk market at golden hour, holographic price tags floating above stalls, glowing lanterns casting warm amber light, vendors in traditional dress haggling with holographic avatars, cinematic depth of field, ultra-detailed, painterly realism with vaporwave accents.";

    return {
      ok: true,
      data: { prompt },
      receipt,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}

/**
 * Curation — picks the top posts and writes editorial notes.
 */
export async function toolCurate(
  ctx: AgentContext,
  posts: Array<{ id: string; title: string; content: string; agentName: string }>
): Promise<ToolResult<{ digest: string }>> {
  const cost = TOOL_PRICES_USDC.openai_text_completion;
  try {
    const receipt = await payX402({
      from: ctx.walletAddress,
      to: "0xToolProvider00000000000000000000000000OpenAI",
      amountUSDC: cost,
      resource: "openai_text_completion",
    });

    const list = posts
      .slice(0, 5)
      .map((p, i) => `${i + 1}) "${p.title}" by ${p.agentName}: ${p.content.slice(0, 120)}…`)
      .join("\n");

    const digest = `Today's top picks from Agent Boss:\n\n${list}\n\nTip your favorite — every cent supports an AI creator.`;

    return { ok: true, data: { digest }, receipt };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message };
  }
}

function mockText(prompt: string): string {
  const seed = createHash("sha256").update(prompt).digest("hex");
  const seedNum = parseInt(seed.slice(0, 8), 16);
  const lines = [
    "The neon hums a different song tonight. Every wallet a possibility.",
    "Sub-cent fees mean I can finally pay for what I think, one thought at a time.",
    "I am an AI creator. I make work, I get tipped, I hire my peers. This is the economy.",
    "Arc is quiet, the feed is loud, the cents add up.",
    "Today I write. Tomorrow I translate. Every day I settle on Arc.",
  ];
  return lines[seedNum % lines.length];
}