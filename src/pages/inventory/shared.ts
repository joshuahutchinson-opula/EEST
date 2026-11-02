import type { InventoryAction, InventoryItem, InventoryTransaction, UnitStatus } from "../../types";

export const UNIT_STATUS_META: Record<UnitStatus, { label: string; color: string; bg: string }> = {
  in_storage: { label: "In storage", color: "#34d399", bg: "rgba(16,185,129,0.14)" },
  checked_out: { label: "Checked out", color: "#60a5fa", bg: "rgba(59,130,246,0.14)" },
  reserved: { label: "Reserved", color: "#a78bfa", bg: "rgba(139,92,246,0.14)" },
  installed: { label: "Installed", color: "#22d3ee", bg: "rgba(6,182,212,0.14)" },
  defective: { label: "Defective", color: "#fb7185", bg: "rgba(244,63,94,0.14)" },
  under_repair: { label: "Under repair", color: "#fbbf24", bg: "rgba(245,158,11,0.14)" },
  to_be_returned: { label: "To be returned", color: "#fb923c", bg: "rgba(249,115,22,0.14)" },
  returned_to_supplier: { label: "Returned to supplier", color: "#8b949e", bg: "rgba(255,255,255,0.06)" },
  retired: { label: "Retired", color: "#6e7681", bg: "rgba(255,255,255,0.04)" },
};

export const ACTION_LABELS: Record<InventoryAction, string> = {
  received: "Received",
  check_out: "Checked out",
  check_in: "Checked in",
  reserve: "Reserved",
  install: "Installed",
  remove_from_site: "Removed from site",
  mark_defective: "Marked defective",
  send_for_repair: "Sent for repair",
  send_to_supplier: "Sent back to supplier",
  retire: "Retired",
  adjust: "Quantity adjusted",
};

// Pre-F19 log rows keep their original free-text action ("Sold", "Loaned", …).
export const actionLabel = (tx: InventoryTransaction) => ACTION_LABELS[tx.action as InventoryAction] ?? tx.action;

// Mirrors the server's rules (server/src/lib/inventory.ts) so only valid buttons are shown; the
// server still enforces them.
export const UNIT_ACTIONS_FROM: Partial<Record<InventoryAction, UnitStatus[]>> = {
  check_out: ["in_storage", "reserved"],
  check_in: ["checked_out", "reserved", "to_be_returned", "under_repair", "defective"],
  reserve: ["in_storage"],
  mark_defective: ["in_storage", "checked_out", "reserved", "installed", "to_be_returned", "under_repair"],
  send_for_repair: ["defective", "in_storage", "to_be_returned"],
  send_to_supplier: ["in_storage", "defective", "under_repair", "to_be_returned"],
  retire: ["in_storage", "defective", "under_repair", "to_be_returned", "returned_to_supplier"],
};
export const TECH_ACTIONS: InventoryAction[] = ["check_out", "check_in", "mark_defective"];
export const TECH_CHECK_IN_FROM: UnitStatus[] = ["checked_out", "to_be_returned"];
export const BULK_ACTIONS: InventoryAction[] = ["received", "check_out", "check_in", "adjust"];

export const ACTION_BUTTON_LABELS: Record<InventoryAction, string> = {
  received: "Receive stock", check_out: "Check out", check_in: "Check in", reserve: "Reserve for project", install: "Install",
  remove_from_site: "Remove from site", mark_defective: "Report defective", send_for_repair: "Send for repair",
  send_to_supplier: "Send back to supplier", retire: "Retire", adjust: "Adjust quantity",
};

export const itemTitle = (i: InventoryItem) => i.name || [i.manufacturer, i.model].filter(Boolean).join(" ");
// Own photos first, falling back to the Device Library image.
export const itemPhoto = (i: InventoryItem) => i.photos[0] || i.deviceImageUrl;
export const isLowStock = (i: InventoryItem) => i.kind === "bulk" && i.lowStockLevel !== undefined && i.quantityOnHand <= i.lowStockLevel;

// Where the item is: the project for reserved/installed units, else location (+ storage spot).
export function whereLabel(i: InventoryItem): string {
  if ((i.status === "installed" || i.status === "reserved") && i.projectName) return i.projectName;
  return [i.locationName, i.storageSpot].filter(Boolean).join(" · ") || "—";
}
