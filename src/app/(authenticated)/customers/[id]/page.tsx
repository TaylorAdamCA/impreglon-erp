import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CustomerDetailTabs } from "@/components/customers/customer-detail-tabs";

interface CustomerDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerDetailPage({
  params,
}: CustomerDetailPageProps) {
  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      contacts: { orderBy: { name: "asc" } },
      shipToAddresses: { orderBy: { name: "asc" } },
      carriers: { orderBy: { name: "asc" } },
      references: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!customer) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/customers">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{customer.company}</h1>
            <Badge variant={customer.isActive ? "default" : "secondary"}>
              {customer.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="mt-1 text-muted-foreground">
            Customer #{customer.custNo}
          </p>
        </div>
      </div>

      <CustomerDetailTabs customer={customer} />
    </div>
  );
}
