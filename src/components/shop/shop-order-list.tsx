"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ShopOrder {
  id: string;
  orderNo: number;
  customerName: string;
  poNumber: string | null;
  status: string;
  orderDate: string;
  totalItems: number;
  receivedItems: number;
  totalSteps: number;
  completedSteps: number;
}

interface ShopOrderListProps {
  orders: ShopOrder[];
}

const STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "In Progress", value: "IN_PROGRESS" },
  { label: "Ready to Ship", value: "READY_TO_SHIP" },
  { label: "Shipped", value: "SHIPPED" },
];

function statusBadge(status: string) {
  switch (status) {
    case "IN_PROGRESS":
      return (
        <Badge variant="outline" className="border-blue-500 text-blue-600">
          In Progress
        </Badge>
      );
    case "READY_TO_SHIP":
      return (
        <Badge
          variant="default"
          className="bg-green-600 hover:bg-green-700"
        >
          Ready to Ship
        </Badge>
      );
    case "SHIPPED":
      return <Badge variant="secondary">Shipped</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export function ShopOrderList({ orders }: ShopOrderListProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = useMemo(() => {
    return orders.filter((order) => {
      if (statusFilter && order.status !== statusFilter) return false;

      if (search) {
        const term = search.toLowerCase();
        const matchesOrderNo = String(order.orderNo)
          .toLowerCase()
          .includes(term);
        const matchesCustomer = order.customerName
          .toLowerCase()
          .includes(term);
        const matchesPO = order.poNumber
          ? order.poNumber.toLowerCase().includes(term)
          : false;

        if (!matchesOrderNo && !matchesCustomer && !matchesPO) return false;
      }

      return true;
    });
  }, [orders, search, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by order #, customer, or PO..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex items-center gap-1">
          {STATUS_FILTERS.map((filter) => (
            <Button
              key={filter.value}
              variant={statusFilter === filter.value ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(filter.value)}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="w-28">PO #</TableHead>
              <TableHead className="w-32">Status</TableHead>
              <TableHead className="w-32">Items</TableHead>
              <TableHead className="w-32">Process</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  {search || statusFilter ? (
                    <div className="flex flex-col items-center gap-1">
                      <Search className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        No orders found
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      No shop orders yet.
                    </p>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((order) => (
                <TableRow
                  key={order.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/shop/${order.id}`)}
                >
                  <TableCell className="font-mono font-medium">
                    {order.orderNo}
                  </TableCell>
                  <TableCell>{order.customerName}</TableCell>
                  <TableCell>{order.poNumber || "\u2014"}</TableCell>
                  <TableCell>{statusBadge(order.status)}</TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {order.receivedItems}/{order.totalItems} received
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {order.totalSteps > 0
                        ? `${order.completedSteps}/${order.totalSteps} steps`
                        : "No template"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/shop/${order.id}`);
                      }}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
