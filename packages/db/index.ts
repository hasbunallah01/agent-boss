// Prisma client singleton — prevents exhausting connections in dev.
import { PrismaClient } from "@prisma/client";
import type { Prisma } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Explicit named re-exports for the Prisma types our route handlers
// need. Importing the `Prisma` namespace through `export *` works in
// some bundler / module configurations but not all (e.g. when the
// consuming file is processed with `isolatedModules`). Re-exporting
// the concrete types as named values here gives every consumer a
// stable, isolatedModules-safe entry point.
export type PrismaTransactionClient = Prisma.TransactionClient;

export * from "@prisma/client";
