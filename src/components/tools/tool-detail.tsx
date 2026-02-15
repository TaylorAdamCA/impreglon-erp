"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ToolPart {
  id: string;
  partNo: string;
  description: string;
  price: string | null;
  quantity: number;
}

interface ToolAssignment {
  id: string;
  assignment: string | null;
  createdAt: string;
  order: { id: string; orderNo: number; company: string };
}

interface ToolReceipt {
  id: string;
  receivedBy: string;
  receivedAt: string;
  condition: string | null;
  notes: string | null;
}

interface SerializedTool {
  id: string;
  toolNo: number;
  description: string;
  toolType: string | null;
  status: string;
  price: string | null;
  owner: string | null;
  location: string | null;
  isProprietary: boolean;
  parts: ToolPart[];
  assignments: ToolAssignment[];
  receipts: ToolReceipt[];
}

interface ToolDetailProps {
  tool: SerializedTool;
  canModify: boolean;
  canReceive: boolean;
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

function formatPrice(price: string | null) {
  if (!price) return "\u2014";
  const num = parseFloat(price);
  return `$${num.toFixed(2)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-CA");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ToolDetail({ tool, canModify, canReceive }: ToolDetailProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // ---- Edit form state ----
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    description: tool.description,
    toolType: tool.toolType ?? "",
    owner: tool.owner ?? "",
    location: tool.location ?? "",
    price: tool.price ?? "",
    isProprietary: tool.isProprietary,
  });

  // ---- Part form state ----
  const [showPartForm, setShowPartForm] = useState(false);
  const [partForm, setPartForm] = useState({ partNo: "", description: "", price: "", quantity: "1" });
  const [editingPartId, setEditingPartId] = useState<string | null>(null);
  const [editPartForm, setEditPartForm] = useState({ partNo: "", description: "", price: "", quantity: "1" });

  // ---- Assignment form state ----
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignForm, setAssignForm] = useState({ orderId: "", assignment: "" });

  // ---- Receipt form state ----
  const [showReceiptForm, setShowReceiptForm] = useState(false);
  const [receiptForm, setReceiptForm] = useState({ condition: "", notes: "" });

  const isRetired = tool.status === "RETIRED";

  // =========================================================================
  // Edit Tool
  // =========================================================================

  async function handleSaveEdit() {
    setLoading(true);
    try {
      const body = {
        description: editForm.description,
        toolType: editForm.toolType || undefined,
        owner: editForm.owner || undefined,
        location: editForm.location || undefined,
        price: editForm.price ? parseFloat(editForm.price) : undefined,
        isProprietary: editForm.isProprietary,
      };

      const res = await fetch(`/api/tools/${tool.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to update tool");
        return;
      }

      toast.success("Tool updated");
      setEditing(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  // =========================================================================
  // Change Status
  // =========================================================================

  async function handleStatusChange(newStatus: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/tools/${tool.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to change status");
        return;
      }

      toast.success(`Status changed to ${newStatus.replace("_", " ").toLowerCase()}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  // =========================================================================
  // Parts CRUD
  // =========================================================================

  async function handleAddPart() {
    setLoading(true);
    try {
      const body = {
        partNo: partForm.partNo,
        description: partForm.description,
        price: partForm.price ? parseFloat(partForm.price) : undefined,
        quantity: parseInt(partForm.quantity) || 1,
      };

      const res = await fetch(`/api/tools/${tool.id}/parts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to add part");
        return;
      }

      toast.success("Part added");
      setPartForm({ partNo: "", description: "", price: "", quantity: "1" });
      setShowPartForm(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdatePart(partId: string) {
    setLoading(true);
    try {
      const body = {
        partNo: editPartForm.partNo,
        description: editPartForm.description,
        price: editPartForm.price ? parseFloat(editPartForm.price) : undefined,
        quantity: parseInt(editPartForm.quantity) || 1,
      };

      const res = await fetch(`/api/tools/${tool.id}/parts/${partId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to update part");
        return;
      }

      toast.success("Part updated");
      setEditingPartId(null);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleDeletePart(partId: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/tools/${tool.id}/parts/${partId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to delete part");
        return;
      }

      toast.success("Part deleted");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  // =========================================================================
  // Assignments
  // =========================================================================

  async function handleAddAssignment() {
    setLoading(true);
    try {
      const body = {
        orderId: assignForm.orderId,
        assignment: assignForm.assignment || undefined,
      };

      const res = await fetch(`/api/tools/${tool.id}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to assign tool");
        return;
      }

      toast.success("Tool assigned to order");
      setAssignForm({ orderId: "", assignment: "" });
      setShowAssignForm(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveAssignment(assignmentId: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/tools/${tool.id}/assignments/${assignmentId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to remove assignment");
        return;
      }

      toast.success("Assignment removed");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  // =========================================================================
  // Receipts
  // =========================================================================

  async function handleRecordReceipt() {
    setLoading(true);
    try {
      const body = {
        condition: receiptForm.condition || undefined,
        notes: receiptForm.notes || undefined,
      };

      const res = await fetch(`/api/tools/${tool.id}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to record receipt");
        return;
      }

      toast.success("Receipt recorded");
      setReceiptForm({ condition: "", notes: "" });
      setShowReceiptForm(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => router.push("/tools")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Tools
      </Button>

      {/* ----------------------------------------------------------------- */}
      {/* Header Card                                                        */}
      {/* ----------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <CardTitle className="text-2xl">
                  Tool #{tool.toolNo}
                </CardTitle>
                {statusBadge(tool.status)}
                {tool.isProprietary && (
                  <Badge variant="outline" className="border-purple-500 text-purple-600">
                    Proprietary
                  </Badge>
                )}
              </div>
              {!editing && (
                <p className="text-muted-foreground">{tool.description}</p>
              )}
            </div>
            {canModify && !editing && (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
            {editing && (
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            )}
          </div>
        </CardHeader>

        {!editing && (
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="font-medium">{tool.toolType ?? "\u2014"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Owner</p>
                <p className="font-medium">{tool.owner ?? "\u2014"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-medium">{tool.location ?? "\u2014"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Price</p>
                <p className="font-medium font-mono">{formatPrice(tool.price)}</p>
              </div>
            </div>
          </CardContent>
        )}

        {editing && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-toolType">Tool Type</Label>
                <Input
                  id="edit-toolType"
                  value={editForm.toolType}
                  onChange={(e) => setEditForm({ ...editForm, toolType: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-owner">Owner</Label>
                <Input
                  id="edit-owner"
                  value={editForm.owner}
                  onChange={(e) => setEditForm({ ...editForm, owner: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-location">Location</Label>
                <Input
                  id="edit-location"
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-price">Price</Label>
                <Input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editForm.price}
                  onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Checkbox
                  id="edit-proprietary"
                  checked={editForm.isProprietary}
                  onCheckedChange={(checked) =>
                    setEditForm({ ...editForm, isProprietary: checked === true })
                  }
                />
                <Label htmlFor="edit-proprietary">Proprietary Tool</Label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveEdit} disabled={loading || !editForm.description}>
                Save Changes
              </Button>
              <Button variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* ----------------------------------------------------------------- */}
      {/* Status Controls                                                    */}
      {/* ----------------------------------------------------------------- */}
      {canModify && !isRetired && (
        <Card>
          <CardHeader>
            <CardTitle>Change Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Select
                value=""
                onValueChange={(value) => {
                  if (value !== "RETIRED") {
                    handleStatusChange(value);
                  }
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select new status..." />
                </SelectTrigger>
                <SelectContent>
                  {["ACTIVE", "RECEIVED", "IN_USE"].filter((s) => s !== tool.status).map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={loading}>
                    Retire Tool
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Retire Tool #{tool.toolNo}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently retire the tool. Retired tools cannot have
                      their status changed, cannot be assigned to orders, and cannot
                      receive new receipts. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleStatusChange("RETIRED")}>
                      Retire
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      )}

      {isRetired && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              This tool has been retired and can no longer be modified.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Tabs: Parts / Assignments / Receipts                               */}
      {/* ----------------------------------------------------------------- */}
      <Tabs defaultValue="parts">
        <TabsList>
          <TabsTrigger value="parts">
            Parts ({tool.parts.length})
          </TabsTrigger>
          <TabsTrigger value="assignments">
            Assignments ({tool.assignments.length})
          </TabsTrigger>
          <TabsTrigger value="receipts">
            Receipts ({tool.receipts.length})
          </TabsTrigger>
        </TabsList>

        {/* ---- Parts Tab ---- */}
        <TabsContent value="parts">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Parts</CardTitle>
                {canModify && !showPartForm && (
                  <Button size="sm" onClick={() => setShowPartForm(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Part
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Add part form */}
              {showPartForm && (
                <div className="mb-4 rounded-lg border p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="space-y-1">
                      <Label>Part #</Label>
                      <Input
                        value={partForm.partNo}
                        onChange={(e) => setPartForm({ ...partForm, partNo: e.target.value })}
                        placeholder="Part number"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Description</Label>
                      <Input
                        value={partForm.description}
                        onChange={(e) => setPartForm({ ...partForm, description: e.target.value })}
                        placeholder="Description"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={partForm.quantity}
                        onChange={(e) => setPartForm({ ...partForm, quantity: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Price</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={partForm.price}
                        onChange={(e) => setPartForm({ ...partForm, price: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleAddPart}
                      disabled={loading || !partForm.partNo || !partForm.description}
                    >
                      Add
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowPartForm(false);
                        setPartForm({ partNo: "", description: "", price: "", quantity: "1" });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Parts table */}
              {tool.parts.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No parts recorded for this tool.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Part #</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-20 text-right">Qty</TableHead>
                      <TableHead className="w-28 text-right">Price</TableHead>
                      {canModify && <TableHead className="w-24" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tool.parts.map((part) => (
                      <TableRow key={part.id}>
                        {editingPartId === part.id ? (
                          <>
                            <TableCell>
                              <Input
                                value={editPartForm.partNo}
                                onChange={(e) => setEditPartForm({ ...editPartForm, partNo: e.target.value })}
                                className="h-8"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={editPartForm.description}
                                onChange={(e) => setEditPartForm({ ...editPartForm, description: e.target.value })}
                                className="h-8"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="1"
                                value={editPartForm.quantity}
                                onChange={(e) => setEditPartForm({ ...editPartForm, quantity: e.target.value })}
                                className="h-8 text-right"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editPartForm.price}
                                onChange={(e) => setEditPartForm({ ...editPartForm, price: e.target.value })}
                                className="h-8 text-right"
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUpdatePart(part.id)}
                                  disabled={loading || !editPartForm.partNo || !editPartForm.description}
                                >
                                  Save
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingPartId(null)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </>
                        ) : (
                          <>
                            <TableCell className="font-mono">{part.partNo}</TableCell>
                            <TableCell>{part.description}</TableCell>
                            <TableCell className="text-right">{part.quantity}</TableCell>
                            <TableCell className="text-right font-mono">
                              {formatPrice(part.price)}
                            </TableCell>
                            {canModify && (
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditingPartId(part.id);
                                      setEditPartForm({
                                        partNo: part.partNo,
                                        description: part.description,
                                        price: part.price ?? "",
                                        quantity: String(part.quantity),
                                      });
                                    }}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeletePart(part.id)}
                                    disabled={loading}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Assignments Tab ---- */}
        <TabsContent value="assignments">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Order Assignments</CardTitle>
                {canModify && !isRetired && !showAssignForm && (
                  <Button size="sm" onClick={() => setShowAssignForm(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Assign to Order
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Assign form */}
              {showAssignForm && (
                <div className="mb-4 rounded-lg border p-4 space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label>Order ID</Label>
                      <Input
                        value={assignForm.orderId}
                        onChange={(e) => setAssignForm({ ...assignForm, orderId: e.target.value })}
                        placeholder="Order ID (CUID)"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Assignment Notes</Label>
                      <Input
                        value={assignForm.assignment}
                        onChange={(e) => setAssignForm({ ...assignForm, assignment: e.target.value })}
                        placeholder="Optional notes"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleAddAssignment}
                      disabled={loading || !assignForm.orderId}
                    >
                      Assign
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowAssignForm(false);
                        setAssignForm({ orderId: "", assignment: "" });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Assignments table */}
              {tool.assignments.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No order assignments for this tool.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-28">Order #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Assignment</TableHead>
                      <TableHead className="w-44">Date</TableHead>
                      {canModify && <TableHead className="w-16" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tool.assignments.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>
                          <Link
                            href={`/orders/${a.order.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            #{a.order.orderNo}
                          </Link>
                        </TableCell>
                        <TableCell>{a.order.company}</TableCell>
                        <TableCell>{a.assignment ?? "\u2014"}</TableCell>
                        <TableCell>{formatDate(a.createdAt)}</TableCell>
                        {canModify && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveAssignment(a.id)}
                              disabled={loading}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---- Receipts Tab ---- */}
        <TabsContent value="receipts">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Receipts</CardTitle>
                {canReceive && !isRetired && !showReceiptForm && (
                  <Button size="sm" onClick={() => setShowReceiptForm(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Record Receipt
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Receipt form */}
              {showReceiptForm && (
                <div className="mb-4 rounded-lg border p-4 space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label>Condition</Label>
                      <Input
                        value={receiptForm.condition}
                        onChange={(e) => setReceiptForm({ ...receiptForm, condition: e.target.value })}
                        placeholder="e.g. Good, Damaged, Needs Repair"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Notes</Label>
                      <Textarea
                        value={receiptForm.notes}
                        onChange={(e) => setReceiptForm({ ...receiptForm, notes: e.target.value })}
                        placeholder="Additional notes..."
                        rows={2}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleRecordReceipt}
                      disabled={loading}
                    >
                      Record Receipt
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowReceiptForm(false);
                        setReceiptForm({ condition: "", notes: "" });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Receipts table */}
              {tool.receipts.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No receipts recorded for this tool.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-44">Date</TableHead>
                      <TableHead>Received By</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tool.receipts.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{formatDate(r.receivedAt)}</TableCell>
                        <TableCell>{r.receivedBy}</TableCell>
                        <TableCell>{r.condition ?? "\u2014"}</TableCell>
                        <TableCell>{r.notes ?? "\u2014"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
