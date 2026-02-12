"use client";

import { useState } from "react";
import { QuoteLineItems } from "./quote-line-items";
import { AddItemDialog } from "./add-item-dialog";

interface QuoteDetailProps {
  quoteId: string;
  components: Array<{
    id: string;
    lineNumber: number;
    description: string;
    libraryType: string | null;
    quantity: number;
    unitPrice: number | string;
    lineTotal: number | string;
  }>;
  isDraft: boolean;
}

export function QuoteDetail({ quoteId, components, isDraft }: QuoteDetailProps) {
  const [addItemOpen, setAddItemOpen] = useState(false);

  return (
    <>
      <QuoteLineItems
        quoteId={quoteId}
        components={components}
        isDraft={isDraft}
        onAddItem={() => setAddItemOpen(true)}
      />
      <AddItemDialog
        quoteId={quoteId}
        open={addItemOpen}
        onOpenChange={setAddItemOpen}
      />
    </>
  );
}
