export type SystemType = "VSS" | "EAC" | "Intercom";

export interface SectionDef {
  sectionNumber: number;
  name: string;
  defaultMarkup: number;
  importRatePercent: number;
}

// Mirrors SYSTEM_CATEGORIES in the frontend Workbook.
export const SYSTEM_CATEGORIES: Record<SystemType, SectionDef[]> = {
  VSS: [
    { sectionNumber: 100, name: "Video Management System Software", defaultMarkup: 0.35, importRatePercent: 0 },
    { sectionNumber: 200, name: "Compute and Storage", defaultMarkup: 0.35, importRatePercent: 0.22 },
    { sectionNumber: 300, name: "Control Room", defaultMarkup: 0.30, importRatePercent: 0 },
    { sectionNumber: 400, name: "Video Security Equipment", defaultMarkup: 0.30, importRatePercent: 0.44 },
    { sectionNumber: 500, name: "Network", defaultMarkup: 0.30, importRatePercent: 0.44 },
    { sectionNumber: 600, name: "Network Infrastructure", defaultMarkup: 0.30, importRatePercent: 0.44 },
    { sectionNumber: 700, name: "Professional Services", defaultMarkup: 0.50, importRatePercent: 0 },
    { sectionNumber: 800, name: "Importation", defaultMarkup: 0, importRatePercent: 0 },
  ],
  EAC: [
    { sectionNumber: 900, name: "Access Control System Software", defaultMarkup: 0.35, importRatePercent: 0 },
    { sectionNumber: 1000, name: "Hardware", defaultMarkup: 0.35, importRatePercent: 0.44 },
    { sectionNumber: 1050, name: "Computers", defaultMarkup: 0.35, importRatePercent: 0.22 },
    { sectionNumber: 1100, name: "Infrastructure", defaultMarkup: 0.35, importRatePercent: 0.44 },
    { sectionNumber: 1200, name: "Professional Services", defaultMarkup: 0.50, importRatePercent: 0 },
    { sectionNumber: 1300, name: "Importation", defaultMarkup: 0, importRatePercent: 0 },
  ],
  Intercom: [
    { sectionNumber: 1400, name: "Intercom System Software", defaultMarkup: 0.25, importRatePercent: 0 },
    { sectionNumber: 1500, name: "Hardware", defaultMarkup: 0.25, importRatePercent: 0.50 },
    { sectionNumber: 1600, name: "Infrastructure", defaultMarkup: 0.25, importRatePercent: 0 },
    { sectionNumber: 1700, name: "Professional Services", defaultMarkup: 0.50, importRatePercent: 0 },
    { sectionNumber: 1800, name: "Importation", defaultMarkup: 0, importRatePercent: 0 },
  ],
};

export function normalizeSystem(system: string | null | undefined): SystemType {
  return system === "EAC" || system === "Intercom" ? system : "VSS";
}

export function quoteTypeForSystem(system: SystemType): string {
  return system === "Intercom" ? "Intercom" : system === "EAC" ? "Access Control" : "Video Surveillance";
}
