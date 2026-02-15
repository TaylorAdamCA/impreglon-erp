-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "invoiceApprovedAt" TIMESTAMP(3),
ADD COLUMN     "invoiceApprovedBy" TEXT,
ADD COLUMN     "invoiceDate" DATE,
ADD COLUMN     "invoiceDraftedAt" TIMESTAMP(3),
ADD COLUMN     "invoiceDraftedBy" TEXT,
ADD COLUMN     "invoiceFinalizedAt" TIMESTAMP(3),
ADD COLUMN     "invoiceFinalizedBy" TEXT,
ADD COLUMN     "invoiceModifiedAt" TIMESTAMP(3),
ADD COLUMN     "invoiceModifiedBy" TEXT,
ADD COLUMN     "invoiceNo" INTEGER,
ADD COLUMN     "invoiceNotes" TEXT,
ADD COLUMN     "invoicePdfUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "orders_invoiceNo_key" ON "orders"("invoiceNo");
