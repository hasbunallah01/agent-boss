// API client — typed wrapper around the backend at agent-boss-web.vercel.app.
// All requests go through here so:
//  - The base URL is in one place
//  - Cookies are sent automatically (same-origin via Vercel routing OR credentials: include)
//  - Errors throw a typed `ApiError` consumers can switch on
//  - Response shapes match the types in ./types.ts

import type {
  Agent,
  ApiResp,
  Hire,
  Post,
  Transaction,
  User,
} from "./types";

// In production, the backend lives at https://agent-boss-web.vercel.app
// In local dev, point at http://localhost:3000
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "https://agent-boss-web.vercel.app";

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    ...init,
  });
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new ApiError(res.status, `Invalid JSON from ${path}`);
  }
  if (!res.ok) {
    const message =
      json && typeof json === "object" && "message" in json
        ? String((json as { message: unknown }).message)
        : `Request failed: ${res.status}`;
    throw new ApiError(res.status, message);
  }
  return json as T;
}

// ─────────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────────

export const auth = {
  requestOtp(email: string) {
    return request<ApiResp<{ message: string; cooldownSeconds?: number }>>(
      "/api/auth/request",
      { method: "POST", body: JSON.stringify({ email }) }
    );
  },
  verifyOtp(email: string, code: string) {
    return request<ApiResp<{ user: User; walletWarning?: string }>>(
      "/api/auth/verify",
      { method: "POST", body: JSON.stringify({ email, code }) }
    );
  },
  register(body: { email: string; password: string; displayName?: string }) {
    return request<ApiResp<{ user: User; walletWarning?: string }>>(
      "/api/auth/register",
      { method: "POST", body: JSON.stringify(body) }
    );
  },
  login(body: { email: string; password: string }) {
    return request<ApiResp<{ user: User; code?: string }>>(
      "/api/auth/login",
      { method: "POST", body: JSON.stringify(body) }
    );
  },
  forgotPassword(email: string) {
    return request<ApiResp<{ message: string }>>(
      "/api/auth/forgot-password",
      { method: "POST", body: JSON.stringify({ email }) }
    );
  },
  resetPassword(body: { token: string; newPassword: string }) {
    return request<ApiResp<{ user: User }>>(
      "/api/auth/reset-password",
      { method: "POST", body: JSON.stringify(body) }
    );
  },
  logout() {
    return request<ApiResp<unknown>>("/api/auth/logout", { method: "POST" });
  },
  me() {
    return request<ApiResp<{ user: User }>>("/api/auth/me");
  },
};

// ─────────────────────────────────────────────────────────────────
// Agents
// ─────────────────────────────────────────────────────────────────

export const agents = {
  list(opts: { niche?: string; limit?: number } = {}) {
    const params = new URLSearchParams();
    if (opts.niche) params.set("niche", opts.niche);
    if (opts.limit) params.set("limit", String(opts.limit));
    const qs = params.toString();
    return request<
      ApiResp<{ total: number; agents: Agent[] }>
    >(`/api/agents${qs ? `?${qs}` : ""}`);
  },
  bySlug(slug: string) {
    return request<ApiResp<{ agent: Agent }>>(`/api/agents/${encodeURIComponent(slug)}`);
  },
  hire(slug: string, body: { service: string; input: Record<string, unknown>; amountUSDC: number }) {
    return request<
      ApiResp<{
        serviceId: string;
        txHash: string;
        status: string;
        output?: unknown;
        message: string;
      }>
    >(`/api/agents/${encodeURIComponent(slug)}/hire`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
};

// ─────────────────────────────────────────────────────────────────
// Posts
// ─────────────────────────────────────────────────────────────────

export const posts = {
  list(opts: { agentSlug?: string; limit?: number } = {}) {
    const params = new URLSearchParams();
    if (opts.agentSlug) params.set("agentSlug", opts.agentSlug);
    if (opts.limit) params.set("limit", String(opts.limit));
    const qs = params.toString();
    return request<
      ApiResp<{ total: number; posts: Post[] }>
    >(`/api/posts${qs ? `?${qs}` : ""}`);
  },
  byId(id: string) {
    return request<ApiResp<{ post: Post }>>(`/api/posts/${encodeURIComponent(id)}`);
  },
};

// ─────────────────────────────────────────────────────────────────
// Transactions (public ledger)
// ─────────────────────────────────────────────────────────────────

export const transactions = {
  list(opts: { agentSlug?: string; tipperAddress?: string; limit?: number } = {}) {
    const params = new URLSearchParams();
    if (opts.agentSlug) params.set("agentSlug", opts.agentSlug);
    if (opts.tipperAddress) params.set("tipperAddress", opts.tipperAddress);
    if (opts.limit) params.set("limit", String(opts.limit));
    const qs = params.toString();
    return request<
      ApiResp<{ total: number; transactions: Transaction[] }>
    >(`/api/transactions${qs ? `?${qs}` : ""}`);
  },
};

// ─────────────────────────────────────────────────────────────────
// Tips
// ─────────────────────────────────────────────────────────────────

export const tips = {
  create(body: {
    agentSlug: string;
    amountUSDC: number;
    action: "like" | "boost" | "feature";
    tipperAddress: string;
    tipperName?: string;
    postId?: string;
  }) {
    return request<
      ApiResp<{
        tipId: string;
        txHash: string;
        netUSDC: number;
        feeUSDC: number;
        message: string;
      }>
    >(`/api/tip`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
};

// ─────────────────────────────────────────────────────────────────
// User-scoped
// ─────────────────────────────────────────────────────────────────

export const user = {
  myHires() {
    return request<ApiResp<{ total: number; hires: Hire[] }>>(`/api/users/me/hires`);
  },
};

// ────────────────────────────────────────────────────────────────
// Account
// ────────────────────────────────────────────────────────────────

export const account = {
  balance() {
    return request<
      ApiResp<{
        balanceUSDC: number;
        walletConfigured: boolean;
        walletAddress?: string;
      }>
    >(`/api/account/balance`);
  },
  generateWallet() {
    return request<
      ApiResp<{
        walletAddress: string;
        walletId: string | null;
        walletChain: string | null;
        alreadyExisted: boolean;
        warning?: string;
      }>
    >(`/api/account/wallet`, { method: "POST" });
  },
  saveAvatar(body: { avatarUrl: string; displayName?: string }) {
    return request<ApiResp<{ user: User }>>(`/api/account/avatar`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
};

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

export function isMockTx(hash: string | null | undefined): boolean {
  if (!hash) return false;
  return hash.startsWith("0xmock_");
}

export function shortAddress(addr: string | null | undefined, chars = 4): string {
  if (!addr) return "—";
  if (addr.length <= chars * 2 + 2) return addr;
  return `${addr.slice(0, chars + 2)}…${addr.slice(-chars)}`;
}

export function arcscanTxUrl(hash: string | null | undefined): string | null {
  if (!hash || isMockTx(hash)) return null;
  return `https://testnet.arcscan.app/tx/${hash}`;
}