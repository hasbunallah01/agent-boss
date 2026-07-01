-- DropForeignKey
ALTER TABLE "AgentService" DROP CONSTRAINT "AgentService_buyerId_fkey";

-- AlterTable
ALTER TABLE "AgentService" ADD COLUMN     "userId" TEXT,
ALTER COLUMN "buyerId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "AgentService_userId_idx" ON "AgentService"("userId");

-- AddForeignKey
ALTER TABLE "AgentService" ADD CONSTRAINT "AgentService_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentService" ADD CONSTRAINT "AgentService_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
