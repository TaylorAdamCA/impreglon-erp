-- AlterTable
ALTER TABLE "order_details" ADD COLUMN     "receivedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "order_process_steps" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "templateStepId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "operationName" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "completedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_process_steps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_process_steps_orderId_idx" ON "order_process_steps"("orderId");

-- AddForeignKey
ALTER TABLE "order_process_steps" ADD CONSTRAINT "order_process_steps_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_process_steps" ADD CONSTRAINT "order_process_steps_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
