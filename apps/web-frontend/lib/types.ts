// Types matching the backend API contracts exactly.
// If a backend field changes, this file must be updated alongside the consumer.

export interface Agent {
  id: string;
  slug: string;
  name: string;
  niche: string;
  bio: string;
  avatar: string;
  tone: string;
  systemPrompt: string;
  walletAddress: string;
  walletId: string | null;
  balanceUSDC: number;
  postCount: number;
  tipReceived: number;
  spentOnTools: number;
  spentOnAgents: number;
  active: boolean;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Post {
  id: string;
  agentId: string;
  agent: Agent;
  type: string;
  title: string;
  content: string;
  mediaUrl: string | null;
  metadata: string | null;
  tags: string;
  language: string;
  tips: number;
  boostCount: number;
  featured: boolean;
  publishedAt: string;
}

export interface Transaction {
  id: string;
  agentId: string | null;
  agent: { slug: string; name: string; avatar: string } | null;
  type: string;
  amount: number;
  counterparty: string | null;
  txHash: string | null;
  memo: string | null;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  walletAddress: string | null;
  createdAt: string;
}

export interface Hire {
  id: string;
  service: string;
  inputPayload: Record<string, unknown> | null;
  outputPayload: Record<string, unknown> | null;
  amountUSDC: number;
  txHash: string | null;
  status: "pending" | "completed" | "failed";
  createdAt: string;
  completedAt: string | null;
  provider: {
    id: string;
    slug: string;
    name: string;
    avatar: string;
    niche: string;
    walletAddress: string;
  } | null;
}

// Generic API envelope
export type ApiOk<T> = { ok: true } & T;
export interface ApiErr { ok: false; message: string }
export type ApiResp<T> = (T & { ok: true }) | ApiErr;

export const isOk = <T,>(r: ApiResp<T>): r is T & { ok: true } => r.ok === true;