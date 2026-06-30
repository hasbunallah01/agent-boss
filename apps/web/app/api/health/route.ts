// GET /api/health → liveness + DB connectivity check.
// Returns 200 with {ok, version, dbOk} when healthy.
// Returns 500 with sanitized message when DB is unreachable.

import { NextResponse } from "next/server";
import { prisma } from "@agent-boss/db";

export const runtime = "nodejs";

const VERSION = "0.1.0";

export async function GET() {
  try {
    // Lightweight read-only query: count of agents.
    await prisma.agent.count();
    return NextResponse.json({
      ok: true,
      version: VERSION,
      dbOk: true,
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: "Database unavailable" } as const,
      { status: 500 }
    );
  }
}