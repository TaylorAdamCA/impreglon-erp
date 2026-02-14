"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, AlertTriangle, Loader2 } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export interface FailureType {
  id: string;
  code: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FailureTypeListProps {
  coatingFailures: FailureType[];
  methodFailures: FailureType[];
}

type FailureCategory = "coating" | "method";

export function FailureTypeList({
  coatingFailures,
  methodFailures,
}: FailureTypeListProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FailureType | null>(null);
  const [dialogCategory, setDialogCategory] =
    useState<FailureCategory>("coating");
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form state
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isEdit = !!editingItem;

  const resetForm = useCallback(() => {
    if (editingItem) {
      setCode(editingItem.code);
      setDescription(editingItem.description);
    } else {
      setCode("");
      setDescription("");
    }
    setError("");
    setSaving(false);
  }, [editingItem]);

  useEffect(() => {
    if (dialogOpen) {
      resetForm();
    } else {
      setCode("");
      setDescription("");
      setError("");
    }
  }, [dialogOpen, resetForm]);

  function handleNew(category: FailureCategory) {
    setEditingItem(null);
    setDialogCategory(category);
    setDialogOpen(true);
  }

  function handleEdit(item: FailureType, category: FailureCategory) {
    setEditingItem(item);
    setDialogCategory(category);
    setDialogOpen(true);
  }

  async function handleDelete(item: FailureType, category: FailureCategory) {
    if (
      !confirm(
        `Are you sure you want to deactivate "${item.code}"? It will no longer be available for new QA inspections.`
      )
    ) {
      return;
    }

    setDeleting(item.id);
    try {
      const res = await fetch(
        `/api/admin/failure-types/${category}/${item.id}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Failed to deactivate failure type");
        return;
      }

      toast.success(`"${item.code}" deactivated`);
      router.refresh();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setDeleting(null);
    }
  }

  async function handleSave() {
    setError("");

    if (!code.trim()) {
      setError("Code is required");
      return;
    }

    if (!description.trim()) {
      setError("Description is required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        code: code.trim(),
        description: description.trim(),
      };

      const url = isEdit
        ? `/api/admin/failure-types/${dialogCategory}/${editingItem.id}`
        : `/api/admin/failure-types/${dialogCategory}`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Something went wrong");
        return;
      }

      toast.success(
        isEdit ? "Failure type updated" : "Failure type created"
      );
      setDialogOpen(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function renderTable(
    items: FailureType[],
    category: FailureCategory
  ) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-end">
          <Button onClick={() => handleNew(category)}>
            <Plus className="mr-2 h-4 w-4" />
            Add {category === "coating" ? "Coating" : "Method"} Failure
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-28"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <AlertTriangle className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        No {category} failure types yet. Add one to get started.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium font-mono">
                      {item.code}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[300px] truncate">
                      {item.description}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={item.isActive ? "default" : "secondary"}
                      >
                        {item.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(item, category)}
                          title="Edit failure type"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(item, category)}
                          disabled={
                            deleting === item.id || !item.isActive
                          }
                          title={
                            item.isActive
                              ? "Deactivate failure type"
                              : "Already inactive"
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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

  return (
    <>
      <Tabs defaultValue="coating">
        <TabsList>
          <TabsTrigger value="coating">Coating Failures</TabsTrigger>
          <TabsTrigger value="method">Method Failures</TabsTrigger>
        </TabsList>

        <TabsContent value="coating">
          {renderTable(coatingFailures, "coating")}
        </TabsContent>

        <TabsContent value="method">
          {renderTable(methodFailures, "method")}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Edit" : "Add"}{" "}
              {dialogCategory === "coating" ? "Coating" : "Method"} Failure
              Type
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="failure-code">Code *</Label>
              <Input
                id="failure-code"
                placeholder="e.g. CF-001"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="failure-description">Description *</Label>
              <Input
                id="failure-description"
                placeholder="e.g. Surface adhesion failure"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving
                ? "Saving..."
                : isEdit
                  ? "Save Changes"
                  : "Add Failure Type"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
