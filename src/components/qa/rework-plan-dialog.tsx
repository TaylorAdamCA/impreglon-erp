"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ReworkPlanDialogProps {
  orderId: string;
  reworkId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ProcessTemplate {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

interface FailureType {
  id: string;
  code: string;
  description: string;
  isActive: boolean;
}

const PRODUCT_TYPES = ["222M", "505", "Other", "Custom", "Re-Rework"];

export function ReworkPlanDialog({
  orderId,
  reworkId,
  open,
  onOpenChange,
}: ReworkPlanDialogProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [productType, setProductType] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [qaNotes, setQaNotes] = useState("");
  const [coatingFailure, setCoatingFailure] = useState("");
  const [methodFailure, setMethodFailure] = useState("");
  const [operations, setOperations] = useState("");
  const [department, setDepartment] = useState("");

  // Lookup data
  const [templates, setTemplates] = useState<ProcessTemplate[]>([]);
  const [coatingFailures, setCoatingFailures] = useState<FailureType[]>([]);
  const [methodFailures, setMethodFailures] = useState<FailureType[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(false);

  useEffect(() => {
    if (!open) return;

    // Reset form
    setProductType("");
    setTemplateId("");
    setQaNotes("");
    setCoatingFailure("");
    setMethodFailure("");
    setOperations("");
    setDepartment("");

    const abortController = new AbortController();

    // Fetch lookups
    async function fetchLookups() {
      setLoadingLookups(true);
      try {
        const [templatesRes, failuresRes] = await Promise.all([
          fetch("/api/admin/process-templates", {
            signal: abortController.signal,
          }),
          fetch("/api/admin/failure-types", {
            signal: abortController.signal,
          }),
        ]);

        if (templatesRes.ok) {
          const data = await templatesRes.json();
          setTemplates(
            Array.isArray(data)
              ? data.filter((t: ProcessTemplate) => t.isActive)
              : []
          );
        }

        if (failuresRes.ok) {
          const data = await failuresRes.json();
          setCoatingFailures(
            (data.coatingFailures ?? []).filter(
              (f: FailureType) => f.isActive
            )
          );
          setMethodFailures(
            (data.methodFailures ?? []).filter((f: FailureType) => f.isActive)
          );
        }
      } catch {
        // Silently fail — dropdowns will be empty (or aborted)
      } finally {
        if (!abortController.signal.aborted) {
          setLoadingLookups(false);
        }
      }
    }

    fetchLookups();
    return () => abortController.abort();
  }, [open]);

  async function handleSubmit() {
    if (!productType) {
      toast.error("Product type is required");
      return;
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        reworkId,
        productType,
      };

      if (templateId) body.templateId = templateId;
      if (qaNotes.trim()) body.qaNotes = qaNotes.trim();
      if (coatingFailure) body.coatingFailure = coatingFailure;
      if (methodFailure) body.methodFailure = methodFailure;
      if (operations.trim()) body.operations = operations.trim();
      if (department.trim()) body.department = department.trim();

      const res = await fetch(`/api/qa/orders/${orderId}/rework-plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to create rework plan");
        return;
      }

      toast.success("Rework plan created");
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Rework Plan</DialogTitle>
          <DialogDescription>
            Fill in the rework memo details for this item.
          </DialogDescription>
        </DialogHeader>

        {loadingLookups ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="productType">Product Type *</Label>
              <Select value={productType} onValueChange={setProductType}>
                <SelectTrigger id="productType" className="w-full">
                  <SelectValue placeholder="Select product type..." />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="templateId">Process Template</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger id="templateId" className="w-full">
                  <SelectValue placeholder="Select template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="qaNotes">QA Notes</Label>
              <Textarea
                id="qaNotes"
                placeholder="Enter QA notes..."
                value={qaNotes}
                onChange={(e) => setQaNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="coatingFailure">Coating Failure</Label>
                <Select
                  value={coatingFailure}
                  onValueChange={setCoatingFailure}
                >
                  <SelectTrigger id="coatingFailure" className="w-full">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {coatingFailures.map((f) => (
                      <SelectItem key={f.id} value={f.code}>
                        {f.code} — {f.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="methodFailure">Method Failure</Label>
                <Select
                  value={methodFailure}
                  onValueChange={setMethodFailure}
                >
                  <SelectTrigger id="methodFailure" className="w-full">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {methodFailures.map((f) => (
                      <SelectItem key={f.id} value={f.code}>
                        {f.code} — {f.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="operations">Operations</Label>
                <Input
                  id="operations"
                  placeholder="e.g., Strip and recoat"
                  value={operations}
                  onChange={(e) => setOperations(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  placeholder="e.g., Coating"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || loadingLookups}
          >
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Create Plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
