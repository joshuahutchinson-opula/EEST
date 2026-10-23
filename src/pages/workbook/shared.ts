import { useRef } from "react";
import { lineItemTotals } from "../../../server/src/lib/workbookTotals";

// Drag-to-reorder line items within one category: the grip handle starts the drag, every row of
// the same category is a drop target, and the dragged item lands before the row it's dropped on.
export function useLineItemReorder(onReorder: (categoryId: string, orderedIds: string[]) => void) {
  const dragging = useRef<{ categoryId: string; itemId: string } | null>(null);
  const handleProps = (categoryId: string, itemId: string) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => { dragging.current = { categoryId, itemId }; e.dataTransfer.effectAllowed = "move"; },
    onDragEnd: () => { dragging.current = null; },
  });
  const rowProps = (categoryId: string, itemId: string, ids: string[]) => ({
    onDragOver: (e: React.DragEvent) => { if (dragging.current?.categoryId === categoryId) e.preventDefault(); },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      const d = dragging.current;
      dragging.current = null;
      if (!d || d.categoryId !== categoryId || d.itemId === itemId) return;
      const next = ids.filter((id) => id !== d.itemId);
      next.splice(next.indexOf(itemId), 0, d.itemId);
      onReorder(categoryId, next);
    },
  });
  return { handleProps, rowProps };
}
import type { QuoteLineItem } from "../../types";

// Converts between stored USD and whatever the USD/JMD toggle is showing, for edit fields.
export function displayMoney(currency: "USD" | "JMD", rate: number) {
  return {
    toDisplay: (usd: number) => (currency === "JMD" ? usd * rate : usd),
    fromDisplay: (shown: number) => (currency === "JMD" ? shown / rate : shown),
  };
}

export function toNum(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function recalcLineItem(item: QuoteLineItem, exchangeRate: number): QuoteLineItem {
  const t = lineItemTotals(item);
  return { ...item, ...t, jmdConversion: t.sellTotal * toNum(exchangeRate) };
}
