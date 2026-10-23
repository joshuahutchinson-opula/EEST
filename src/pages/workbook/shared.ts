import { lineItemTotals } from "../../../server/src/lib/workbookTotals";
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
