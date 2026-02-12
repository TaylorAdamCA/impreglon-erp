-- AlterEnum
BEGIN;
CREATE TYPE "ProductLibraryType_new" AS ENUM ('ANSI_VALVE', 'WELLHEAD_VALVE', 'FITTING', 'PUP_JOINT', 'WELLHEAD_COMPONENT', 'ACCESSORY');
ALTER TABLE "order_details" ALTER COLUMN "libraryType" TYPE "ProductLibraryType_new" USING ("libraryType"::text::"ProductLibraryType_new");
ALTER TABLE "quote_components" ALTER COLUMN "libraryType" TYPE "ProductLibraryType_new" USING ("libraryType"::text::"ProductLibraryType_new");
ALTER TABLE "product_library_items" ALTER COLUMN "libraryType" TYPE "ProductLibraryType_new" USING ("libraryType"::text::"ProductLibraryType_new");
ALTER TYPE "ProductLibraryType" RENAME TO "ProductLibraryType_old";
ALTER TYPE "ProductLibraryType_new" RENAME TO "ProductLibraryType";
DROP TYPE "public"."ProductLibraryType_old";
COMMIT;

-- DropIndex
DROP INDEX "product_library_items_libraryType_libraryNo_key";

-- AlterTable
ALTER TABLE "product_library_items" DROP COLUMN "price1",
DROP COLUMN "price2",
DROP COLUMN "price3",
DROP COLUMN "price7",
DROP COLUMN "price8",
ADD COLUMN     "catalogSource" TEXT,
ADD COLUMN     "coatingPrice1" DECIMAL(10,2),
ADD COLUMN     "coatingPrice2" DECIMAL(10,2),
ADD COLUMN     "coatingPrice3" DECIMAL(10,2),
ADD COLUMN     "coatingPrice4" DECIMAL(10,2),
ADD COLUMN     "coatingPrice5" DECIMAL(10,2),
ADD COLUMN     "coatingPrice6" DECIMAL(10,2),
ADD COLUMN     "coatingPrice7" DECIMAL(10,2),
ADD COLUMN     "coatingPrice8" DECIMAL(10,2),
ADD COLUMN     "drtCostHigher" DECIMAL(10,2),
ADD COLUMN     "drtCostLower" DECIMAL(10,2),
ADD COLUMN     "drtSellingHigher" DECIMAL(10,2),
ADD COLUMN     "drtSellingLower" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "coating_price_labels" (
    "id" TEXT NOT NULL,
    "libraryType" "ProductLibraryType" NOT NULL,
    "slotNumber" INTEGER NOT NULL,
    "coatingName" TEXT NOT NULL,
    "areaSpec" TEXT NOT NULL,

    CONSTRAINT "coating_price_labels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "coating_price_labels_libraryType_slotNumber_key" ON "coating_price_labels"("libraryType", "slotNumber");

-- CreateIndex
CREATE UNIQUE INDEX "product_library_items_libraryType_catalogSource_libraryNo_key" ON "product_library_items"("libraryType", "catalogSource", "libraryNo");
