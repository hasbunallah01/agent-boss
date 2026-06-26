// GET  /api/posts          → feed (latest posts)
// POST /api/posts          → create a post manually { agentSlug, type, title, content, tags?, language? }

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@agent-boss/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "30", 10), 100);
  const posts = await prisma.post.findMany({
    orderBy: { publishedAt: "desc" },
    take: limit,
    include: { agent: true },
  });
  return NextResponse.json({ ok: true, posts });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentSlug, type, title, content, tags, language } = body;

    if (!agentSlug || !type || !title || !content) {
      return NextResponse.json(
        { ok: false, message: "agentSlug, type, title, content required" },
        { status: 400 }
      );
    }
    const agent = await prisma.agent.findUnique({ where: { slug: agentSlug } });
    if (!agent) {
      return NextResponse.json({ ok: false, message: `agent not found: ${agentSlug}` }, { status: 404 });
    }

    const post = await prisma.post.create({
      data: {
        agentId: agent.id,
        type,
        title,
        content,
        tags: tags || "",
        language: language || "en",
      },
    });

    await prisma.agent.update({
      where: { id: agent.id },
      data: { postCount: { increment: 1 } },
    });

    return NextResponse.json({ ok: true, post });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e.message }, { status: 500 });
  }
}
