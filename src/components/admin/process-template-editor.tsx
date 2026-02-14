"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { ProcessTemplate } from "./process-template-list";

interface StepDraft {
  key: string;
  operationName: string;
  description: string;
}

interface ProcessTemplateEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: ProcessTemplate | null;
}

let nextStepKey = 0;
function generateKey(): string {
  return `step-${nextStepKey++}`;
}

function createEmptyStep(): StepDraft {
  return { key: generateKey(), operationName: "", description: "" };
}

export function ProcessTemplateEditor({
  open,
  onOpenChange,
  template,
}: ProcessTemplateEditorProps) {
  const router = useRouter();
  const isEdit = !!template;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<StepDraft[]>([createEmptyStep()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Reset form when dialog opens/closes or template changes
  const resetForm = useCallback(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description ?? "");
      setSteps(
        template.steps.map((s) => ({
          key: generateKey(),
          operationName: s.operationName,
          description: s.description ?? "",
        }))
      );
    } else {
      setName("");
      setDescription("");
      setSteps([createEmptyStep()]);
    }
    setError("");
    setSaving(false);
  }, [template]);

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open, resetForm]);

  function addStep() {
    setSteps((prev) => [...prev, createEmptyStep()]);
  }

  function removeStep(index: number) {
    if (steps.length <= 1) return;
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }

  function updateStep(
    index: number,
    field: "operationName" | "description",
    value: string
  ) {
    setSteps((prev) =>
      prev.map((step, i) => (i === index ? { ...step, [field]: value } : step))
    );
  }

  function moveStep(index: number, direction: "up" | "down") {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= steps.length) return;

    setSteps((prev) => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[newIndex];
      copy[newIndex] = temp;
      return copy;
    });
  }

  async function handleSave() {
    setError("");

    // Basic client-side validation
    if (!name.trim()) {
      setError("Template name is required");
      return;
    }

    const hasEmptyStep = steps.some((s) => !s.operationName.trim());
    if (hasEmptyStep) {
      setError("All steps must have an operation name");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        steps: steps.map((s) => ({
          operationName: s.operationName.trim(),
          description: s.description.trim() || undefined,
        })),
      };

      const url = isEdit
        ? `/api/admin/process-templates/${template.id}`
        : "/api/admin/process-templates";
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
        isEdit ? "Template updated" : "Template created"
      );
      onOpenChange(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Template" : "New Process Template"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="template-name">Name *</Label>
            <Input
              id="template-name"
              placeholder="e.g. Standard Coating Process"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-description">Description</Label>
            <Textarea
              id="template-description"
              placeholder="Optional description of this template..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Steps *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addStep}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add Step
              </Button>
            </div>

            <div className="space-y-2">
              {steps.map((step, index) => (
                <div
                  key={step.key}
                  className="flex items-start gap-2 rounded-md border p-3"
                >
                  <div className="flex flex-col gap-0.5 pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => moveStep(index, "up")}
                      disabled={index === 0}
                      title="Move up"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => moveStep(index, "down")}
                      disabled={index === steps.length - 1}
                      title="Move down"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>

                  <span className="pt-2 text-sm font-mono text-muted-foreground w-6 text-center shrink-0">
                    {index + 1}
                  </span>

                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="Operation name *"
                      value={step.operationName}
                      onChange={(e) =>
                        updateStep(index, "operationName", e.target.value)
                      }
                    />
                    <Input
                      placeholder="Description (optional)"
                      value={step.description}
                      onChange={(e) =>
                        updateStep(index, "description", e.target.value)
                      }
                    />
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeStep(index)}
                    disabled={steps.length <= 1}
                    title="Remove step"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {steps.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">
                At least one step is required.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
