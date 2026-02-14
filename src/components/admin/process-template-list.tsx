"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, ClipboardList } from "lucide-react";
import { toast } from "sonner";
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
import { ProcessTemplateEditor } from "./process-template-editor";

export interface TemplateStep {
  id: string;
  stepNumber: number;
  operationName: string;
  description: string | null;
}

export interface ProcessTemplate {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  steps: TemplateStep[];
}

interface ProcessTemplateListProps {
  templates: ProcessTemplate[];
}

export function ProcessTemplateList({ templates }: ProcessTemplateListProps) {
  const router = useRouter();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<ProcessTemplate | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  function handleNew() {
    setEditingTemplate(null);
    setEditorOpen(true);
  }

  function handleEdit(template: ProcessTemplate) {
    setEditingTemplate(template);
    setEditorOpen(true);
  }

  async function handleDelete(template: ProcessTemplate) {
    if (
      !confirm(
        `Are you sure you want to deactivate "${template.name}"? It will no longer be available for new orders.`
      )
    ) {
      return;
    }

    setDeleting(template.id);
    try {
      const res = await fetch(`/api/admin/process-templates/${template.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Failed to delete template");
        return;
      }

      toast.success(`"${template.name}" deactivated`);
      router.refresh();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <>
      <div className="flex items-center justify-end">
        <Button onClick={handleNew}>
          <Plus className="mr-2 h-4 w-4" />
          New Template
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-24 text-center">Steps</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-28"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <ClipboardList className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      No process templates yet. Create one to get started.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">
                    {template.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[300px] truncate">
                    {template.description || "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    {template.steps.length}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={template.isActive ? "default" : "secondary"}
                    >
                      {template.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(template)}
                        title="Edit template"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(template)}
                        disabled={deleting === template.id || !template.isActive}
                        title={
                          template.isActive
                            ? "Deactivate template"
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

      <ProcessTemplateEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        template={editingTemplate}
      />
    </>
  );
}
