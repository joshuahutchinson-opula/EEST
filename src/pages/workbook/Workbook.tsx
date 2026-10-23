import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Building2, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, DollarSign, FileDown, History, Loader2, RotateCw } from "lucide-react";
import { clsx } from "clsx";
import { computeWorkbookTotals } from "../../../server/src/lib/workbookTotals";
import { API, ApiError, downloadBlob } from "../../api";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { EmptyState } from "../../components/EmptyState";
import { Skeleton } from "../../components/Skeleton";
import { CURRENT_USER, DEFAULT_EXCHANGE_RATE, G } from "../../lib/constants";
import { useCurrency } from "../../lib/contexts";
import { makeFmt } from "../../lib/utils";
import { AssetListTab } from "./AssetListTab";
import { BomTab } from "./BomTab";
import { CostMarginTab } from "./CostMarginTab";
import { FieldAuditModal } from "./FieldAuditModal";
import { OverrideConflictModal } from "./OverrideConflictModal";
import { ProposalGeneratorModal } from "./ProposalGeneratorModal";
import { SelectProjectModal } from "./SelectProjectModal";
import { SummaryBar } from "./SummaryBar";
import { SynthesisTab } from "./SynthesisTab";
import { recalcLineItem, toNum } from "./shared";
import type { CatalogDevice, Page, Project, ProjectAsset, Quote, QuoteLineItem, SynthesisOverride, SystemType, WorkbookAuditEntry, WorkbookTab } from "../../types";

export const SYSTEM_CATEGORIES: Record<SystemType, { sectionNumber: number; name: string; defaultMarkup: number; importRatePercent: number; importBasis: "sellTotal" | "costTotal"; }[]> = {
  VSS: [
    { sectionNumber: 100, name: "Video Management System Software", defaultMarkup: 0.35, importRatePercent: 0, importBasis: "costTotal" },
    { sectionNumber: 200, name: "Compute and Storage", defaultMarkup: 0.35, importRatePercent: 0.22, importBasis: "costTotal" },
    { sectionNumber: 300, name: "Control Room", defaultMarkup: 0.30, importRatePercent: 0, importBasis: "costTotal" },
    { sectionNumber: 400, name: "Video Security Equipment", defaultMarkup: 0.30, importRatePercent: 0.44, importBasis: "costTotal" },
    { sectionNumber: 500, name: "Network", defaultMarkup: 0.30, importRatePercent: 0.44, importBasis: "costTotal" },
    { sectionNumber: 600, name: "Network Infrastructure", defaultMarkup: 0.30, importRatePercent: 0.44, importBasis: "costTotal" },
    { sectionNumber: 700, name: "Professional Services", defaultMarkup: 0.50, importRatePercent: 0, importBasis: "costTotal" },
    { sectionNumber: 800, name: "Importation", defaultMarkup: 0, importRatePercent: 0, importBasis: "costTotal" },
  ],
  EAC: [
    { sectionNumber: 900, name: "Access Control System Software", defaultMarkup: 0.35, importRatePercent: 0, importBasis: "costTotal" },
    { sectionNumber: 1000, name: "Hardware", defaultMarkup: 0.35, importRatePercent: 0.44, importBasis: "costTotal" },
    { sectionNumber: 1050, name: "Computers", defaultMarkup: 0.35, importRatePercent: 0.22, importBasis: "costTotal" },
    { sectionNumber: 1100, name: "Infrastructure", defaultMarkup: 0.35, importRatePercent: 0.44, importBasis: "costTotal" },
    { sectionNumber: 1200, name: "Professional Services", defaultMarkup: 0.50, importRatePercent: 0, importBasis: "costTotal" },
    { sectionNumber: 1300, name: "Importation", defaultMarkup: 0, importRatePercent: 0, importBasis: "costTotal" },
  ],
  Intercom: [
    { sectionNumber: 1400, name: "Intercom System Software", defaultMarkup: 0.25, importRatePercent: 0, importBasis: "costTotal" },
    { sectionNumber: 1500, name: "Hardware", defaultMarkup: 0.25, importRatePercent: 0.50, importBasis: "costTotal" },
    { sectionNumber: 1600, name: "Infrastructure", defaultMarkup: 0.25, importRatePercent: 0, importBasis: "costTotal" },
    { sectionNumber: 1700, name: "Professional Services", defaultMarkup: 0.50, importRatePercent: 0, importBasis: "costTotal" },
    { sectionNumber: 1800, name: "Importation", defaultMarkup: 0, importRatePercent: 0, importBasis: "costTotal" },
  ],
};

export function Workbook({ navigate }: { navigate: (p: Page) => void }) {
  const { currency } = useCurrency();
  const [projects, setProjects] = useState<Project[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => localStorage.getItem("wb_last_project") || "");
  const [selectedQuoteId, setSelectedQuoteId] = useState<string>("");
  const [showProjectSelect, setShowProjectSelect] = useState(false);
  const [rateUpdate, setRateUpdate] = useState<{ liveRate: number } | null>(null);
  const [priceHistoryAvg, setPriceHistoryAvg] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<WorkbookTab>(() => (localStorage.getItem("wb_tab") as WorkbookTab) || "asset-list");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "">("saved");
  const [projectAssets, setProjectAssets] = useState<ProjectAsset[]>([]);
  const [storeDevices, setStoreDevices] = useState<CatalogDevice[]>([]);
  const [fieldSaveStatus, setFieldSaveStatus] = useState<Record<string, "saved" | "saving" | "">>({});
  const [synthesisOverrides, setSynthesisOverrides] = useState<SynthesisOverride[]>([]);
  const [workbookAudit, setWorkbookAudit] = useState<WorkbookAuditEntry[]>([]);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [overrideConflict, setOverrideConflict] = useState<{ sectionNumber: string; sectionName: string; pendingCallback: (() => void) | null } | null>(null);
  const [systemFilter, setSystemFilter] = useState<SystemType>("VSS");

  useEffect(() => { localStorage.setItem("wb_tab", activeTab); }, [activeTab]);
  useEffect(() => { API.devices.list().then(setStoreDevices).catch(() => setStoreDevices([])); }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [projData, quoteData] = await Promise.all([API.projects.list(), API.quotes.list()]);
      setProjects(projData);
      setQuotes(quoteData);
      const lastId = localStorage.getItem("wb_last_project");
      const pid = lastId && projData.find(p => p.id === lastId) ? lastId : projData[0]?.id || "";
      if (pid && !selectedProjectId) {
        setSelectedProjectId(pid);
        const pq = quoteData.find((q: Quote) => q.projectId === pid);
        if (pq) setSelectedQuoteId(pq.id);
      }
    } catch { setProjects([]); setQuotes([]); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (!selectedProjectId && projects.length > 0) { setShowProjectSelect(true); } }, [projects, selectedProjectId]);

  useEffect(() => {
    if (selectedProjectId) {
      localStorage.setItem("wb_last_project", selectedProjectId);
      API.projectAssets.list(selectedProjectId).then(setProjectAssets).catch(() => setProjectAssets([]));
      API.workbook.getOverrides(selectedProjectId).then(setSynthesisOverrides).catch(() => setSynthesisOverrides([]));
      API.workbook.getAudit(selectedProjectId).then(setWorkbookAudit).catch(() => setWorkbookAudit([]));
    }
  }, [selectedProjectId]);

  useEffect(() => {
    const deviceIds = [...new Set(projectAssets.map(a => a.deviceStoreRef).filter((id): id is string => !!id))];
    if (deviceIds.length === 0) { setPriceHistoryAvg({}); return; }
    let alive = true;
    Promise.all(deviceIds.map(id => API.workbook.getPriceHistory(id).then(h => [id, h] as const).catch(() => [id, []] as const)))
      .then(results => {
        if (!alive) return;
        const avg: Record<string, number> = {};
        for (const [id, history] of results) {
          const prices = history.map(h => toNum(h.price)).filter(p => p > 0);
          if (prices.length > 0) avg[id] = prices.reduce((a, b) => a + b, 0) / prices.length;
        }
        setPriceHistoryAvg(avg);
      });
    return () => { alive = false; };
  }, [projectAssets]);
  // How far an asset-synced line's cost sits from its catalog device's average historical price, in %.
  const priceDeviation = useCallback((li: QuoteLineItem): number | null => {
    if (!li.projectAssetId) return null;
    const deviceId = projectAssets.find(a => a.id === li.projectAssetId)?.deviceStoreRef;
    const avg = deviceId ? priceHistoryAvg[deviceId] : undefined;
    return avg ? ((toNum(li.unitCost) - avg) / avg) * 100 : null;
  }, [projectAssets, priceHistoryAvg]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  // Must stay in lockstep with selectedProjectId — previously only set selectedQuoteId when it
  // was still empty, so switching from a project with a quote to a different project left the
  // FIRST project's quote (and its line items) selected and visibly displayed under the new
  // project's name until the user happened to land on a project with no quote at all.
  useEffect(() => { setSelectedQuoteId(quotes.find((q) => q.projectId === selectedProjectId)?.id || ""); }, [selectedProjectId, quotes]);
  const selectedQuote = quotes.find((q) => q.id === selectedQuoteId);
  // Locked on the quote when it's created; only the explicit "Update rate" action changes it.
  const exchangeRate = toNum(selectedQuote?.exchangeRate, DEFAULT_EXCHANGE_RATE);
  // Every Workbook tab follows the USD/JMD toggle, converting at this quote's locked rate.
  const fmt = useMemo(() => makeFmt(currency, exchangeRate), [currency, exchangeRate]);
  const quoteCategories = selectedQuote?.categories || [];

  // Rows added here stay local until they get a description, so empty rows never reach the quote.
  const draftItemIds = useRef<Set<string>>(new Set());
  // Line items save one at a time. Saves for the same item run in order (so quick successive
  // edits don't trip each other's version check), keyed by the id the row had when it was first
  // edited — a draft keeps its temporary id as the key even after the server assigns a real one.
  const saveQueue = useRef(new Map<string, Promise<void>>());
  const queueKeyFor = useRef(new Map<string, string>());
  const savedIdFor = useRef(new Map<string, string>());
  const itemVersions = useRef(new Map<string, number>());
  const pendingSaves = useRef(0);

  const replaceLineItem = (itemId: string, fn: (li: QuoteLineItem) => QuoteLineItem) =>
    setQuotes(prev => prev.map(q => ({ ...q, categories: q.categories.map(c => ({ ...c, lineItems: c.lineItems.map(li => li.id === itemId ? fn(li) : li) })) })));

  const enqueueSave = (itemId: string, task: (currentId: string) => Promise<void>) => {
    const key = queueKeyFor.current.get(itemId) || itemId;
    pendingSaves.current += 1;
    setSaveStatus("saving");
    const next = (saveQueue.current.get(key) || Promise.resolve())
      .then(() => task(savedIdFor.current.get(key) || itemId))
      .finally(() => { pendingSaves.current -= 1; if (pendingSaves.current === 0) setSaveStatus("saved"); });
    saveQueue.current.set(key, next.catch(() => {}));
  };

  const handleSaveConflict = (itemId: string, err: unknown): boolean => {
    const current = err instanceof ApiError && err.status === 409 ? (err.body as { current?: QuoteLineItem } | null)?.current : undefined;
    if (!current) return false;
    itemVersions.current.set(itemId, current.version ?? 1);
    replaceLineItem(itemId, () => recalcLineItem(current, exchangeRate));
    toast.warning(`"${current.description || "Line item"}" was changed elsewhere — reloaded the latest version. Re-apply your edit if it's still needed.`);
    return true;
  };

  const updateQuoteLineItem = (categoryId: string, itemId: string, updates: Partial<QuoteLineItem>) => {
    const cat = selectedQuote?.categories.find(c => c.id === categoryId);
    const li = cat?.lineItems.find(x => x.id === itemId);
    if (!selectedQuote || !cat || !li) return;
    const quoteId = selectedQuote.id;
    const costOverride = updates.unitCost !== undefined && li.projectAssetId ? { costOverridden: true } : {};
    const merged = recalcLineItem({ ...li, ...updates, ...costOverride }, exchangeRate);
    replaceLineItem(itemId, () => merged);

    if (draftItemIds.current.has(itemId)) {
      if (!merged.description.trim()) return;
      draftItemIds.current.delete(itemId);
      enqueueSave(itemId, async () => {
        try {
          const created = await API.quotes.createLineItem(quoteId, { categoryId, description: merged.description, unitCost: merged.unitCost, quantity: merged.quantity, markupPercent: merged.markupPercent, itemNumber: merged.itemNumber });
          queueKeyFor.current.set(created.id, itemId);
          savedIdFor.current.set(itemId, created.id);
          itemVersions.current.set(created.id, created.version ?? 1);
          replaceLineItem(itemId, (local) => ({ ...local, id: created.id, version: created.version }));
          API.workbook.logAudit(selectedProjectId, `${cat.name} — ${merged.description} — added`, "", merged.description).catch(() => {});
        } catch {
          draftItemIds.current.add(itemId);
          toast.error("Failed to save the new line item");
        }
      });
      return;
    }

    (Object.keys(updates) as (keyof QuoteLineItem)[]).forEach((key) => {
      const oldVal = li[key];
      const newVal = updates[key];
      if (key !== "id" && oldVal !== newVal && newVal !== undefined) {
        API.workbook.logAudit(selectedProjectId, `${cat.name} — ${li.description || "line item"} — ${key}`, String(oldVal), String(newVal)).catch(() => {});
      }
    });
    const payload: Partial<QuoteLineItem> = {};
    for (const key of ["description", "unitCost", "quantity", "markupPercent", "itemNumber"] as const) {
      if (updates[key] !== undefined) (payload as Record<string, unknown>)[key] = updates[key];
    }
    enqueueSave(itemId, async (currentId) => {
      const version = itemVersions.current.get(currentId) ?? li.version ?? 1;
      try {
        const saved = await API.quotes.updateLineItem(currentId, { ...payload, version });
        itemVersions.current.set(currentId, saved.version ?? version + 1);
        replaceLineItem(currentId, (local) => ({ ...local, version: saved.version, costOverridden: saved.costOverridden }));
      } catch (err) {
        if (!handleSaveConflict(currentId, err)) toast.error("Failed to save line item");
      }
    });
  };

  const addLineItem = (categoryId: string) => {
    setQuotes((prev) => prev.map((q) => {
      if (q.id !== selectedQuoteId) return q;
      const updated = { ...q, categories: q.categories.map((cat) => {
        if (cat.id !== categoryId) return cat;
        const defaultMarkup = SYSTEM_CATEGORIES[cat.system]?.find((s) => s.sectionNumber === cat.sectionNumber)?.defaultMarkup ?? 0.35;
        const newItem: QuoteLineItem = { id: crypto.randomUUID?.() || `li${Date.now()}`, itemNumber: String(cat.lineItems.length + 1).padStart(2, "0"), description: "", unitCost: 0, quantity: 1, markupPercent: defaultMarkup, sellPrice: 0, costTotal: 0, sellTotal: 0, profit: 0, jmdConversion: 0 };
        draftItemIds.current.add(newItem.id);
        return { ...cat, lineItems: [...cat.lineItems, newItem] };
      }) };
      return updated;
    }));
  };

  const handleSaveOverride = async (sectionNumber: string, value: number | null, isOverridden: boolean) => {
    const fieldKey = `synth-${sectionNumber}`;
    const previous = synthesisOverrides.find(o => o.sectionNumber === sectionNumber);
    const oldDisplay = previous?.isOverridden ? String(previous.overrideValue) : "auto-calculated";
    const newDisplay = isOverridden ? String(value) : "auto-calculated";
    setFieldSaveStatus(prev => ({ ...prev, [fieldKey]: "saving" }));
    try {
      await API.workbook.saveOverrides(selectedProjectId, [{ projectId: selectedProjectId, sectionNumber, overrideValue: value, isOverridden, overriddenBy: CURRENT_USER.name }]);
      if (oldDisplay !== newDisplay) API.workbook.logAudit(selectedProjectId, `Synthesis section ${sectionNumber} override`, oldDisplay, newDisplay).catch(() => {});
      setSynthesisOverrides(prev => {
        const existing = prev.findIndex(o => o.sectionNumber === sectionNumber);
        if (existing >= 0) { const updated = [...prev]; updated[existing] = { ...updated[existing], overrideValue: value, isOverridden, overriddenBy: CURRENT_USER.name }; return updated; }
        return [...prev, { id: crypto.randomUUID?.() || `ovr${Date.now()}`, projectId: selectedProjectId, sectionNumber, overrideValue: value, isOverridden, overriddenBy: CURRENT_USER.name, overriddenAt: new Date().toISOString() }];
      });
      setTimeout(() => setFieldSaveStatus(prev => ({ ...prev, [fieldKey]: "saved" })), 600);
    } catch { setFieldSaveStatus(prev => ({ ...prev, [fieldKey]: "" })); }
  };

  const handleResetCost = async (categoryId: string, itemId: string) => {
    try {
      const fresh = await API.quotes.resetLineItemCost(itemId);
      itemVersions.current.set(itemId, fresh.version ?? 1);
      setQuotes(prev => prev.map(q => q.id !== selectedQuoteId ? q : { ...q, categories: q.categories.map(c => c.id !== categoryId ? c : { ...c, lineItems: c.lineItems.map(li => li.id === itemId ? recalcLineItem(fresh, exchangeRate) : li) }) }));
      API.workbook.logAudit(selectedProjectId, `${fresh.description} — unitCost override`, "manual", "reset to asset cost").catch(() => {});
      toast.success("Cost reset to the asset's cost");
    } catch { toast.error("Failed to reset cost"); }
  };

  const handleUpdateRate = async () => {
    if (!selectedQuote || !rateUpdate) return;
    const { liveRate } = rateUpdate;
    setRateUpdate(null);
    try {
      await API.quotes.update(selectedQuote.id, { exchangeRate: liveRate });
      API.workbook.logAudit(selectedProjectId, "Quote exchange rate", exchangeRate.toFixed(2), liveRate.toFixed(2)).catch(() => {});
      setQuotes(prev => prev.map(q => q.id === selectedQuote.id ? { ...q, exchangeRate: liveRate } : q));
      toast.success(`Exchange rate updated to J$ ${liveRate.toFixed(2)}`);
    } catch { toast.error("Failed to update exchange rate"); }
  };

  const handleBomEditWithOverride = (sectionNumber: string, sectionName: string, callback: () => void) => {
    const override = synthesisOverrides.find(o => o.sectionNumber === sectionNumber && o.isOverridden);
    if (override) { setOverrideConflict({ sectionNumber, sectionName, pendingCallback: callback }); } else { callback(); }
  };

  const wbTabs = [
    { id: "asset-list" as WorkbookTab, label: "Asset List", description: "Every camera, access point, network device, and cable run pulled from Project Assets plus any manually added line items." },
    { id: "cost-margin" as WorkbookTab, label: "Cost & Margin", description: "Set unit cost and markup per line item to see sell price and profit before it rolls up into the quote." },
    { id: "bom" as WorkbookTab, label: "BOM", description: "The bill of materials grouped by section, with import costs applied — this is what becomes the client-facing quote." },
    { id: "synthesis" as WorkbookTab, label: "Synthesis", description: "Section subtotals across Video, Access, and Intercom rolled up into a grand total with tax — override any section if needed." },
  ];
  const activeTabIndex = wbTabs.findIndex(t => t.id === activeTab);

  // Project assets already sync into line items, so the line items alone are the whole picture.
  const workbookTotals = useMemo(() => {
    const t = computeWorkbookTotals(quoteCategories, synthesisOverrides);
    return { totalCost: t.itemsCost, totalSell: t.itemsSell, blendedMargin: t.itemsSell > 0 ? ((t.itemsSell - t.itemsCost) / t.itemsSell) * 100 : 0 };
  }, [quoteCategories, synthesisOverrides]);

  if (loading) return (<div className="px-3 md:px-5 py-4 md:py-6 space-y-4"><Skeleton className="h-10 w-48" /><div className="flex gap-2"><Skeleton className="h-8 w-24 rounded-lg" /><Skeleton className="h-8 w-24 rounded-lg" /><Skeleton className="h-8 w-24 rounded-lg" /><Skeleton className="h-8 w-24 rounded-lg" /></div><Skeleton className="h-64 rounded-2xl" /></div>);

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] overflow-hidden">
      {overrideConflict && <OverrideConflictModal open={true} sectionName={overrideConflict.sectionName} onUpdateOverride={() => { overrideConflict.pendingCallback?.(); handleSaveOverride(overrideConflict.sectionNumber, null, false); setOverrideConflict(null); }} onKeepOverride={() => { overrideConflict.pendingCallback?.(); setOverrideConflict(null); }} onCancel={() => setOverrideConflict(null)} />}
      {showProjectSelect && <SelectProjectModal onClose={() => setShowProjectSelect(false)} onSelect={(id: string) => { setSelectedProjectId(id); setSelectedQuoteId(quotes.find((q) => q.projectId === id)?.id || ""); setShowProjectSelect(false); }} currentId={selectedProjectId} projects={projects} />}
      {showProposalModal && <ProposalGeneratorModal open={true} onClose={() => setShowProposalModal(false)} projectId={selectedProjectId} />}
      {rateUpdate && selectedQuote && <ConfirmDialog open={true} danger={false} confirmLabel="Update rate" title="Update exchange rate" message={`This quote is locked at J$ ${exchangeRate.toFixed(2)} per US$1. The current live rate is J$ ${rateUpdate.liveRate.toFixed(2)}. Update the quote to the live rate? JMD figures on this quote will change.`} onCancel={() => setRateUpdate(null)} onConfirm={handleUpdateRate} />}
      <div className="px-4 md:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between flex-shrink-0 gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div>
          <h1 className="text-white font-extrabold text-2xl md:text-3xl tracking-tight">Workbook</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <button onClick={() => setShowProjectSelect(true)} className="flex items-center gap-1.5 text-[#8b949e] hover:text-white text-[13px] font-bold cursor-pointer" style={{ ...G.btn, padding: "4px 10px", borderRadius: "8px" }}><Building2 className="w-3 h-3" />{selectedProject ? selectedProject.name : "Select project"}<ChevronDown className="w-3 h-3" /></button>
            {selectedQuote && <span className="text-[12px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/12 text-amber-400">{selectedQuote.refNumber} · {selectedQuote.status}</span>}
            {saveStatus === "saving" && <span className="text-[12px] text-[#8b949e] flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Saving…</span>}
            {saveStatus === "saved" && <span className="text-[12px] text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Saved</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1 rounded-xl" style={G.subtle} title="Exchange rate locked on this quote"><span className="text-[#8b949e] text-[12px] font-extrabold uppercase">FX Rate</span><span className="text-white text-[14px] font-extrabold">J$ {exchangeRate.toFixed(2)}</span></div>
          {selectedQuote && <button onClick={async () => { const liveRate = await API.fx.getRate(); setRateUpdate({ liveRate: toNum(liveRate, DEFAULT_EXCHANGE_RATE) }); }} className="flex items-center gap-1.5 h-9 md:h-7 px-3 rounded-lg text-[#8b949e] hover:text-white text-[12px] font-extrabold cursor-pointer" style={G.btn}><RotateCw className="w-3 h-3" /> Update rate</button>}
          <button onClick={() => { API.workbook.getAudit(selectedProjectId).then(setWorkbookAudit).catch(() => {}); setShowAuditModal(true); }} className="flex items-center gap-1.5 h-9 md:h-7 px-3 rounded-lg text-[#8b949e] hover:text-white text-[12px] font-extrabold cursor-pointer" style={G.btn}><History className="w-3 h-3" /> History</button>
          <button onClick={async () => { try { const { blob, filename } = await API.workbook.exportXlsx(selectedProjectId); downloadBlob(blob, filename); } catch { toast.error("Failed to generate Excel export"); } }} className="flex items-center gap-1.5 h-9 md:h-7 px-3 rounded-lg text-[#8b949e] hover:text-white text-[12px] font-extrabold cursor-pointer" style={G.btn}><FileDown className="w-3 h-3" /> Excel</button>
          <button onClick={() => setShowProposalModal(true)} className="flex items-center gap-1.5 h-9 md:h-7 px-3 rounded-lg text-white text-[12px] font-extrabold cursor-pointer" style={{ background: "#3b82f6" }}><FileDown className="w-3 h-3" /> Proposal</button>
        </div>
      </div>
      <FieldAuditModal open={showAuditModal} entries={workbookAudit} onClose={() => setShowAuditModal(false)} />
      {!selectedQuote && projectAssets.length === 0 ? (
        <div className="flex-1 flex items-center justify-center"><EmptyState icon={DollarSign} title="No workbook" description="Select a project to view its workbook." action={{ label: "Select Project", onClick: () => setShowProjectSelect(true) }} /></div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 md:px-6 pt-3 flex-shrink-0">
            <SummaryBar totalCost={workbookTotals.totalCost} totalSell={workbookTotals.totalSell} blendedMargin={workbookTotals.blendedMargin} fmt={fmt} />
          </div>
          <div className="flex items-center gap-0.5 px-4 py-2 overflow-x-auto flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", scrollbarWidth: "none" }}>
            {wbTabs.map((tab, i) => (
              <Fragment key={tab.id}>
                {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-[#484f58] flex-shrink-0 mx-0.5" />}
                <button onClick={() => setActiveTab(tab.id)} className={clsx("flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-bold whitespace-nowrap cursor-pointer", activeTab === tab.id ? "text-white" : "text-[#8b949e] hover:text-white")} style={activeTab === tab.id ? { background: "rgba(59,130,246,0.20)", border: "1px solid rgba(59,130,246,0.30)" } : undefined}>
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-extrabold flex-shrink-0" style={{ background: activeTab === tab.id ? "#3b82f6" : i < activeTabIndex ? "rgba(16,185,129,0.35)" : "rgba(255,255,255,0.08)", color: activeTab === tab.id ? "#fff" : i < activeTabIndex ? "#34d399" : "#8b949e" }}>{i < activeTabIndex ? <CheckCircle2 className="w-2.5 h-2.5" /> : i + 1}</span>
                  {tab.label}
                </button>
              </Fragment>
            ))}
          </div>
          <p className="px-4 md:px-6 pt-2.5 pb-1 text-[#8b949e] text-[12px] md:text-[13px] flex-shrink-0">{wbTabs[activeTabIndex]?.description}</p>
          <div className="flex-1 overflow-y-auto px-3 md:px-5 py-4 space-y-4" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.08) transparent" }}>
            {activeTab === "asset-list" && <AssetListTab quoteCategories={quoteCategories} exchangeRate={exchangeRate} fmt={fmt} systemFilter={systemFilter} onSystemFilterChange={setSystemFilter} />}
            {activeTab === "cost-margin" && <CostMarginTab quoteCategories={quoteCategories} exchangeRate={exchangeRate} currency={currency} fmt={fmt} onLineItemUpdate={updateQuoteLineItem} onAddLineItem={addLineItem} onResetCost={handleResetCost} priceDeviation={priceDeviation} fieldSaveStatus={fieldSaveStatus} systemFilter={systemFilter} onSystemFilterChange={setSystemFilter} />}
            {activeTab === "bom" && <BomTab quoteCategories={quoteCategories} synthesisOverrides={synthesisOverrides} exchangeRate={exchangeRate} currency={currency} fmt={fmt} onLineItemUpdate={updateQuoteLineItem} onAddLineItem={addLineItem} onBomEditWithOverride={handleBomEditWithOverride} fieldSaveStatus={fieldSaveStatus} systemFilter={systemFilter} onSystemFilterChange={setSystemFilter} />}
            {activeTab === "synthesis" && <SynthesisTab quoteCategories={quoteCategories} synthesisOverrides={synthesisOverrides} fmt={fmt} onSaveOverride={handleSaveOverride} fieldSaveStatus={fieldSaveStatus} />}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-2">
              {activeTabIndex > 0 ? (
                <button onClick={() => setActiveTab(wbTabs[activeTabIndex - 1].id)} className="flex items-center gap-1.5 h-10 md:h-9 px-4 rounded-xl text-[#8b949e] hover:text-white text-[13px] font-bold cursor-pointer" style={G.btn}><ChevronLeft className="w-3.5 h-3.5" /> {wbTabs[activeTabIndex - 1].label}</button>
              ) : <span />}
              {activeTabIndex < wbTabs.length - 1 && (
                <button onClick={() => setActiveTab(wbTabs[activeTabIndex + 1].id)} className="flex items-center gap-1.5 h-10 md:h-9 px-4 rounded-xl text-white text-[13px] font-extrabold cursor-pointer" style={{ background: "#3b82f6" }}>Next: {wbTabs[activeTabIndex + 1].label} <ChevronRight className="w-3.5 h-3.5" /></button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
