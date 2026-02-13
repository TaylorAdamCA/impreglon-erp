"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, Check, ChevronRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LIBRARY_TYPES,
  LIBRARY_TYPE_LABELS,
  type LibraryType,
} from "@/lib/validations/product";

// -- Types --

interface ProductItem {
  id: string;
  libraryNo: number;
  description: string;
  size: string | null;
  coatingPrice1: number | null;
  coatingPrice2: number | null;
  coatingPrice3: number | null;
  coatingPrice4: number | null;
  coatingPrice5: number | null;
  coatingPrice6: number | null;
  coatingPrice7: number | null;
  coatingPrice8: number | null;
}

interface CoatingLabel {
  slotNumber: number;
  coatingName: string;
  areaSpec: string;
}

interface ProductsApiResponse {
  items: ProductItem[];
  total: number;
  labels: CoatingLabel[];
}

// -- Props --

interface AddItemDialogProps {
  quoteId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type DialogMode = "library" | "custom";

// -- Component --

export function AddItemDialog({
  quoteId,
  open,
  onOpenChange,
}: AddItemDialogProps) {
  const router = useRouter();

  // Dialog mode
  const [mode, setMode] = useState<DialogMode>("library");

  // Library mode state
  const [libraryType, setLibraryType] = useState<LibraryType | "">("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [labels, setLabels] = useState<CoatingLabel[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(
    null
  );
  const [selectedCoatingSlot, setSelectedCoatingSlot] = useState<number | null>(
    null
  );
  const [libraryQuantity, setLibraryQuantity] = useState("1");

  // Custom mode state
  const [customDescription, setCustomDescription] = useState("");
  const [customQuantity, setCustomQuantity] = useState("1");
  const [customUnitPrice, setCustomUnitPrice] = useState("");

  // Submitting state
  const [submitting, setSubmitting] = useState(false);

  // Reset all state when dialog closes
  useEffect(() => {
    if (!open) {
      setMode("library");
      setLibraryType("");
      setSearch("");
      setDebouncedSearch("");
      setProducts([]);
      setLabels([]);
      setSelectedProduct(null);
      setSelectedCoatingSlot(null);
      setLibraryQuantity("1");
      setCustomDescription("");
      setCustomQuantity("1");
      setCustomUnitPrice("");
      setSubmitting(false);
    }
  }, [open]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch products when library type or search changes
  const fetchProducts = useCallback(async () => {
    if (!libraryType) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: libraryType,
        pageSize: "20",
      });
      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }

      const res = await fetch(`/api/products?${params.toString()}`);
      if (!res.ok) {
        toast.error("Failed to load products");
        return;
      }

      const data: ProductsApiResponse = await res.json();
      setProducts(data.items);
      setLabels(data.labels);
    } catch {
      toast.error("Network error loading products");
    } finally {
      setLoading(false);
    }
  }, [libraryType, debouncedSearch]);

  useEffect(() => {
    if (open && libraryType) {
      fetchProducts();
    }
  }, [open, libraryType, fetchProducts]);

  // Reset downstream selections when library type changes
  useEffect(() => {
    setSelectedProduct(null);
    setSelectedCoatingSlot(null);
    setSearch("");
    setDebouncedSearch("");
  }, [libraryType]);

  // Reset coating selection when product changes
  useEffect(() => {
    setSelectedCoatingSlot(null);
  }, [selectedProduct]);

  // Get selected coating label
  const selectedCoating = labels.find(
    (l) => l.slotNumber === selectedCoatingSlot
  );

  // Get price for selected coating slot from product
  function getCoatingPrice(
    product: ProductItem,
    slot: number
  ): number | null {
    const key = `coatingPrice${slot}` as keyof ProductItem;
    const value = product[key];
    return typeof value === "number" ? value : null;
  }

  // Submit library item
  async function handleLibrarySubmit() {
    if (!selectedProduct || !selectedCoating || !selectedCoatingSlot) return;

    const qty = parseInt(libraryQuantity, 10);
    if (isNaN(qty) || qty < 1) {
      toast.error("Quantity must be at least 1");
      return;
    }

    setSubmitting(true);
    try {
      const description = `${selectedProduct.description} - ${selectedCoating.coatingName}`;
      const res = await fetch(`/api/quotes/${quoteId}/components`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          quantity: qty,
          unitPrice: 0,
          coating: selectedCoating.coatingName,
          libraryType,
          libraryItemId: selectedProduct.id,
          coatingSlot: selectedCoatingSlot,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to add item");
        return;
      }

      toast.success("Item added to quote");
      router.refresh();
      onOpenChange(false);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Submit custom item
  async function handleCustomSubmit() {
    if (!customDescription.trim()) {
      toast.error("Description is required");
      return;
    }

    const qty = parseInt(customQuantity, 10);
    if (isNaN(qty) || qty < 1) {
      toast.error("Quantity must be at least 1");
      return;
    }

    const price = parseFloat(customUnitPrice);
    if (isNaN(price) || price < 0) {
      toast.error("Unit price must be 0 or greater");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/components`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: customDescription.trim(),
          quantity: qty,
          unitPrice: price,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to add item");
        return;
      }

      toast.success("Item added to quote");
      router.refresh();
      onOpenChange(false);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Determine which library step we're on
  const libraryStep = !libraryType
    ? 1
    : !selectedProduct
      ? 2
      : !selectedCoatingSlot
        ? 3
        : 4;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Line Item</DialogTitle>
          <DialogDescription>
            Add an item from the product library or enter a custom line item.
          </DialogDescription>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="flex gap-2">
          <Button
            variant={mode === "library" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("library")}
          >
            From Library
          </Button>
          <Button
            variant={mode === "custom" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("custom")}
          >
            Custom Item
          </Button>
        </div>

        {/* Library mode */}
        {mode === "library" && (
          <div className="space-y-4">
            {/* Step 1: Select library type */}
            <div className="space-y-2">
              <Label>Library Type</Label>
              <Select
                value={libraryType}
                onValueChange={(val) => setLibraryType(val as LibraryType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a product library..." />
                </SelectTrigger>
                <SelectContent>
                  {LIBRARY_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {LIBRARY_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Step 2: Search and select product */}
            {libraryType && (
              <div className="space-y-2">
                <Label>
                  {selectedProduct ? "Selected Product" : "Search Products"}
                </Label>

                {selectedProduct ? (
                  <div className="flex items-center gap-2 rounded-md border p-3 bg-muted/50">
                    <Check className="h-4 w-4 text-green-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        #{selectedProduct.libraryNo} -{" "}
                        {selectedProduct.description}
                      </p>
                      {selectedProduct.size && (
                        <p className="text-xs text-muted-foreground">
                          Size: {selectedProduct.size}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedProduct(null)}
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by description or library number..."
                        className="pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>

                    <ScrollArea className="h-48 rounded-md border">
                      {loading ? (
                        <div className="flex items-center justify-center h-full py-8">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : products.length === 0 ? (
                        <div className="flex items-center justify-center h-full py-8">
                          <p className="text-sm text-muted-foreground">
                            {debouncedSearch
                              ? "No products found"
                              : "Select a library type to browse products"}
                          </p>
                        </div>
                      ) : (
                        <div className="divide-y">
                          {products.map((product) => (
                            <button
                              key={product.id}
                              className="flex items-center gap-3 w-full px-3 py-2 text-left hover:bg-accent transition-colors"
                              onClick={() => setSelectedProduct(product)}
                            >
                              <span className="text-xs font-mono text-muted-foreground w-8 shrink-0">
                                #{product.libraryNo}
                              </span>
                              <span className="text-sm flex-1 min-w-0 truncate">
                                {product.description}
                              </span>
                              {product.size && (
                                <span className="text-xs text-muted-foreground shrink-0">
                                  {product.size}
                                </span>
                              )}
                              <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                            </button>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </>
                )}
              </div>
            )}

            {/* Step 3: Select coating */}
            {selectedProduct && (
              <div className="space-y-2">
                <Label>Coating</Label>
                {labels.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No coating options configured for this library type.
                  </p>
                ) : (
                  <ScrollArea className="h-40 rounded-md border">
                    <div className="divide-y">
                      {labels.map((label) => {
                        const price = getCoatingPrice(
                          selectedProduct,
                          label.slotNumber
                        );
                        const isSelected =
                          selectedCoatingSlot === label.slotNumber;

                        return (
                          <button
                            key={label.slotNumber}
                            className={`flex items-center gap-3 w-full px-3 py-2 text-left transition-colors ${
                              isSelected
                                ? "bg-primary/10 border-l-2 border-l-primary"
                                : "hover:bg-accent"
                            }`}
                            onClick={() =>
                              setSelectedCoatingSlot(label.slotNumber)
                            }
                          >
                            <div
                              className={`h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                                isSelected
                                  ? "border-primary bg-primary"
                                  : "border-muted-foreground/40"
                              }`}
                            >
                              {isSelected && (
                                <Check className="h-2.5 w-2.5 text-primary-foreground" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">
                                {label.coatingName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {label.areaSpec}
                              </p>
                            </div>
                            {price != null && (
                              <span className="text-sm font-medium shrink-0">
                                ${price.toFixed(2)}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}

            {/* Step 4: Quantity and confirm */}
            {selectedProduct && selectedCoatingSlot && selectedCoating && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="library-quantity">Quantity</Label>
                  <Input
                    id="library-quantity"
                    type="number"
                    min={1}
                    value={libraryQuantity}
                    onChange={(e) => setLibraryQuantity(e.target.value)}
                    className="w-24"
                  />
                </div>

                {/* Summary */}
                <div className="rounded-md border bg-muted/30 p-3 space-y-1">
                  <p className="text-sm font-medium">Summary</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedProduct.description} -{" "}
                    {selectedCoating.coatingName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Quantity: {libraryQuantity}
                    {(() => {
                      const price = getCoatingPrice(
                        selectedProduct,
                        selectedCoatingSlot
                      );
                      if (price != null) {
                        return ` | Unit Price: $${price.toFixed(2)}`;
                      }
                      return "";
                    })()}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Custom mode */}
        {mode === "custom" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="custom-description">Description</Label>
              <Input
                id="custom-description"
                placeholder="Enter item description..."
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="custom-quantity">Quantity</Label>
                <Input
                  id="custom-quantity"
                  type="number"
                  min={1}
                  value={customQuantity}
                  onChange={(e) => setCustomQuantity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="custom-price">Unit Price ($)</Label>
                <Input
                  id="custom-price"
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="0.00"
                  value={customUnitPrice}
                  onChange={(e) => setCustomUnitPrice(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <DialogFooter>
          {mode === "library" && libraryStep > 1 && (
            <Button
              variant="ghost"
              size="sm"
              className="mr-auto"
              onClick={() => {
                if (selectedCoatingSlot) {
                  setSelectedCoatingSlot(null);
                } else if (selectedProduct) {
                  setSelectedProduct(null);
                } else {
                  setLibraryType("");
                }
              }}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
          )}

          {mode === "library" ? (
            <Button
              onClick={handleLibrarySubmit}
              disabled={
                submitting ||
                !selectedProduct ||
                !selectedCoatingSlot ||
                !selectedCoating
              }
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add to Quote
            </Button>
          ) : (
            <Button
              onClick={handleCustomSubmit}
              disabled={
                submitting ||
                !customDescription.trim() ||
                !customUnitPrice
              }
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add to Quote
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
