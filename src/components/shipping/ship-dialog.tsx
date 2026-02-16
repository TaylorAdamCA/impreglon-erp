"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ShippingOrder } from "./shipping-order-list";

interface CarrierData {
  id: string;
  name: string;
  isDefault: boolean;
}

interface ShipToData {
  id: string;
  name: string;
  city: string;
  address1: string;
  isDefault: boolean;
}

interface ShipDialogProps {
  order: ShippingOrder;
}

export function ShipDialog({ order }: ShipDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [carriers, setCarriers] = useState<CarrierData[]>([]);
  const [shipToAddresses, setShipToAddresses] = useState<ShipToData[]>([]);

  const [shipToAddressId, setShipToAddressId] = useState("");
  const [carrierName, setCarrierName] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [notes, setNotes] = useState("");

  const fetchCustomerData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers/${order.customerId}`);
      if (!res.ok) {
        setError("Failed to load customer data");
        return;
      }
      const data = await res.json();

      const customerCarriers: CarrierData[] = data.carriers || [];
      const customerAddresses: ShipToData[] = data.shipToAddresses || [];

      setCarriers(customerCarriers);
      setShipToAddresses(customerAddresses);

      // Pre-select defaults
      const defaultAddress =
        customerAddresses.find((a: ShipToData) => a.isDefault) ||
        customerAddresses.find(
          (a: ShipToData) => a.id === order.shipToAddress?.id
        );
      if (defaultAddress) {
        setShipToAddressId(defaultAddress.id);
      }

      const defaultCarrier = customerCarriers.find(
        (c: CarrierData) => c.isDefault
      );
      if (defaultCarrier) {
        setCarrierName(defaultCarrier.name);
      }
    } catch {
      setError("Failed to load customer data");
    } finally {
      setIsLoading(false);
    }
  }, [order.customerId, order.shipToAddress?.id]);

  useEffect(() => {
    if (open) {
      fetchCustomerData();
    }
  }, [open, fetchCustomerData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shipToAddressId || !carrierName) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/shop/orders/${order.id}/ship`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shipToAddressId,
          carrierName,
          trackingNumber: trackingNumber || undefined,
          notes: notes || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to ship order");
        return;
      }

      setOpen(false);
      router.refresh();
    } catch {
      setError("Failed to ship order");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (value: boolean) => {
    setOpen(value);
    if (!value) {
      setShipToAddressId("");
      setCarrierName("");
      setTrackingNumber("");
      setNotes("");
      setError(null);
      setCarriers([]);
      setShipToAddresses([]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => e.stopPropagation()}
        >
          <Truck className="mr-1 h-3 w-3" />
          Ship
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Ship Order #{order.orderNo}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-md border px-3 py-2">
              <p className="text-xs text-muted-foreground">Customer</p>
              <p className="font-medium">{order.customerName}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="shipTo">Ship-To Address</Label>
              {shipToAddresses.length > 0 ? (
                <Select
                  value={shipToAddressId}
                  onValueChange={setShipToAddressId}
                >
                  <SelectTrigger id="shipTo">
                    <SelectValue placeholder="Select ship-to address" />
                  </SelectTrigger>
                  <SelectContent>
                    {shipToAddresses.map((addr) => (
                      <SelectItem key={addr.id} value={addr.id}>
                        {addr.name} — {addr.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No ship-to addresses on file for this customer.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="carrier">Carrier</Label>
              {carriers.length > 0 ? (
                <Select value={carrierName} onValueChange={setCarrierName}>
                  <SelectTrigger id="carrier">
                    <SelectValue placeholder="Select carrier" />
                  </SelectTrigger>
                  <SelectContent>
                    {carriers.map((carrier) => (
                      <SelectItem key={carrier.id} value={carrier.name}>
                        {carrier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="carrier"
                  placeholder="Enter carrier name..."
                  value={carrierName}
                  onChange={(e) => setCarrierName(e.target.value)}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tracking">Tracking Number</Label>
              <Input
                id="tracking"
                placeholder="Enter tracking number (optional)"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Shipping notes (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
                rows={3}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || !shipToAddressId || !carrierName}
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirm Shipment
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
