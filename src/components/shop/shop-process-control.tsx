"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, CheckCircle2, Circle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

interface ProcessStep {
  id: string;
  stepNumber: number;
  operationName: string;
  completedAt: string | null;
  completedBy: { username: string } | null;
  notes: string | null;
}

interface ShopProcessControlProps {
  orderId: string;
  templateName: string | null;
  steps: ProcessStep[];
  isShipped: boolean;
}

export function ShopProcessControl({
  orderId,
  templateName,
  steps,
  isShipped,
}: ShopProcessControlProps) {
  const router = useRouter();
  const [loadingStepId, setLoadingStepId] = useState<string | null>(null);
  const [stepNotes, setStepNotes] = useState<Record<string, string>>({});

  const completedCount = steps.filter((s) => s.completedAt !== null).length;
  const totalCount = steps.length;

  function isStepDisabled(step: ProcessStep, index: number): boolean {
    if (isShipped) return true;
    if (loadingStepId !== null) return true;

    // Sequential enforcement: can't complete a step if the previous one isn't done
    if (index > 0 && step.completedAt === null) {
      const previousStep = steps[index - 1];
      if (previousStep.completedAt === null) return true;
    }

    return false;
  }

  async function handleToggleStep(stepId: string, completed: boolean) {
    setLoadingStepId(stepId);
    try {
      const notes = stepNotes[stepId]?.trim() || undefined;

      const res = await fetch(`/api/shop/orders/${orderId}/process`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepId, completed, notes }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to update process step");
        return;
      }

      toast.success(
        completed ? "Step marked as complete" : "Step marked as incomplete"
      );
      router.refresh();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoadingStepId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            <CardTitle>Process Control</CardTitle>
          </div>
          {totalCount > 0 && (
            <span className="text-sm text-muted-foreground">
              {completedCount} of {totalCount} step
              {totalCount !== 1 ? "s" : ""} complete
            </span>
          )}
        </div>
        {totalCount > 0 && (
          <div className="mt-2 h-2 w-full rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-primary transition-all"
              style={{
                width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
              }}
            />
          </div>
        )}
      </CardHeader>
      <CardContent>
        {!templateName && steps.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No template assigned. Assign a process template from the header to
            begin tracking steps.
          </p>
        ) : (
          <div className="space-y-3">
            {steps.map((step, index) => {
              const isComplete = step.completedAt !== null;
              const disabled = isStepDisabled(step, index);

              return (
                <div
                  key={step.id}
                  className={`flex items-start gap-3 rounded-lg border p-3 ${
                    isComplete
                      ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950"
                      : ""
                  }`}
                >
                  <div className="pt-0.5">
                    <Checkbox
                      checked={isComplete}
                      onCheckedChange={(checked) =>
                        handleToggleStep(step.id, checked === true)
                      }
                      disabled={disabled}
                      aria-label={`Step ${step.stepNumber}: ${step.operationName}`}
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">
                        #{step.stepNumber}
                      </span>
                      <span
                        className={`text-sm font-medium ${
                          isComplete ? "line-through text-muted-foreground" : ""
                        }`}
                      >
                        {step.operationName}
                      </span>
                      {isComplete ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    {isComplete && step.completedBy && step.completedAt && (
                      <p className="text-xs text-muted-foreground">
                        Completed by {step.completedBy.username} on{" "}
                        {new Date(step.completedAt).toLocaleString("en-CA")}
                      </p>
                    )}
                    {isComplete && step.notes && (
                      <p className="text-xs text-muted-foreground italic">
                        Notes: {step.notes}
                      </p>
                    )}
                    {!isComplete && !isShipped && (
                      <Input
                        placeholder="Optional notes..."
                        className="mt-1 h-7 text-xs"
                        value={stepNotes[step.id] ?? ""}
                        onChange={(e) =>
                          setStepNotes((prev) => ({
                            ...prev,
                            [step.id]: e.target.value,
                          }))
                        }
                        disabled={disabled}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
