import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, FileDown, Loader2, Package, Plus, Search, Trash2, Upload } from "lucide-react";
import { API, downloadBlob, fileHref } from "../../api";
import { EmptyState } from "../../components/EmptyState";
import { InlineEditCell } from "../../components/InlineEditCell";
import { Skeleton } from "../../components/Skeleton";
import { ASSET_CATEGORY_LABELS, G } from "../../lib/constants";
import { isTechRole, useAutoTutorial, useCurrency, useRole } from "../../lib/contexts";
import type { AccessControlType, AssetCategory, CableSpec, CatalogDevice, InstallDevice, InstallZone, ProjectAsset, SystemType, TutorialStep } from "../../types";

export const CATALOG_CATEGORIES_FOR_ASSET: Record<AssetCategory, CatalogDevice["category"][]> = {
  camera: ["camera"],
  "access-control": ["access-control"],
  "network-hardware": ["switch", "poe-injector", "patch-panel", "rack", "ups", "nvr", "server"],
  "cable-wire": [],
  intercom: ["intercom"],
  software: ["analytics"],
  other: ["camera", "access-control", "nvr", "analytics", "intercom", "other", "switch", "poe-injector", "patch-panel", "rack", "ups", "server"],
};

export const INSTALL_DEVICE_TYPE_FOR_ASSET: Record<AssetCategory, InstallDevice["type"] | null> = { camera: "camera", "access-control": "access", "network-hardware": "server", "cable-wire": null, intercom: "intercom", software: "software", other: "panel" };

export const DEFAULT_SYSTEM_FOR_ASSET: Record<AssetCategory, SystemType> = { camera: "VSS", "access-control": "EAC", "network-hardware": "VSS", "cable-wire": "VSS", intercom: "Intercom", software: "VSS", other: "VSS" };

export const ASSETS_TAB_STEPS: TutorialStep[] = [
  { target: "assets-add", title: "Add Asset", description: "Add a camera, access-control device, network hardware, intercom, cable run, or other item to this project." },
  { target: "assets-search", title: "Search & Filter", description: "Search by item, location, or purpose, or filter down to a single category." },
  { target: "assets-export", title: "Export", description: "Download the full equipment list as a CSV, or a branded Word equipment summary for the client." },
  { target: "assets-row", title: "Asset Rows", description: "Click any asset to edit it. Update its unit price inline, upload coverage photos, or delete it — each row also shows its linked Installation zone." },
];

export const ADD_ASSET_MODAL_STEPS: TutorialStep[] = [
  { target: "aam-category", title: "Category & System", description: "Pick what kind of item this is and which system it belongs to — Video Surveillance, Access Control, or Intercom." },
  { target: "aam-type-fields", title: "Type-Specific Fields", description: "Cable/wire assets get cable type, length, and cost-per-foot fields; every other category lets you pick a specific device from the catalog (or leave it generic) with an editable unit price." },
  { target: "aam-qty-location", title: "Quantity & Location", description: "How many, and where it's physically going." },
  { target: "aam-purpose", title: "Purpose & Notes", description: "What this item is for, plus any freeform notes." },
];

export function ProjectAssetsTab({ projectId, projectName, clientName }: { projectId: string; projectName: string; clientName: string }) {
  const { fmt } = useCurrency();
  const tech = isTechRole(useRole());
  useAutoTutorial("project-detail.assets", ASSETS_TAB_STEPS);
  const [assets, setAssets] = useState<ProjectAsset[]>([]);
  const [storeDevices, setStoreDevices] = useState<CatalogDevice[]>([]);
  const [zones, setZones] = useState<InstallZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  useAutoTutorial("add-asset-modal", ADD_ASSET_MODAL_STEPS, showForm);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<AssetCategory | "all">("all");
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);

  const [category, setCategory] = useState<AssetCategory>("camera");
  const [system, setSystem] = useState<SystemType>("VSS");
  const [deviceStoreRef, setDeviceStoreRef] = useState("");
  const [accessControlType, setAccessControlType] = useState<AccessControlType>("Card Reader");
  const [quantity, setQuantity] = useState("1");
  const [location, setLocation] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");
  const [cableType, setCableType] = useState<CableSpec["cableType"]>("CAT-6");
  const [lengthFt, setLengthFt] = useState("");
  const [runDescription, setRunDescription] = useState("");
  const [costPerFt, setCostPerFt] = useState("");
  const [unitPrice, setUnitPrice] = useState("");

  const resetForm = () => { setCategory("camera"); setSystem("VSS"); setDeviceStoreRef(""); setAccessControlType("Card Reader"); setQuantity("1"); setLocation(""); setZoneId(""); setPurpose(""); setNotes(""); setCableType("CAT-6"); setLengthFt(""); setRunDescription(""); setCostPerFt(""); setUnitPrice(""); };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [assetData, deviceData, zoneData] = await Promise.all([API.projectAssets.list(projectId), API.devices.list(), API.install.zones()]);
      setAssets(assetData);
      setStoreDevices(deviceData);
      setZones(zoneData.filter(z => z.projectId === projectId));
    } catch { setAssets([]); } finally { setLoading(false); }
  }, [projectId]);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openAddForm = () => { resetForm(); setEditingAssetId(null); setShowForm(true); };

  const openEditForm = (asset: ProjectAsset) => {
    setEditingAssetId(asset.id);
    setCategory(asset.category);
    setSystem(asset.system);
    setDeviceStoreRef(asset.deviceStoreRef || "");
    setAccessControlType(asset.accessControlType || "Card Reader");
    setQuantity(String(asset.quantity));
    setLocation(asset.location);
    setZoneId(asset.zoneId || "");
    setPurpose(asset.purpose);
    setNotes(asset.notes || "");
    if (asset.category === "cable-wire" && asset.cableSpec) {
      setCableType(asset.cableSpec.cableType);
      setLengthFt(asset.cableSpec.lengthFt !== undefined ? String(asset.cableSpec.lengthFt) : "");
      setRunDescription(asset.cableSpec.runDescription || "");
      setCostPerFt(asset.cableSpec.costPerFt !== undefined ? String(asset.cableSpec.costPerFt) : "");
      setUnitPrice("");
    } else {
      setCableType("CAT-6"); setLengthFt(""); setRunDescription(""); setCostPerFt("");
      setUnitPrice(String(assetUnitCost(asset, storeDevices) || ""));
    }
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditingAssetId(null); resetForm(); };

  const handleSave = async () => {
    const qty = parseInt(quantity) || 1;
    const cableSpec: CableSpec | undefined = category === "cable-wire" ? { cableType, lengthFt: parseFloat(lengthFt) || undefined, runDescription: runDescription.trim() || undefined, costPerFt: parseFloat(costPerFt) || undefined } : undefined;
    const payload = { category, system, deviceStoreRef: deviceStoreRef || undefined, accessControlType: category === "access-control" ? accessControlType : undefined, cableSpec, unitCost: category === "cable-wire" ? undefined : (parseFloat(unitPrice) || 0), quantity: qty, location: location.trim(), zoneId: zoneId || undefined, purpose: purpose.trim(), notes: notes.trim() || undefined };
    setSaving(true);
    try {
      let result: ProjectAsset;
      if (editingAssetId) {
        result = await API.projectAssets.update(projectId, editingAssetId, payload);
        setAssets(prev => prev.map(a => a.id === result.id ? result : a));
        toast.success("Asset updated");
      } else {
        result = await API.projectAssets.create(projectId, payload);
        setAssets(prev => [...prev, result]);
        const installType = INSTALL_DEVICE_TYPE_FOR_ASSET[category];
        if (zoneId && installType) {
          API.install.addDevice(zoneId, { name: describeAsset(result, storeDevices), type: installType, location: location.trim(), status: "pending", projectAssetId: result.id }).catch(() => toast.error("Asset saved, but adding it to the install tracker failed"));
        }
        toast.success("Asset added");
      }
      closeForm();
    } catch { toast.error(editingAssetId ? "Failed to update asset" : "Failed to add asset"); } finally { setSaving(false); }
  };

  const handleDelete = async (asset: ProjectAsset) => {
    try {
      await API.projectAssets.delete(projectId, asset.id);
      setAssets(prev => prev.filter(a => a.id !== asset.id));
      toast.success("Asset removed");
    } catch { toast.error("Failed to remove asset"); }
  };

  const handlePriceUpdate = async (asset: ProjectAsset, newPrice: number) => {
    try {
      let updated: ProjectAsset;
      if (asset.category === "cable-wire" && asset.cableSpec) {
        const cableSpec = { ...asset.cableSpec, costPerFt: newPrice };
        updated = await API.projectAssets.update(projectId, asset.id, { cableSpec });
      } else {
        updated = await API.projectAssets.update(projectId, asset.id, { unitCost: newPrice });
      }
      setAssets(prev => prev.map(a => a.id === asset.id ? updated : a));
      toast.success("Price updated");
    } catch { toast.error("Failed to update price"); }
  };

  const handlePhotoUpload = async (asset: ProjectAsset, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(asset.id);
    try {
      const result = await API.documents.upload(projectId, file);
      const photos = [...(asset.coveragePhotos || []), result.fileUrl];
      const updated = await API.projectAssets.update(projectId, asset.id, { coveragePhotos: photos });
      setAssets(prev => prev.map(a => a.id === asset.id ? updated : a));
      toast.success("Photo uploaded");
    } catch { toast.error("Upload failed"); }
    setUploadingPhoto(null);
    e.target.value = "";
  };

  const filtered = useMemo(() => {
    let result = assets;
    if (categoryFilter !== "all") result = result.filter(a => a.category === categoryFilter);
    if (search.trim()) { const q = search.toLowerCase(); result = result.filter(a => describeAsset(a, storeDevices).toLowerCase().includes(q) || a.location.toLowerCase().includes(q) || a.purpose.toLowerCase().includes(q)); }
    return result;
  }, [assets, storeDevices, categoryFilter, search]);

  const grouped = useMemo(() => {
    const map = new Map<AssetCategory, ProjectAsset[]>();
    filtered.forEach(a => { const list = map.get(a.category) || []; list.push(a); map.set(a.category, list); });
    return map;
  }, [filtered]);

  const exportRows = () => filtered.map(a => ({ category: ASSET_CATEGORY_LABELS[a.category], item: describeAsset(a, storeDevices), qty: a.quantity, location: a.location, purpose: a.purpose }));

  const exportCsv = () => {
    const rows = exportRows();
    const csv = ["Category,Item,Qty,Location,Purpose", ...rows.map(r => [r.category, r.item, r.qty, r.location, r.purpose].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${projectName.replace(/\s+/g, "-")}-equipment-list.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportEquipmentSummary = async () => {
    try {
      const { blob, filename } = await API.projectAssets.equipmentSummary(projectId);
      downloadBlob(blob, filename);
    } catch { toast.error("Failed to generate equipment summary"); }
  };

  const availableDevices = storeDevices.filter(d => CATALOG_CATEGORIES_FOR_ASSET[category].includes(d.category));

  if (loading) return <div className="space-y-3"><Skeleton className="h-10 w-48" /><Skeleton className="h-40 rounded-2xl" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <button data-tour="assets-add" onClick={openAddForm} className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-white text-[13px] font-extrabold cursor-pointer" style={{ background: "#3b82f6" }}><Plus className="w-3.5 h-3.5" /> Add Asset</button>
        <div data-tour="assets-search" className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#484f58]" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assets…" className="h-9 rounded-xl pl-7 pr-3 text-[13px] text-[#e6edf3] focus:outline-none w-48" style={G.input} /></div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value as AssetCategory | "all")} className="h-9 rounded-xl px-2 text-[13px] cursor-pointer" style={{ ...G.input, background: "#0d1117", color: "#e6edf3" }}>
          <option value="all">All Categories</option>
          {(Object.keys(ASSET_CATEGORY_LABELS) as AssetCategory[]).map(c => <option key={c} value={c}>{ASSET_CATEGORY_LABELS[c]}</option>)}
        </select>
        <div className="flex-1" />
        <span className="text-[#8b949e] text-[13px]">{filtered.length} assets</span>
        <div data-tour="assets-export" className="flex items-center gap-2">
          <button onClick={exportCsv} className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-[#8b949e] hover:text-white text-[13px] font-bold cursor-pointer" style={G.btn}><Download className="w-3.5 h-3.5" /> CSV</button>
          <button onClick={exportEquipmentSummary} className="flex items-center gap-1.5 h-9 px-3 rounded-xl text-[#8b949e] hover:text-white text-[13px] font-bold cursor-pointer" style={G.btn}><FileDown className="w-3.5 h-3.5" /> Equipment Summary</button>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4" onClick={closeForm}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }} />
          <div onClick={e => e.stopPropagation()} className="relative z-10 w-full max-w-[560px] max-h-[85vh] overflow-y-auto rounded-2xl p-6 space-y-3" style={G.liquidGlass}>
            <h3 className="text-white text-[16px] font-extrabold mb-2">{editingAssetId ? "Edit Asset" : "Add Asset"}</h3>
            <div data-tour="aam-category" className="grid grid-cols-2 gap-3">
              <div><label className="text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest block mb-1">Category</label><select value={category} onChange={e => { setCategory(e.target.value as AssetCategory); setDeviceStoreRef(""); setSystem(DEFAULT_SYSTEM_FOR_ASSET[e.target.value as AssetCategory]); }} className="w-full h-9 rounded-xl px-2 text-[13px] cursor-pointer" style={{ ...G.input, background: "#0d1117", color: "#e6edf3" }}>{(Object.keys(ASSET_CATEGORY_LABELS) as AssetCategory[]).map(c => <option key={c} value={c}>{ASSET_CATEGORY_LABELS[c]}</option>)}</select></div>
              <div><label className="text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest block mb-1">System</label><select value={system} onChange={e => setSystem(e.target.value as SystemType)} className="w-full h-9 rounded-xl px-2 text-[13px] cursor-pointer" style={{ ...G.input, background: "#0d1117", color: "#e6edf3" }}><option value="VSS">VSS</option><option value="EAC">EAC</option><option value="Intercom">Intercom</option></select></div>
            </div>
            {category === "access-control" && (
              <div><label className="text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest block mb-1">Type</label><select value={accessControlType} onChange={e => setAccessControlType(e.target.value as AccessControlType)} className="w-full h-9 rounded-xl px-2 text-[13px] cursor-pointer" style={{ ...G.input, background: "#0d1117", color: "#e6edf3" }}>{(["Biometric", "Card Reader", "Push/Request Button", "Key Override", "Lock", "Buzzer"] as AccessControlType[]).map(t => <option key={t} value={t}>{t}</option>)}</select></div>
            )}
            {category === "cable-wire" ? (
              <div data-tour="aam-type-fields" className="grid grid-cols-2 gap-3">
                <div><label className="text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest block mb-1">Cable Type</label><select value={cableType} onChange={e => setCableType(e.target.value as CableSpec["cableType"])} className="w-full h-9 rounded-xl px-2 text-[13px] cursor-pointer" style={{ ...G.input, background: "#0d1117", color: "#e6edf3" }}>{["CAT-6","CAT-6A","Fiber-SM","Fiber-MM","Coax-RG59","Power-18AWG","Power-14AWG","Speaker-Wire","Other"].map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                <div><label className="text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest block mb-1">Length (ft)</label><input type="number" value={lengthFt} onChange={e => setLengthFt(e.target.value)} className="w-full h-9 rounded-xl px-3 text-[13px] text-white focus:outline-none" style={G.input} /></div>
                {!tech && <div><label className="text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest block mb-1">Cost / ft</label><input type="number" value={costPerFt} onChange={e => setCostPerFt(e.target.value)} className="w-full h-9 rounded-xl px-3 text-[13px] text-white focus:outline-none" style={G.input} /></div>}
                <div className="col-span-2"><label className="text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest block mb-1">Run Description</label><input value={runDescription} onChange={e => setRunDescription(e.target.value)} placeholder="e.g. Camera 3 to IDF closet" className="w-full h-9 rounded-xl px-3 text-[13px] text-white focus:outline-none" style={G.input} /></div>
              </div>
            ) : (
              <div data-tour="aam-type-fields" className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest block mb-1">Device (optional)</label><select value={deviceStoreRef} onChange={e => { const ref = e.target.value; setDeviceStoreRef(ref); const sd = availableDevices.find(d => d.id === ref); setUnitPrice(sd?.price ? String(sd.price) : ""); }} className="w-full h-9 rounded-xl px-2 text-[13px] cursor-pointer" style={{ ...G.input, background: "#0d1117", color: "#e6edf3" }}><option value="">— Generic / unspecified —</option>{availableDevices.map(d => <option key={d.id} value={d.id}>{d.manufacturer} {d.model}</option>)}</select></div>
                {!tech && <div className="col-span-2"><label className="text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest block mb-1">Unit Price (editable)</label><input type="number" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} placeholder="0.00" className="w-full h-9 rounded-xl px-3 text-[13px] text-white focus:outline-none" style={G.input} /></div>}
              </div>
            )}
            <div data-tour="aam-qty-location" className="grid grid-cols-3 gap-3">
              <div><label className="text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest block mb-1">Quantity</label><input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full h-9 rounded-xl px-3 text-[13px] text-white focus:outline-none" style={G.input} /></div>
              <div className="col-span-2"><label className="text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest block mb-1">Location</label><input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. North parking entrance" className="w-full h-9 rounded-xl px-3 text-[13px] text-white focus:outline-none" style={G.input} /></div>
            </div>
            <div data-tour="aam-purpose"><label className="text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest block mb-1">Purpose</label><input value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="e.g. LPR capture at vehicle entry" className="w-full h-9 rounded-xl px-3 text-[13px] text-white focus:outline-none" style={G.input} /></div>
            <div><label className="text-[#8b949e] text-[11px] font-extrabold uppercase tracking-widest block mb-1">Notes</label><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full rounded-xl px-3 py-2 text-[13px] text-white focus:outline-none resize-none" style={G.input} /></div>
            <div className="flex gap-2 pt-2">
              <button onClick={closeForm} className="flex-1 h-10 rounded-xl text-[#8b949e] text-[14px] font-bold cursor-pointer" style={G.btn}>Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 h-10 rounded-xl text-white text-[14px] font-extrabold cursor-pointer" style={{ background: "#3b82f6" }}>{saving ? (editingAssetId ? "Saving…" : "Adding…") : (editingAssetId ? "Save Changes" : "Add Asset")}</button>
            </div>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState icon={Package} title="No assets yet" description="Add cameras, access control, network hardware, or cable runs to this project." action={{ label: "Add Asset", onClick: openAddForm }} />
      ) : (
        Array.from(grouped.entries()).map(([cat, items]) => (
          <div key={cat} className="rounded-2xl overflow-hidden" style={G.card}>
            <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}><h3 className="text-white text-[14px] font-extrabold">{ASSET_CATEGORY_LABELS[cat]}</h3><span className="text-[#8b949e] text-[12px]">({items.length})</span></div>
            <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
              {items.map(asset => (
                <div key={asset.id} data-tour="assets-row" onClick={() => openEditForm(asset)} className="px-4 py-3 flex items-start justify-between gap-3 cursor-pointer hover:bg-white/[0.02]" title="Click to edit asset">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-[13px] font-bold">{describeAsset(asset, storeDevices)} <span className="text-[#8b949e] font-semibold">×{asset.quantity}</span></p>
                    <p className="text-[#8b949e] text-[12px] mt-0.5">{asset.location || "No location set"}{asset.purpose ? ` · ${asset.purpose}` : ""}</p>
                    {!tech && (
                      <div className="flex items-center gap-1.5 mt-1.5" onClick={e => e.stopPropagation()}>
                        <span className="text-[#484f58] text-[11px] font-extrabold uppercase tracking-widest">Unit Price</span>
                        <InlineEditCell type="number" value={assetUnitCost(asset, storeDevices)} onChange={(val) => handlePriceUpdate(asset, parseFloat(val) || 0)} />
                        <span className="text-[#484f58] text-[11px]">· Total {fmt(assetUnitCost(asset, storeDevices) * asset.quantity)}</span>
                      </div>
                    )}
                    {asset.zoneId && <p className="text-[#484f58] text-[11px] mt-0.5">Zone: {zones.find(z => z.id === asset.zoneId)?.name || asset.zoneId}</p>}
                    {asset.notes && <p className="text-[#484f58] text-[11px] mt-0.5 italic">{asset.notes}</p>}
                    {asset.category === "camera" && asset.coveragePhotos && asset.coveragePhotos.length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {asset.coveragePhotos.map((p, i) => (
                          <div key={i} className="relative group/photo">
                            <img src={fileHref(p)} alt="" className="w-14 h-14 rounded-lg object-cover" style={{ border: "1px solid rgba(255,255,255,0.10)" }} />
                            <img src={fileHref(p)} alt="" className="hidden group-hover/photo:block absolute z-50 pointer-events-none rounded-xl object-cover" style={{ bottom: "calc(100% + 8px)", left: 0, width: "220px", height: "220px", border: "2px solid rgba(255,255,255,0.20)", boxShadow: "0 12px 40px rgba(0,0,0,0.6)" }} />
                          </div>
                        ))}
                      </div>
                    )}
                    {asset.category === "camera" && <label onClick={e => e.stopPropagation()} className="inline-flex items-center gap-1 mt-2 text-[11px] text-blue-400 cursor-pointer">{uploadingPhoto === asset.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />} {uploadingPhoto === asset.id ? "Uploading…" : "Add coverage photo"}<input type="file" accept="image/*" className="hidden" onChange={e => handlePhotoUpload(asset, e)} disabled={uploadingPhoto === asset.id} /></label>}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(asset); }} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-rose-500/10 cursor-pointer flex-shrink-0"><Trash2 className="w-3.5 h-3.5 text-rose-400" /></button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export function describeAsset(asset: ProjectAsset, storeDevices: CatalogDevice[]): string {
  const sd = asset.deviceStoreRef ? storeDevices.find(d => d.id === asset.deviceStoreRef) : null;
  if (sd) return `${sd.manufacturer} ${sd.model}`;
  if (asset.cableSpec) return `${asset.cableSpec.cableType}${asset.cableSpec.runDescription ? " — " + asset.cableSpec.runDescription : ""}`;
  return asset.purpose || asset.category;
}

export function assetUnitCost(asset: ProjectAsset, storeDevices: CatalogDevice[]): number {
  if (asset.category === "cable-wire") {
    if (asset.cableSpec?.costPerFt && asset.cableSpec.lengthFt) return asset.cableSpec.costPerFt * asset.cableSpec.lengthFt;
    return 0;
  }
  if (asset.unitCost !== undefined && asset.unitCost !== null) return asset.unitCost;
  const sd = asset.deviceStoreRef ? storeDevices.find(d => d.id === asset.deviceStoreRef) : null;
  if (sd?.price) return sd.price;
  return 0;
}
