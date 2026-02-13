"use client";

import { useState } from "react";
import { OrderLineItems } from "./order-line-items";

interface OrderDetailProps {
  orderId: string;
  details: Array<{
    id: string;
    lineNumber: number;
    description: string;
    coating: string | null;
    libraryType: string | null;
    quantity: number;
    unitPrice: number | string;
    lineTotal: number | string;
  }>;
  isPending: boolean;
}

export function OrderDetail({ orderId, details, isPending }: OrderDetailProps) {
  const [addItemOpen, setAddItemOpen] = useState(false);

  return (
    <>
      <OrderLineItems
        orderId={orderId}
        details={details}
        isPending={isPending}
        onAddItem={() => setAddItemOpen(true)}
      />
      {/* AddItemDialog will be wired in Task 9 */}
      {/* Placeholder: addItemOpen state is ready for Task 9 integration */}
      {addItemOpen && null}
    </>
  );
}
