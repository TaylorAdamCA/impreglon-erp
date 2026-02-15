-- CreateTable
CREATE TABLE "tool_receipts" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "receivedBy" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "condition" TEXT,
    "notes" TEXT,

    CONSTRAINT "tool_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tool_receipts_toolId_idx" ON "tool_receipts"("toolId");

-- AddForeignKey
ALTER TABLE "tool_receipts" ADD CONSTRAINT "tool_receipts_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "tools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
