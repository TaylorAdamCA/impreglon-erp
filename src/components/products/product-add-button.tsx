"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductDialog } from "./product-dialog";
import type { LibraryType } from "@/lib/validations/product";

interface ProductAddButtonProps {
  libraryType: LibraryType;
}

export function ProductAddButton({ libraryType }: ProductAddButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Add Item
      </Button>

      <ProductDialog
        libraryType={libraryType}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
