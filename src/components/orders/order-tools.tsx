"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Wrench, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ToolAssignment {
  id: string;
  assignment: string | null;
  tool: {
    id: string;
    toolNo: number;
    description: string;
    status: string;
    isProprietary: boolean;
  };
}

interface OrderToolsProps {
  orderId: string;
  assignments: ToolAssignment[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusBadge(status: string) {
  switch (status) {
    case "ACTIVE":
      return (
        <Badge variant="outline" className="border-green-500 text-green-600">
          Active
        </Badge>
      );
    case "RECEIVED":
      return (
        <Badge variant="outline" className="border-blue-500 text-blue-600">
          Received
        </Badge>
      );
    case "IN_USE":
      return (
        <Badge variant="outline" className="border-orange-500 text-orange-600">
          In Use
        </Badge>
      );
    case "RETIRED":
      return <Badge variant="secondary">Retired</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OrderTools({ orderId, assignments }: OrderToolsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ toolId: "", assignment: "" });

  async function handleAssignTool() {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/tools`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toolId: form.toolId,
          assignment: form.assignment || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to assign tool");
        return;
      }

      toast.success("Tool assigned to order");
      setForm({ toolId: "", assignment: "" });
      setShowForm(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveAssignment(toolId: string, assignmentId: string) {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/tools/${toolId}/assignments/${assignmentId}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to remove assignment");
        return;
      }

      toast.success("Tool assignment removed");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Tools</h2>
        </div>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Assign Tool
          </Button>
        )}
      </div>

      {/* Assign Tool Form */}
      {showForm && (
        <div className="rounded-lg border p-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Tool ID</Label>
              <Input
                value={form.toolId}
                onChange={(e) => setForm({ ...form, toolId: e.target.value })}
                placeholder="Tool ID (CUID)"
              />
            </div>
            <div className="space-y-1">
              <Label>Assignment Notes</Label>
              <Input
                value={form.assignment}
                onChange={(e) =>
                  setForm({ ...form, assignment: e.target.value })
                }
                placeholder="Optional notes"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleAssignTool}
              disabled={loading || !form.toolId}
            >
              Assign
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowForm(false);
                setForm({ toolId: "", assignment: "" });
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Assignments Table */}
      {assignments.length === 0 ? (
        <p className="text-muted-foreground">
          No tools assigned to this order.
        </p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Tool #</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-28">Status</TableHead>
                <TableHead className="w-28">Proprietary</TableHead>
                <TableHead>Assignment</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono font-medium">
                    <Link
                      href={`/tools/${a.tool.id}`}
                      className="text-primary hover:underline"
                    >
                      {a.tool.toolNo}
                    </Link>
                  </TableCell>
                  <TableCell>{a.tool.description}</TableCell>
                  <TableCell>{statusBadge(a.tool.status)}</TableCell>
                  <TableCell>
                    {a.tool.isProprietary ? (
                      <Badge
                        variant="outline"
                        className="border-purple-500 text-purple-600"
                      >
                        Yes
                      </Badge>
                    ) : (
                      "\u2014"
                    )}
                  </TableCell>
                  <TableCell>{a.assignment ?? "\u2014"}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        handleRemoveAssignment(a.tool.id, a.id)
                      }
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
