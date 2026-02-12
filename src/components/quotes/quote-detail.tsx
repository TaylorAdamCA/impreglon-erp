"use client";

import { useState } from "react";
import { QuoteLineItems } from "./quote-line-items";

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
  const [, setAddItemOpen] = useState(false);

  return (
    <>
      <QuoteLineItems
        quoteId={quoteId}
        components={components}
        isDraft={isDraft}
        onAddItem={() => setAddItemOpen(true)}
      />
      {/* AddItemDialog will be added in Task 8 */}
    </>
  );
}
