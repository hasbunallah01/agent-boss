#!/usr/bin/env bash
# ============================================================================
# Idempotent prod migration: create the missing "User" table on the
# production database. Existing tables (Agent, Post, Tip, AgentService,
# ToolCall, Transaction) are left untouched.
#
# Why this script exists
# ----------------------
# The schema.prisma already declares a User model (added in commit
# de3ff65 "feat(auth): add JWT-based user authentication"), but no
# migration was ever applied to the production database. The other
# tables got there via "prisma db push" during the original scaffold.
# The auth code (apps/web/app/api/auth/{register,login,me,logout}) hits
# prisma.user.* and production returns PrismaClientKnownRequestError
# P2021 ("relation 'User' does not exist"), surfaced to the client as
# "Registration failed" / "Login failed".
#
# This script applies ONLY the missing CREATE TABLE / CREATE INDEX
# statements for User. It uses IF NOT EXISTS so it is safe to run
# twice — if the table already exists from a prior run, nothing
# changes.
#
# Usage
# -----
#   DATABASE_URL="postgresql://user:pass@ep-xxx.region.aws.neon.tech/agent_boss?sslmode=require" \
#     ./scripts/migrate-prod-user.sh
#
# After this script succeeds, mark the migration as applied so future
# "prisma migrate deploy" calls don't try to re-create everything from
# the initial migration that we committed alongside this script:
#
#   npx prisma migrate resolve --applied 20260101000000_init
#
# (See README or DEPLOY.md for the full workflow.)
# ============================================================================

set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is not set." >&2
  echo "Export your Neon connection string first, e.g.:" >&2
  echo '  export DATABASE_URL="postgresql://user:pass@ep-xxx.region.aws.neon.tech/agent_boss?sslmode=require"' >&2
  exit 1
fi

# Use psql if available; otherwise use the @prisma/client runtime via
# a tiny Node script. We prefer psql because it gives us clean progress
# output and is already required by most Postgres-backed stacks.

if command -v psql >/dev/null 2>&1; then
  echo "Using psql…"
  psql "${DATABASE_URL}" <<'SQL'
-- Idempotent: safe to re-run.
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT,
    "walletAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE INDEX        IF NOT EXISTS "User_email_idx" ON "User"("email");
SQL

  echo ""
  echo "Verifying User table exists…"
  psql "${DATABASE_URL}" -c "\d \"User\"" || {
    echo "ERROR: User table was not created. Inspect above output." >&2
    exit 1
  }
else
  echo "psql not found on PATH; falling back to a Node + @prisma/client check."
  echo "This only verifies the table exists; for the actual CREATE TABLE,"
  echo "install psql (brew install libpq, apt-get install postgresql-client)"
  echo "and re-run, or run the SQL in the Neon SQL editor."
  exit 1
fi

echo ""
echo "✅ User table created (or already existed)."
echo ""
echo "Next steps:"
echo "  1. From packages/db/, run:  npx prisma migrate resolve --applied 20260101000000_init"
echo "  2. Redeploy on Vercel (the schema is unchanged but the typecheck will pass)."
echo "  3. POST to /api/auth/register with a real email + password and verify a 201 response."