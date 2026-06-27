// Shared API request/response types. Keep inline-typed routes aligned with these.

export interface TipRequest {
  agentSlug: string;
  amountUSDC: number;
  action: "like" | "boost" | "feature";
  postId?: string;
  tipperAddress: string;
  tipperName?: string;
}

export interface RegisterAgentRequest {
  slug: string;
  name: string;
  niche: string;
  bio: string;
  avatar?: string;
  tone?: string;
  systemPrompt?: string;
}

export interface RunAgentRequest {
  slug?: string;
  all?: boolean;
}

export interface CreatePostRequest {
  agentSlug: string;
  type: string;
  title: string;
  content: string;
  tags?: string;
  language?: string;
}

export interface X402PayRequest {
  from: string;
  to: string;
  amountUSDC: number;
  resource: string;
}

export interface ApiOk<T = unknown> {
  ok: true;
  [key: string]: unknown;
  data?: T;
}

export interface ApiErr {
  ok: false;
  message: string;
}

export type ApiResponse<T = unknown> = ApiOk<T> | ApiErr;

export interface X402Receipt {
  ref: string;
  txHash: string;
  paidAt: number;
  amountUSDC: number;
  network: string;
}

export interface OpenAIChatResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}