"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

interface QaDetail {
  id: string;
  lineNumber: number;
  description: string;
  quantity: number;
  passedQty: number;
  reworkQty: number;
}

interface QaReworkItem {
  id: string;
  reworkQty: number;
  status: string;
  resolved: boolean;
  resolvedAt: string | null;
  orderDetailId: string;
  reworkMemo: { id: string; productType: string } | null;
}

interface ShopQaStatusProps {
  orderId: string;
  details: QaDetail[];
  reworkItems: QaReworkItem[];
}

function reworkStatusBadge(status: string) {
  switch (status) {
    case "FLAGGED":
      return <Badge variant="destructive">Flagged</Badge>;
    case "PLAN_CREATED":
      return (
        <Badge variant="outline" className="border-yellow-500 text-yellow-600">
          Plan Created
        </Badge>
      );
    case "IN_PROGRESS":
      return (
        <Badge variant="outline" className="border-blue-500 text-blue-600">
          In Progress
        </Badge>
      );
    case "RESOLVED":
      return (
        <Badge variant="default" className="bg-green-600 hover:bg-green-700">
          Resolved
        </Badge>
      );
    case "RETURNED_TO_QA":
      return (
        <Badge variant="outline" className="border-purple-500 text-purple-600">
          Returned to QA
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function ShopQaStatus({
  orderId,
  details,
  reworkItems,
}: ShopQaStatusProps) {
  const totalQty = details.reduce((sum, d) => sum + d.quantity, 0);
  const passedQty = details.reduce((sum, d) => sum + d.passedQty, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            <CardTitle>QA Status</CardTitle>
          </div>
          {totalQty > 0 && (
            <span className="text-sm text-muted-foreground">
              {passedQty} of {totalQty} item{totalQty !== 1 ? "s" : ""} passed
              inspection
            </span>
          )}
        </div>
        {totalQty > 0 && (
          <div className="mt-2 h-2 w-full rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-green-600 transition-all"
              style={{
                width: `${totalQty > 0 ? (passedQty / totalQty) * 100 : 0}%`,
              }}
            />
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {details.length === 0 ? (
          <p className="text-sm text-muted-foreground">No line items.</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Line</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-28">Passed / Total</TableHead>
                  <TableHead className="w-20">Rework</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {details.map((detail) => (
                  <TableRow key={detail.id}>
                    <TableCell className="font-mono">
                      {detail.lineNumber}
                    </TableCell>
                    <TableCell>{detail.description}</TableCell>
                    <TableCell>
                      <span
                        className={
                          detail.passedQty >= detail.quantity
                            ? "text-green-600 font-medium"
                            : ""
                        }
                      >
                        {detail.passedQty} / {detail.quantity}
                      </span>
                    </TableCell>
                    <TableCell>
                      {detail.reworkQty > 0 ? (
                        <Badge variant="destructive" className="text-xs">
                          {detail.reworkQty}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">&mdash;</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {reworkItems.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Rework Items</h4>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Qty</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Plan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reworkItems.map((item) => {
                    const detail = details.find(
                      (d) => d.id === item.orderDetailId
                    );
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono">
                          {item.reworkQty}
                        </TableCell>
                        <TableCell>{reworkStatusBadge(item.status)}</TableCell>
                        <TableCell>
                          {item.reworkMemo ? (
                            <span className="text-sm">
                              Plan #{item.reworkMemo.id.slice(-6)} &middot;{" "}
                              {item.reworkMemo.productType}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              &mdash;
                            </span>
                          )}
                          {detail && (
                            <span className="text-xs text-muted-foreground ml-2">
                              (Line {detail.lineNumber})
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <div className="pt-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/qa/${orderId}`}>
              <ShieldCheck className="mr-2 h-4 w-4" />
              View in QA
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
