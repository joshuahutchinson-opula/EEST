// The one definition of Workbook totals. Synthesis, BOM, the Word proposal and the Excel export
// all derive their numbers from computeWorkbookTotals. The frontend imports this same file, so
// it must stay dependency-free (no Node or server imports). All amounts are USD.

export const GCT_RATE = 0.15;

export type WorkbookSystem = "VSS" | "EAC" | "Intercom";
export type SectionKind = "items" | "contingency" | "import";

export interface TotalsLineItem {
  id?: string;
  description?: string;
  unitCost: number | string;
  quantity: number | string;
  markupPercent: number | string;
}

export interface TotalsCategory {
  id?: string;
  system: string;
  sectionNumber: number | string;
  name: string;
  importRatePercent: number | string;
  lineItems: TotalsLineItem[];
}

export interface TotalsOverride {
  sectionNumber: string;
  overrideValue: number | string | null;
  isOverridden: boolean;
}

export interface SynthesisSectionDef {
  section: string;
  name: string;
  system: WorkbookSystem;
  kind: SectionKind;
}

export const SYNTHESIS_SECTIONS: SynthesisSectionDef[] = [
  { section: "100", name: "Video Management System Software", system: "VSS", kind: "items" },
  { section: "200", name: "Compute and Storage", system: "VSS", kind: "items" },
  { section: "300", name: "Control Room", system: "VSS", kind: "items" },
  { section: "400", name: "Video Security Equipment", system: "VSS", kind: "items" },
  { section: "500", name: "Network", system: "VSS", kind: "items" },
  { section: "600", name: "Network Infrastructure", system: "VSS", kind: "items" },
  { section: "700", name: "Professional Services", system: "VSS", kind: "items" },
  { section: "700.5", name: "Contingency Plan", system: "VSS", kind: "contingency" },
  { section: "800", name: "Importation", system: "VSS", kind: "import" },
  { section: "900", name: "Access Control System Software", system: "EAC", kind: "items" },
  { section: "1000", name: "Hardware", system: "EAC", kind: "items" },
  { section: "1050", name: "Computers", system: "EAC", kind: "items" },
  { section: "1100", name: "Infrastructure", system: "EAC", kind: "items" },
  { section: "1200", name: "Professional Services", system: "EAC", kind: "items" },
  { section: "1200.5", name: "Contingency Plan", system: "EAC", kind: "contingency" },
  { section: "1300", name: "Importation", system: "EAC", kind: "import" },
  { section: "1400", name: "Intercom System Software", system: "Intercom", kind: "items" },
  { section: "1500", name: "Hardware", system: "Intercom", kind: "items" },
  { section: "1600", name: "Infrastructure", system: "Intercom", kind: "items" },
  { section: "1700", name: "Professional Services", system: "Intercom", kind: "items" },
  { section: "1800", name: "Importation", system: "Intercom", kind: "import" },
];

export const WORKBOOK_SYSTEMS: WorkbookSystem[] = ["VSS", "EAC", "Intercom"];

const IMPORT_SECTIONS = new Set(SYNTHESIS_SECTIONS.filter((s) => s.kind === "import").map((s) => s.section));

export function isImportSection(sectionNumber: number | string): boolean {
  return IMPORT_SECTIONS.has(String(sectionNumber));
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function lineItemTotals(li: TotalsLineItem) {
  const unitCost = num(li.unitCost);
  const quantity = num(li.quantity);
  const markupPercent = num(li.markupPercent);
  const sellPrice = unitCost * (1 + markupPercent);
  const costTotal = unitCost * quantity;
  const sellTotal = sellPrice * quantity;
  return { unitCost, quantity, markupPercent, sellPrice, costTotal, sellTotal, profit: sellTotal - costTotal };
}

// Rows with a zero (or blank) quantity are placeholders and never count toward totals.
export function countedLineItems<T extends TotalsLineItem>(items: T[]): T[] {
  return items.filter((li) => num(li.quantity) > 0);
}

export interface SectionTotal {
  section: string;
  name: string;
  system: WorkbookSystem;
  kind: SectionKind;
  importRatePercent: number;
  itemsCost: number;
  itemsSell: number;
  // Items sections only: this section's import charge (cost of its items x its import rate),
  // which rolls up into the system's Importation section.
  importAmount: number;
  // The value before any Synthesis override: item sell total, the system's summed imports for
  // an Importation section, or 0 for Contingency.
  computed: number;
  override: number | null;
  total: number;
  // total - computed: what an override adds on top of (or takes off) the calculated value.
  adjustment: number;
}

export interface SystemTotal {
  system: WorkbookSystem;
  sections: SectionTotal[];
  total: number;
}

export interface WorkbookTotals {
  systems: SystemTotal[];
  sections: SectionTotal[];
  itemsCost: number;
  itemsSell: number;
  subtotal: number;
  gct: number;
  total: number;
}

function normalizeSystem(system: string): WorkbookSystem {
  return system === "EAC" || system === "Intercom" ? system : "VSS";
}

export function computeWorkbookTotals(categories: TotalsCategory[], overrides: TotalsOverride[] = []): WorkbookTotals {
  const overrideBySection = new Map<string, number>();
  for (const o of overrides) {
    if (o.isOverridden && o.overrideValue !== null && o.overrideValue !== "" && Number.isFinite(Number(o.overrideValue))) {
      overrideBySection.set(String(o.sectionNumber), Number(o.overrideValue));
    }
  }

  // Categories in a section the layout doesn't know about still count, appended to their system.
  const layout: SynthesisSectionDef[] = [...SYNTHESIS_SECTIONS];
  for (const cat of categories) {
    const section = String(cat.sectionNumber);
    if (!layout.some((s) => s.section === section)) {
      const system = normalizeSystem(cat.system);
      const lastIndexOfSystem = layout.map((s) => s.system).lastIndexOf(system);
      layout.splice(lastIndexOfSystem + 1, 0, { section, name: cat.name, system, kind: "items" });
    }
  }

  const sections: SectionTotal[] = layout.map((def) => {
    const cats = def.kind === "items" ? categories.filter((c) => String(c.sectionNumber) === def.section) : [];
    let itemsCost = 0;
    let itemsSell = 0;
    let importAmount = 0;
    for (const cat of cats) {
      let catCost = 0;
      for (const li of countedLineItems(cat.lineItems)) {
        const t = lineItemTotals(li);
        catCost += t.costTotal;
        itemsSell += t.sellTotal;
      }
      itemsCost += catCost;
      importAmount += catCost * num(cat.importRatePercent);
    }
    return {
      section: def.section,
      name: def.name,
      system: def.system,
      kind: def.kind,
      importRatePercent: cats.length > 0 ? num(cats[0].importRatePercent) : 0,
      itemsCost,
      itemsSell,
      importAmount,
      computed: itemsSell,
      override: null,
      total: 0,
      adjustment: 0,
    };
  });

  for (const s of sections) {
    if (s.kind === "import") {
      s.computed = sections.filter((x) => x.system === s.system && x.kind === "items").reduce((sum, x) => sum + x.importAmount, 0);
    } else if (s.kind === "contingency") {
      s.computed = 0;
    }
    const override = overrideBySection.get(s.section);
    s.override = override ?? null;
    s.total = override ?? s.computed;
    s.adjustment = s.total - s.computed;
  }

  const systems: SystemTotal[] = WORKBOOK_SYSTEMS.map((system) => {
    const systemSections = sections.filter((s) => s.system === system);
    return { system, sections: systemSections, total: systemSections.reduce((sum, s) => sum + s.total, 0) };
  });
  const subtotal = systems.reduce((sum, s) => sum + s.total, 0);
  const gct = subtotal * GCT_RATE;
  return {
    systems,
    sections,
    itemsCost: sections.reduce((sum, s) => sum + s.itemsCost, 0),
    itemsSell: sections.reduce((sum, s) => sum + s.itemsSell, 0),
    subtotal,
    gct,
    total: subtotal + gct,
  };
}
