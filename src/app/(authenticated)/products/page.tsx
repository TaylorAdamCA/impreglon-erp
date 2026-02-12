import { prisma } from "@/lib/prisma";
import { LIBRARY_TYPES, type LibraryType } from "@/lib/validations/product";
import type { ProductLibraryType } from "@/generated/prisma/client";
import { ProductFilters } from "@/components/products/product-filters";
import { ProductTable } from "@/components/products/product-table";
import { ProductAddButton } from "@/components/products/product-add-button";

interface ProductsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ProductsPage({
  searchParams,
}: ProductsPageProps) {
  const params = await searchParams;
  const type = (
    typeof params.type === "string" &&
    LIBRARY_TYPES.includes(params.type as LibraryType)
      ? params.type
      : "ANSI_VALVE"
  ) as LibraryType;
  const catalogSource =
    typeof params.catalogSource === "string"
      ? params.catalogSource
      : undefined;
  const search = typeof params.search === "string" ? params.search : "";
  const page = typeof params.page === "string" ? parseInt(params.page, 10) : 1;
  const showInactive = params.showInactive === "true";

  const where = {
    libraryType: type as ProductLibraryType,
    ...(catalogSource ? { catalogSource } : {}),
    ...(showInactive ? {} : { isActive: true }),
    ...(search
      ? {
          OR: [
            {
              description: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            ...(isNaN(Number(search))
              ? []
              : [{ libraryNo: { equals: Number(search) } }]),
          ],
        }
      : {}),
  };

  const pageSize = 50;

  const [items, total, labels] = await Promise.all([
    prisma.productLibraryItem.findMany({
      where,
      orderBy: { libraryNo: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.productLibraryItem.count({ where }),
    prisma.coatingPriceLabel.findMany({
      where: { libraryType: type as ProductLibraryType },
      orderBy: { slotNumber: "asc" },
    }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  // Serialize Decimal fields to strings for client components
  const serializedItems = items.map((item) => ({
    id: item.id,
    libraryNo: item.libraryNo,
    catalogSource: item.catalogSource,
    description: item.description,
    size: item.size,
    type: item.type,
    coatingPrice1: item.coatingPrice1?.toString() ?? null,
    coatingPrice2: item.coatingPrice2?.toString() ?? null,
    coatingPrice3: item.coatingPrice3?.toString() ?? null,
    coatingPrice4: item.coatingPrice4?.toString() ?? null,
    coatingPrice5: item.coatingPrice5?.toString() ?? null,
    coatingPrice6: item.coatingPrice6?.toString() ?? null,
    coatingPrice7: item.coatingPrice7?.toString() ?? null,
    coatingPrice8: item.coatingPrice8?.toString() ?? null,
    drtCostLower: item.drtCostLower?.toString() ?? null,
    drtCostHigher: item.drtCostHigher?.toString() ?? null,
    drtSellingLower: item.drtSellingLower?.toString() ?? null,
    drtSellingHigher: item.drtSellingHigher?.toString() ?? null,
    isActive: item.isActive,
  }));

  const serializedLabels = labels.map((l) => ({
    slotNumber: l.slotNumber,
    coatingName: l.coatingName,
    areaSpec: l.areaSpec,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Product Libraries</h1>
          <p className="mt-1 text-muted-foreground">
            Manage valve, fitting, and component pricing libraries
          </p>
        </div>
        <ProductAddButton libraryType={type} />
      </div>

      <ProductFilters
        currentType={type}
        currentCatalogSource={catalogSource}
        defaultSearch={search}
        showInactive={showInactive}
      />

      <ProductTable
        libraryType={type}
        items={serializedItems}
        labels={serializedLabels}
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>
            Showing {(page - 1) * pageSize + 1}–
            {Math.min(page * pageSize, total)} of {total} items
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <a
                href={`/products?type=${type}${catalogSource ? `&catalogSource=${catalogSource}` : ""}${search ? `&search=${search}` : ""}${showInactive ? "&showInactive=true" : ""}&page=${page - 1}`}
                className="rounded-md border px-3 py-1 hover:bg-muted"
              >
                Previous
              </a>
            )}
            {page < totalPages && (
              <a
                href={`/products?type=${type}${catalogSource ? `&catalogSource=${catalogSource}` : ""}${search ? `&search=${search}` : ""}${showInactive ? "&showInactive=true" : ""}&page=${page + 1}`}
                className="rounded-md border px-3 py-1 hover:bg-muted"
              >
                Next
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
