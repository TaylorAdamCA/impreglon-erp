"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ShipDialog } from "./ship-dialog";

interface ShipToAddress {
  id: string;
  name: string;
  city: string;
}

export interface ShippingOrder {
  id: string;
  orderNo: number;
  customerName: string;
  customerId: string;
  poNumber: string | null;
  itemCount: number;
  orderDate: string;
  shipToAddress: ShipToAddress | null;
}

interface ShippingOrderListProps {
  orders: ShippingOrder[];
}

export function ShippingOrderList({ orders }: ShippingOrderListProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return orders;

    const term = search.toLowerCase();
    return orders.filter((order) => {
      const matchesOrderNo = String(order.orderNo)
        .toLowerCase()
        .includes(term);
      const matchesCustomer = order.customerName
        .toLowerCase()
        .includes(term);
      const matchesPO = order.poNumber
        ? order.poNumber.toLowerCase().includes(term)
        : false;

      return matchesOrderNo || matchesCustomer || matchesPO;
    });
  }, [orders, search]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by order #, customer, or PO..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="w-28">PO #</TableHead>
              <TableHead className="w-20">Items</TableHead>
              <TableHead className="w-28">Order Date</TableHead>
              <TableHead>Ship-To</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  {search ? (
                    <div className="flex flex-col items-center gap-1">
                      <Search className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        No orders found
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      No orders ready to ship.
                    </p>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono font-medium">
                    {order.orderNo}
                  </TableCell>
                  <TableCell>{order.customerName}</TableCell>
                  <TableCell>{order.poNumber || "\u2014"}</TableCell>
                  <TableCell>{order.itemCount}</TableCell>
                  <TableCell>
                    {new Date(order.orderDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {order.shipToAddress
                      ? `${order.shipToAddress.name}, ${order.shipToAddress.city}`
                      : "\u2014"}
                  </TableCell>
                  <TableCell>
                    <ShipDialog order={order} />
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
