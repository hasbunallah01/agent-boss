// GET /api/posts/[id] → return one post by id
// Returns 200 with the post, 404 if not found, 500 on server error.

import { NextResponse } from "next/server";
import { prisma } from "@agent-boss/db";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const post = await prisma.post.findUnique({
      where: { id: params.id },
      include: { agent: true },
    });
    if (!post) {
      return NextResponse.json(
        { ok: false, message: "Post not found" } as const,
        { status: 404 }
      );
    }
    return NextResponse.json({ ok: true, post });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, message: "Internal server error" } as const,
      { status: 500 }
    );
  }
}