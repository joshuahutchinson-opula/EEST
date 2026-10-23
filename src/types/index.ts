export interface CurrencyCtx {
  currency: "USD" | "JMD";
  setCurrency: (c: "USD" | "JMD") => void;
  fmt: (usdAmt: number, compact?: boolean) => string;
}

// Tech role must not see sales info, contract/project dollar values, contact info, the
// Workbook, or cost figures in Procurement — enforced for real server-side (see the role
// checks in the server's routes); this context just drives what the UI bothers to show.
// Defaults to "admin" for the brief instant before /api/auth/me resolves, since the actual
// security boundary is the backend, not this flag.
export type Role = "admin" | "tech";

// The real signed-in identity (from /api/auth/me), separate from RoleContext and from the
// hardcoded CURRENT_USER constant below — needed wherever a view has to filter data down to
// "assigned to me" (e.g. the Tech dashboard), which the TEAM-name-based CURRENT_USER can't do
// once someone other than TEAM[0] is actually signed in.
export interface SessionUserInfo { name: string; email: string }

export type Page = "login" | "ops-dashboard" | "pipeline" | "projects" | "project-detail" | "workbook" | "install-tracker" | "device-library";

export type Stage = "lead" | "opportunity" | "assessment-scheduled" | "assessment-completed" | "proposal" | "negotiation" | "win" | "lose";

export type ProjectStage = "support" | "planning" | "procurement" | "installation" | "commissioning" | "complete";

export type PipelineType = "sales" | "project";

export type LeadSource = "Tender" | "Single Source" | "Inbound" | "Referral" | "Recurring Client" | "Outbound";

export type QuoteType = "Video Surveillance" | "Access Control" | "Intercom" | "Multiple";

export type SystemType = "VSS" | "EAC" | "Intercom";

export type TaskStatus = "todo" | "in-progress" | "review" | "complete";

export type TaskPriority = "low" | "medium" | "high";

export type SupportType = "contract-support" | "pre-paid" | "post-paid" | "sla";

export type DeviceLibraryTab = "store" | "inventory";

export type WorkbookTab = "asset-list" | "cost-margin" | "bom" | "synthesis";

export interface AuditLogEntry { id: string; projectId: string; event: string; details: string; timestamp: string; user: string; userEmail?: string; field?: string; oldValue?: string; newValue?: string; notificationType?: string; actionUrl?: string; }

export interface ChangeOrder { id: string; projectId: string; title: string; description: string; costImpact: number; status: "draft" | "submitted" | "approved" | "rejected"; createdAt: string; updatedAt: string; createdBy: string; }

export interface Project {
  id: string;
  name: string;
  client: string;
  value: number;
  stage: Stage;
  risk: "low" | "medium" | "high";
  assignee: { name: string; initials: string; color: string };
  dueDate: string;
  cameras: number;
  devices: number;
  location: string;
  contacts?: { name: string; title: string; email: string; phone: string }[];
  summary?: string;
  notes?: string;
  collaborators?: { name: string; initials: string; color: string; role: string }[];
  leadSource?: LeadSource;
  stageHistory?: { stage: Stage | ProjectStage; date: string }[];
  createdAt?: string;
  updatedAt?: string;
  pipelineType?: PipelineType;
  projectStage?: ProjectStage | string;
  supportType?: SupportType;
}

export interface Task { id: string; projectId: string; title: string; description?: string; assignee?: string; subcontractorId?: string; status: TaskStatus; priority: TaskPriority; dueDate?: string; createdAt: string; updatedAt: string; }

export interface DocumentItem { id: string; projectId: string; filename: string; fileUrl: string; fileType?: string; fileSize?: number; uploadedBy?: string; createdAt: string; }

export interface NotificationItem { id: string; user: string; projectId?: string; event: string; details?: string; isRead: boolean; timestamp: string; notificationType?: string; actionUrl?: string; }

export interface QuoteLineItem {
  id: string;
  itemNumber: string;
  description: string;
  unitCost: number;
  quantity: number;
  markupPercent: number;
  sellPrice: number;
  costTotal: number;
  sellTotal: number;
  profit: number;
  jmdConversion: number;
  projectAssetId?: string;
  // An asset-synced line whose cost was edited by hand; asset edits then leave the cost alone.
  costOverridden?: boolean;
  // Bumped by the server on every write; sent back with updates for the 409 conflict check.
  version?: number;
}

export interface QuoteCategory {
  id: string;
  name: string;
  type: QuoteType;
  system: SystemType;
  sectionNumber: number;
  importRatePercent: number;
  lineItems: QuoteLineItem[];
  contingency?: QuoteLineItem;
}

export interface Quote {
  id: string;
  clientName: string;
  refNumber: string;
  date: string;
  status: "draft" | "sent" | "approved" | "rejected";
  quoteType: QuoteType;
  categories: QuoteCategory[];
  exchangeRate: number;
  projectId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface QuoteCtx {
  currentQuote: Quote | null;
  setCurrentQuote: (q: Quote | null) => void;
  addToQuote: (device: CatalogDevice) => void;
}

export type InstallStatus = "pending" | "in-progress" | "complete" | "failed";

export interface InstallDevice { id: string; name: string; type: "camera" | "access" | "nvr" | "door" | "panel" | "power" | "server" | "intercom"; location: string; status: InstallStatus; assignee: string; notes?: string; installedPhotos?: string[]; }

export interface InstallZone { id: string; name: string; devices: InstallDevice[]; projectId?: string; isQuickSupport?: boolean; }

export type DeviceTag = "LPR" | "Night Vision" | "Thermal" | "PTZ" | "Panoramic" | "WDR" | "Lightfinder" | "IR" | "4K" | "8MP" | "Indoor" | "Outdoor";

export type CameraType = "Dome" | "Bullet" | "PTZ" | "Box" | "Panoramic" | "Thermal";

export interface CatalogDevice {
  id: string;
  model: string;
  manufacturer: string;
  category: "camera" | "access-control" | "nvr" | "analytics" | "intercom" | "other" | "switch" | "poe-injector" | "patch-panel" | "rack" | "ups" | "server";
  system: SystemType;
  cameraType?: CameraType;
  resolution?: string;
  lens?: string;
  sensor?: string;
  nightVision?: string;
  weatherRating?: string;
  powerInput?: string;
  storage?: string;
  channels?: string;
  readers?: string;
  authentication?: string;
  price?: number;
  sku?: string;
  discontinued?: boolean;
  imageUrl?: string;
  frameRate?: string;
  compression?: string;
  fov?: string;
  operatingTemp?: string;
  msrp?: number;
  tags?: DeviceTag[];
}

export interface Column { id: Stage; label: string; color: string; }

export interface ProjectColumn { id: ProjectStage; label: string; color: string; }

export type AssetCategory = "camera" | "access-control" | "network-hardware" | "cable-wire" | "intercom" | "software" | "other";

export interface CableSpec {
  cableType: "CAT-6" | "CAT-6A" | "Fiber-SM" | "Fiber-MM" | "Coax-RG59" | "Power-18AWG" | "Power-14AWG" | "Speaker-Wire" | "Other";
  lengthFt?: number;
  shielding?: "UTP" | "STP" | "FTP";
  jacketRating?: "Plenum (CMP)" | "Riser (CMR)" | "PVC (CM)" | "Direct Burial";
  connectorType?: string;
  color?: string;
  runDescription?: string;
  costPerFt?: number;
}

export type AccessControlType = "Biometric" | "Card Reader" | "Push/Request Button" | "Key Override" | "Lock" | "Buzzer";

export interface ProjectAsset {
  id: string;
  projectId: string;
  category: AssetCategory;
  system: SystemType;
  deviceStoreRef?: string;
  accessControlType?: AccessControlType;
  cableSpec?: CableSpec;
  unitCost?: number;
  quantity: number;
  location: string;
  zoneId?: string;
  purpose: string;
  coveragePhotos?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type IconType = React.ComponentType<{ className?: string }>;

export interface SynthesisOverride { id: string; projectId: string; sectionNumber: string; overrideValue: number | null; isOverridden: boolean; overriddenBy?: string; overriddenAt?: string; }

export interface WorkbookAuditEntry { id: string; projectId: string; fieldPath: string; oldValue: string; newValue: string; changedBy: string; changedAt: string; }

export interface AssetListItem { id: string; item: string; qty: number; cost: number; markupPercent: number; sell: number; costTotal: number; total: number; profit: number; isProjectAsset?: boolean; deviceType?: string; system?: SystemType; sourceCategory?: string; sourceItemId?: string; }

export interface InventoryItem { id: string; name: string; quantityOnHand: number; location?: string; notes?: string; deviceId?: string; model?: string; manufacturer?: string; sku?: string; }

export interface InventoryTransaction { id: string; itemId: string; itemName: string; userName: string; action: string; quantity: number; purpose?: string; notes?: string; createdAt: string; }

export interface Subcontractor { id: string; projectId: string; name: string; trade?: string; email?: string; shareToken?: string | null; createdAt: string; documents: { id: string; filename: string; fileUrl: string; uploadedBy?: string; createdAt: string; }[]; }

export interface PublicSubcontractor { id: string; name: string; trade?: string; email?: string; projectName: string; createdAt: string; documents: { id: string; filename: string; fileUrl: string; createdAt: string; }[]; tasks: { id: string; title: string; description?: string; status: TaskStatus; priority: TaskPriority; dueDate?: string; }[]; }

export interface PublicProjectStatus {
  project: { name: string; client: string; location: string; projectStage: ProjectStage; dueDate: string; cameras: number; devices: number; progress: number; stageHistory: { stage: string; date: string }[]; summary?: string; team: { name: string; initials: string; color: string; roles: string[] }[] };
  changeOrders: { title: string; description: string; costImpact: number; status: ChangeOrder["status"]; createdAt: string }[];
  assets: { category: AssetCategory; quantity: number; location: string; purpose: string; cableSpec?: CableSpec; coveragePhotos?: string[]; manufacturer?: string; model?: string }[];
}

export interface CommissioningItem { id: string; projectId: string; deviceId?: string; deviceName: string; location?: string; status: "pending" | "pass" | "fail"; notes?: string; photos?: string[]; createdAt?: string; updatedAt?: string; }

export interface TutorialStep { target: string; title: string; description: string }

export interface TutorialRequest { key: string; steps: TutorialStep[] }

export interface TutorialCtxValue {
  seen: Set<string>;
  seenLoaded: boolean;
  current: TutorialRequest | null;
  enqueue: (req: TutorialRequest) => void;
  dequeue: (key: string) => void;
  complete: () => void;
  replay: (req: TutorialRequest) => void;
}
