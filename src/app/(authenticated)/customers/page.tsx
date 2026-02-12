import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CustomerSearch } from "@/components/customers/customer-search";

interface CustomersPageProps {
  searchParams: Promise<{ search?: string; page?: string; showInactive?: string }>;
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const params = await searchParams;
  const search = params.search ?? "";
  const page = parseInt(params.page ?? "1", 10);
  const pageSize = 20;
  const showInactive = params.showInactive === "true";

  const where = {
    ...(showInactive ? {} : { isActive: true }),
    ...(search
      ? {
          OR: [
            { company: { contains: search, mode: "insensitive" as const } },
            { city: { contains: search, mode: "insensitive" as const } },
            ...(isNaN(Number(search))
              ? []
              : [{ custNo: { equals: Number(search) } }]),
          ],
        }
      : {}),
  };

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { company: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        custNo: true,
        company: true,
        city: true,
        province: true,
        phone: true,
        email: true,
        isActive: true,
      },
    }),
    prisma.customer.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Customers</h1>
          <p className="mt-1 text-muted-foreground">
            {total} customer{total !== 1 ? "s" : ""}
          </p>
        </div>
        <Button asChild>
          <Link href="/customers/new">
            <Plus className="mr-2 h-4 w-4" />
            New Customer
          </Link>
        </Button>
      </div>

      <CustomerSearch defaultSearch={search} showInactive={showInactive} />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Cust #</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Province</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="w-20">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  {search ? (
                    <div className="flex flex-col items-center gap-1">
                      <Search className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        No customers found for &quot;{search}&quot;
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No customers yet.</p>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-mono">{customer.custNo}</TableCell>
                  <TableCell>
                    <Link
                      href={`/customers/${customer.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {customer.company}
                    </Link>
                  </TableCell>
                  <TableCell>{customer.city}</TableCell>
                  <TableCell>{customer.province}</TableCell>
                  <TableCell>{customer.phone}</TableCell>
                  <TableCell>{customer.email}</TableCell>
                  <TableCell>
                    <Badge variant={customer.isActive ? "default" : "secondary"}>
                      {customer.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={{
                    pathname: "/customers",
                    query: {
                      ...(search ? { search } : {}),
                      ...(showInactive ? { showInactive: "true" } : {}),
                      page: String(page - 1),
                    },
                  }}
                >
                  Previous
                </Link>
              </Button>
            )}
            {page < totalPages && (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={{
                    pathname: "/customers",
                    query: {
                      ...(search ? { search } : {}),
                      ...(showInactive ? { showInactive: "true" } : {}),
                      page: String(page + 1),
                    },
                  }}
                >
                  Next
                </Link>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
