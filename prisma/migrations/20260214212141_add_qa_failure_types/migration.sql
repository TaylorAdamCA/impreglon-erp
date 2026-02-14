/*
  Warnings:

  - You are about to drop the `coating_failure_types` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `method_failure_types` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "coating_failure_types";

-- DropTable
DROP TABLE "method_failure_types";

-- CreateTable
CREATE TABLE "coating_failures" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coating_failures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "method_failures" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "method_failures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "coating_failures_code_key" ON "coating_failures"("code");

-- CreateIndex
CREATE UNIQUE INDEX "method_failures_code_key" ON "method_failures"("code");
