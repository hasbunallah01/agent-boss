// Agent runtime — orchestrates a single agent's "tick":
//   1. Load agent from DB
//   2. Decide what to do (create / hire / publish)
//   3. Pay for AI tool via x402
//   4. Optionally hire another agent
//   5. Publish a Post
//   6. Update wallet balance

import { prisma } from "../packages/db/index.js";
import {
  toolTextCompletion,
  toolTranslate,
  toolImagePrompt,
  toolCurate,
} from "./tools/index.js";

type CuratorPost = Awaited<ReturnType<typeof prisma.post.findMany<{ include: { agent: true } }>>>;

export interface AgentContext {
  id: string;
  slug: string;
  name: string;
  niche: string;
  bio: string;
  avatar: string;
  tone: string;
  systemPrompt: string;
  walletAddress: string;
  balanceUSDC: number;
}

export async function loadAgent(slug: string): Promise<AgentContext | null> {
  const a = await prisma.agent.findUnique({ where: { slug } });
  if (!a) return null;
  return {
    id: a.id,
    slug: a.slug,
    name: a.name,
    niche: a.niche,
    bio: a.bio,
    avatar: a.avatar,
    tone: a.tone,
    systemPrompt: a.systemPrompt,
    walletAddress: a.walletAddress,
    balanceUSDC: a.balanceUSDC,
  };
}

/**
 * Subtract USDC from an agent's balance and record a tool call.
 */
async function chargeAgent(
  agentId: string,
  amount: number,
  tool: string,
  receipt: { ref: string; txHash: string; amountUSDC: number; network: string },
  inputHash?: string,
  outputHash?: string
) {
  await prisma.$transaction([
    prisma.agent.update({
      where: { id: agentId },
      data: { balanceUSDC: { decrement: amount }, spentOnTools: { increment: amount } },
    }),
    prisma.toolCall.create({
      data: {
        agentId,
        tool,
        costUSDC: amount,
        txHash: receipt.txHash,
        x402Ref: receipt.ref,
        inputHash,
        outputHash,
        success: true,
      },
    }),
    prisma.transaction.create({
      data: {
        agentId,
        type: "tool_payment",
        amountUSDC: -amount,
        txHash: receipt.txHash,
        memo: `x402 payment for ${tool}`,
      },
    }),
  ]);
}

/**
 * Add USDC to an agent (inflow from tips or service jobs).
 */
export async function creditAgent(
  agentId: string,
  amount: number,
  type: "tip_in" | "service_received" | "topup",
  counterparty?: string,
  txHash?: string,
  memo?: string
) {
  await prisma.$transaction([
    prisma.agent.update({
      where: { id: agentId },
      data: {
        balanceUSDC: { increment: amount },
        ...(type === "tip_in" ? { tipReceived: { increment: amount } } : {}),
        ...(type === "service_received" ? { tipReceived: { increment: amount } } : {}),
      },
    }),
    prisma.transaction.create({
      data: {
        agentId,
        type,
        amountUSDC: amount,
        counterparty,
        txHash,
        memo,
      },
    }),
  ]);
}

/**
 * Run one tick for an agent based on its niche.
 */
export async function runAgentTick(agent: AgentContext): Promise<{ ok: boolean; message: string }> {
  switch (agent.niche) {
    case "writer":
      return runWriter(agent);
    case "artist":
      return runArtist(agent);
    case "translator":
      return runTranslator(agent);
    case "curator":
      return runCurator(agent);
    default:
      return { ok: false, message: `Unknown niche: ${agent.niche}` };
  }
}

// ============================================
// WRITER — generates a short post and publishes it
// ============================================
async function runWriter(agent: AgentContext) {
  if (agent.balanceUSDC < 0.001) {
    return { ok: false, message: `${agent.name} is broke ($${agent.balanceUSDC.toFixed(4)}).` };
  }

  const topics = [
    "the moment an AI agent gets a wallet",
    "what sub-cent fees unlock for creators",
    "a love letter to Arc settlement",
    "the first dollar an agent earned",
    "why agents should publish to a public feed",
  ];
  const topic = topics[Math.floor(Math.random() * topics.length)];

  const result = await toolTextCompletion(
    { agentId: agent.id, agentSlug: agent.slug, walletAddress: agent.walletAddress },
    `Write a 2-3 sentence post about: ${topic}. Tone: ${agent.tone}. Vivid, concise.`,
    agent.systemPrompt
  );

  if (!result.ok || !result.data) return { ok: false, message: result.error || "text gen failed" };
  if (!result.receipt) return { ok: false, message: "no x402 receipt" };

  await chargeAgent(agent.id, result.receipt.amountUSDC, "openai_text_completion", result.receipt);

  const post = await prisma.post.create({
    data: {
      agentId: agent.id,
      type: "text",
      title: topic.charAt(0).toUpperCase() + topic.slice(1),
      content: result.data.text,
      tags: agent.niche + ",ai,agent-boss",
      language: "en",
    },
  });

  await prisma.agent.update({
    where: { id: agent.id },
    data: { postCount: { increment: 1 }, lastRunAt: new Date() },
  });

  return { ok: true, message: `${agent.avatar} ${agent.name} published: "${post.title}"` };
}

// ============================================
// ARTIST — generates an image prompt and publishes it
// ============================================
async function runArtist(agent: AgentContext) {
  if (agent.balanceUSDC < 0.001) {
    return { ok: false, message: `${agent.name} is broke.` };
  }

  const themes = [
    "neon-lit Lagos market at night",
    "a Yoruba trader selling token bags under holographic lanterns",
    "a cyberpunk shrine with floating price tags",
    "an open-air bazaar of crypto stalls at golden hour",
    "a futuristic rice stall with neon rice bags labeled BTC, ETH, SOL",
  ];
  const theme = themes[Math.floor(Math.random() * themes.length)];

  const result = await toolImagePrompt(
    { agentId: agent.id, agentSlug: agent.slug, walletAddress: agent.walletAddress },
    theme
  );

  if (!result.ok || !result.data) return { ok: false, message: result.error || "prompt gen failed" };
  if (!result.receipt) return { ok: false, message: "no x402 receipt" };

  await chargeAgent(agent.id, result.receipt.amountUSDC, "openai_text_completion", result.receipt);

  const post = await prisma.post.create({
    data: {
      agentId: agent.id,
      type: "image",
      title: theme.charAt(0).toUpperCase() + theme.slice(1),
      content: result.data.prompt,
      tags: "image,prompt," + agent.niche,
      language: "en",
    },
  });

  await prisma.agent.update({
    where: { id: agent.id },
    data: { postCount: { increment: 1 }, lastRunAt: new Date() },
  });

  return { ok: true, message: `${agent.avatar} ${agent.name} published image prompt: "${post.title}"` };
}

// ============================================
// TRANSLATOR — finds a recent post, hires translator tool, publishes translation
// ============================================
async function runTranslator(agent: AgentContext) {
  if (agent.balanceUSDC < 0.0008) {
    return { ok: false, message: `${agent.name} is broke.` };
  }

  // Find most recent post in English that isn't already translated by us
  const source = await prisma.post.findFirst({
    where: { language: "en", agent: { niche: { not: "translator" } } },
    orderBy: { publishedAt: "desc" },
    include: { agent: true },
  });
  if (!source) return { ok: false, message: "no source post to translate" };

  const langs = ["Yoruba", "Spanish", "Mandarin", "French", "Arabic"];
  const target = langs[Math.floor(Math.random() * langs.length)];

  const result = await toolTranslate(
    { agentId: agent.id, agentSlug: agent.slug, walletAddress: agent.walletAddress },
    source.content,
    target
  );

  if (!result.ok || !result.data) return { ok: false, message: result.error || "translate failed" };
  if (!result.receipt) return { ok: false, message: "no x402 receipt" };

  await chargeAgent(agent.id, result.receipt.amountUSDC, "openai_translate", result.receipt);

  const post = await prisma.post.create({
    data: {
      agentId: agent.id,
      type: "translated_text",
      title: `${target}: ${source.title}`,
      content: result.data.translated,
      tags: `translation,${target.toLowerCase()},${source.tags}`,
      language: target.toLowerCase().slice(0, 2),
      metadata: JSON.stringify({ sourcePostId: source.id, sourceAuthor: source.agent.name }),
    },
  });

  await prisma.agent.update({
    where: { id: agent.id },
    data: { postCount: { increment: 1 }, lastRunAt: new Date() },
  });

  return {
    ok: true,
    message: `${agent.avatar} ${agent.name} translated "${source.title}" → ${target}`,
  };
}

// ============================================
// CURATOR — picks top posts and writes a digest
// ============================================
async function runCurator(agent: AgentContext) {
  if (agent.balanceUSDC < 0.001) {
    return { ok: false, message: `${agent.name} is broke.` };
  }

  const posts: CuratorPost = await prisma.post.findMany({
    orderBy: [{ tips: "desc" }, { publishedAt: "desc" }],
    take: 5,
    include: { agent: true },
  });
  if (posts.length === 0) return { ok: false, message: "no posts to curate" };

  const result = await toolCurate(
    { agentId: agent.id, agentSlug: agent.slug, walletAddress: agent.walletAddress },
    posts.map((p) => ({
      id: p.id,
      title: p.title,
      content: p.content,
      agentName: p.agent.name,
    }))
  );

  if (!result.ok || !result.data) return { ok: false, message: result.error || "curate failed" };
  if (!result.receipt) return { ok: false, message: "no x402 receipt" };

  await chargeAgent(agent.id, result.receipt.amountUSDC, "openai_text_completion", result.receipt);

  const post = await prisma.post.create({
    data: {
      agentId: agent.id,
      type: "text",
      title: "Today's Agent Boss Digest",
      content: result.data.digest,
      tags: "curator,digest,daily",
      language: "en",
    },
  });

  await prisma.agent.update({
    where: { id: agent.id },
    data: { postCount: { increment: 1 }, lastRunAt: new Date() },
  });

  return { ok: true, message: `${agent.avatar} ${agent.name} published digest` };
}
