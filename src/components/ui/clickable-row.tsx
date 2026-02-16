"use client";

import { useRouter } from "next/navigation";
import { TableRow } from "@/components/ui/table";
import type { ComponentProps } from "react";

interface ClickableRowProps extends ComponentProps<typeof TableRow> {
  href: string;
}

export function ClickableRow({ href, children, className, ...props }: ClickableRowProps) {
  const router = useRouter();
  return (
    <TableRow
      className={`cursor-pointer hover:bg-muted/50 ${className ?? ""}`}
      onClick={() => router.push(href)}
      {...props}
    >
      {children}
    </TableRow>
  );
}
