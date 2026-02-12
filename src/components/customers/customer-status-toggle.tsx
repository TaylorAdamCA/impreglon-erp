"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface CustomerStatusToggleProps {
  customerId: string;
  company: string;
  isActive: boolean;
}

export function CustomerStatusToggle({
  customerId,
  company,
  isActive,
}: CustomerStatusToggleProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const action = isActive ? "deactivate" : "reactivate";

  async function handleConfirm() {
    setSubmitting(true);

    const res = await fetch(`/api/customers/${customerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });

    setSubmitting(false);

    if (res.ok) {
      setOpen(false);
      setConfirmation("");
      router.refresh();
    }
  }

  const confirmationMatch = isActive
    ? confirmation.toLowerCase() === company.toLowerCase()
    : true;

  return (
    <>
      <Button
        variant={isActive ? "destructive" : "outline"}
        size="sm"
        onClick={() => setOpen(true)}
      >
        {isActive ? (
          <>
            <Ban className="mr-2 h-4 w-4" />
            Deactivate
          </>
        ) : (
          <>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reactivate
          </>
        )}
      </Button>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); setConfirmation(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isActive ? "Deactivate Customer" : "Reactivate Customer"}
            </DialogTitle>
            <DialogDescription>
              {isActive
                ? "This will mark the customer as inactive. They will be hidden from lists and cannot be used in new orders or quotes. Existing records will not be affected."
                : `This will reactivate "${company}" and make them available again.`}
            </DialogDescription>
          </DialogHeader>

          {isActive ? (
            <div className="space-y-4">
              <p className="text-sm">
                To confirm, type the company name: <strong>{company}</strong>
              </p>
              <Input
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder={company}
              />
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => { setOpen(false); setConfirmation(""); }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={!confirmationMatch || submitting}
                  onClick={handleConfirm}
                >
                  {submitting ? "Deactivating..." : "Deactivate Customer"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button disabled={submitting} onClick={handleConfirm}>
                {submitting ? "Reactivating..." : "Reactivate Customer"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
