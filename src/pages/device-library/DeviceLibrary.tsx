import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, Store, Upload } from "lucide-react";
import { API } from "../../api";
import { EmptyState } from "../../components/EmptyState";
import { G } from "../../lib/constants";
import { isTechRole, useAutoTutorial, useCurrency, useRole } from "../../lib/contexts";
import { DeviceImage } from "./DeviceImage";
import { DeviceSpecModal } from "./DeviceSpecModal";
import { CAT_COLOR_DS, TAG_STYLES } from "./shared";
import type { CatalogDevice, DeviceTag, Page, SystemType, TutorialStep } from "../../types";
import { SELECTION_CHANGED } from "../../components/GlobalSearch";

export const DEVICE_LIBRARY_STEPS: TutorialStep[] = [
  { target: "dl-search", title: "Search & Filter", description: "Search by model, SKU, or tag, or narrow down by category and system (VSS, EAC, Intercom)." },
  { target: "dl-import", title: "Bulk CSV Import", description: "The catalog is populated by importing a CSV — there's no single-item add form, so bring devices in as a spreadsheet with Model, Manufacturer, Category, System, Price, SKU, and Image URL columns." },
  { target: "dl-card", title: "Device Cards", description: "Click any device to see its full spec sheet." },
];

export function DeviceLibrary({ navigate: _navigate }: { navigate: (p: Page) => void }) {
  const tech = isTechRole(useRole());
  useAutoTutorial("device-library", DEVICE_LIBRARY_STEPS);
  const [search, setSearch] = useState(() => { const s = localStorage.getItem("device_library_search") || ""; localStorage.removeItem("device_library_search"); return s; });
  useEffect(() => {
    const onChange = () => { const s = localStorage.getItem("device_library_search"); if (s !== null) { setSearch(s); localStorage.removeItem("device_library_search"); } };
    window.addEventListener(SELECTION_CHANGED, onChange);
    return () => window.removeEventListener(SELECTION_CHANGED, onChange);
  }, []);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [systemFilter, setSystemFilter] = useState<SystemType | "all">("all");
  const [selectedDevice, setSelectedDevice] = useState<CatalogDevice | null>(null);
  const [devices, setDevices] = useState<CatalogDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const { fmt } = useCurrency();
  const [csvUploading, setCsvUploading] = useState(false);

  const fetchDevices = useCallback(async () => { setLoading(true); try { const data = await API.devices.list(); setDevices(data); } catch { setDevices([]); } finally { setLoading(false); } }, []);
  useEffect(() => { fetchDevices(); }, [fetchDevices]);

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setCsvUploading(true);
    try {
      const text = await file.text();
      const lines = text.split("\n").filter(l => l.trim());
      const headers = lines[0].split(",").map(h => h.trim().replace(/"/g,""));
      const VALID_CATEGORIES: CatalogDevice["category"][] = ["camera", "access-control", "nvr", "analytics", "intercom", "other", "switch", "poe-injector", "patch-panel", "rack", "ups", "server"];
      const parseCategory = (raw: string | undefined): CatalogDevice["category"] => {
        const normalized = (raw || "").trim().toLowerCase().replace(/\s+/g, "-");
        return (VALID_CATEGORIES.find(c => c === normalized) || "other") as CatalogDevice["category"];
      };
      const parsed = lines.slice(1).map(line => {
        const vals = line.split(",").map(v => v.trim().replace(/"/g,""));
        const obj: any = {};
        headers.forEach((h,i) => { obj[h] = vals[i]; });
        return { model: obj.Model||obj.model||"", manufacturer: obj.Manufacturer||obj.manufacturer||"Unknown", category: parseCategory(obj.Category||obj.category), system: (obj.System as SystemType) || "VSS", cameraType: obj["Camera Type"]||undefined, resolution: obj["Max Video Resolution"]||undefined, lens: obj["Sensor/Lens/Horizontal FOV"]||undefined, price: parseFloat(obj.Price||"0")||undefined, sku: obj.SKU||obj.Model||undefined, imageUrl: obj["Image URL"]||obj.Image||undefined, tags: [] as DeviceTag[] };
      });
      if (parsed.length > 0) { await API.devices.bulk(parsed); toast.success(`Imported ${parsed.length} devices`); fetchDevices(); }
    } catch { toast.error("CSV import failed"); }
    finally { setCsvUploading(false); e.target.value = ""; }
  };

  const categories: { id: string; label: string }[] = [{ id: "all", label: "All" },{ id: "camera", label: "Cameras" },{ id: "access-control", label: "Access" },{ id: "nvr", label: "NVR" },{ id: "server", label: "Server" },{ id: "analytics", label: "VMS" },{ id: "intercom", label: "Intercom" }];
  const filtered = useMemo(() => {
    let result = devices;
    if (categoryFilter !== "all") result = result.filter((d) => d.category === categoryFilter);
    if (systemFilter !== "all") result = result.filter((d) => d.system === systemFilter);
    if (search.trim()) { const q = search.toLowerCase(); result = result.filter((d) => d.model.toLowerCase().includes(q) || d.manufacturer.toLowerCase().includes(q) || (d.sku??"").toLowerCase().includes(q) || (d.tags??[]).some(t=>t.toLowerCase().includes(q))); }
    return result;
  }, [devices, search, categoryFilter, systemFilter]);

  return (
    <div className="px-3 md:px-5 py-4 md:py-6">
      {selectedDevice && <DeviceSpecModal device={selectedDevice} onClose={() => setSelectedDevice(null)} />}
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div><h1 className="text-white font-extrabold text-2xl md:text-3xl tracking-tight">Device Library</h1><p className="text-[#8b949e] text-[13px] mt-0.5">{filtered.length} products</p></div>
      </div>
      <div className="mb-4 md:mb-5 flex items-center gap-2 flex-wrap">
        <div data-tour="dl-search" className="relative flex-1 min-w-[160px] max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b949e]" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search model, SKU, tags…" className="h-9 rounded-xl pl-9 w-full text-[14px] text-[#e6edf3] focus:outline-none" style={G.input} /></div>
        <div className="flex gap-1.5 flex-wrap">{categories.map((c) => (<button key={c.id} onClick={() => setCategoryFilter(c.id)} className="h-8 px-2.5 rounded-xl text-[13px] font-bold cursor-pointer whitespace-nowrap" style={categoryFilter===c.id?{background:"rgba(59,130,246,0.15)",color:"#60a5fa",border:"1px solid rgba(59,130,246,0.35)"}:{...G.btn,color:"#8b949e"}}>{c.label}</button>))}</div>
        <select value={systemFilter} onChange={(e) => setSystemFilter(e.target.value as SystemType | "all")} className="h-8 rounded-xl px-2 text-[13px] cursor-pointer" style={{ ...G.btn, background: "#0d1117", color: "#e6edf3" }}>
          <option value="all" style={{ background: "#0d1117", color: "#e6edf3" }}>All Systems</option>
          <option value="VSS" style={{ background: "#0d1117", color: "#e6edf3" }}>VSS</option>
          <option value="EAC" style={{ background: "#0d1117", color: "#e6edf3" }}>EAC</option>
          <option value="Intercom" style={{ background: "#0d1117", color: "#e6edf3" }}>Intercom</option>
        </select>
        {!tech && <label data-tour="dl-import" className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-[#8b949e] text-[13px] font-bold hover:text-white cursor-pointer" style={G.btn}><Upload className="w-3.5 h-3.5" /> {csvUploading ? "Importing…" : "Import CSV"}<input type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} disabled={csvUploading} /></label>}
      </div>
      {devices.length === 0 ? <EmptyState icon={Store} title="Device store is empty" description="Import a CSV to populate the catalog." /> : filtered.length === 0 ? <EmptyState icon={Search} title="No devices match" description="Try adjusting filters." /> : (
        <div className="grid gap-3 md:gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
          {filtered.map((device) => {
            const cc = CAT_COLOR_DS[device.category] ?? CAT_COLOR_DS.other;
            return (
              <div key={device.id} data-tour="dl-card" onClick={() => setSelectedDevice(device)} className="rounded-2xl overflow-hidden cursor-pointer group transition-all md:hover:-translate-y-1" style={{ ...G.card }}>
                <div className="relative h-32 md:h-36 overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <DeviceImage device={device} className="w-full h-full object-contain p-3 opacity-70 group-hover:opacity-90" iconClassName="w-12 h-12 text-[#8b949e]" />
                  <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1">
                    <span className="inline-block px-2 py-0.5 rounded-lg text-[11px] font-extrabold uppercase" style={{ background: cc.bg, color: cc.text }}>{cc.label}</span>
                    {device.cameraType && <span className="inline-block px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase" style={{ background: "rgba(255,255,255,0.08)", color: "#e6edf3" }}>{device.cameraType}</span>}
                  </div>
                  <div className="absolute bottom-2 left-2"><span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase" style={{ background: "rgba(0,0,0,0.5)", color: "#e6edf3" }}>{device.system}</span></div>
                </div>
                <div className="p-3">
                  <p className="text-[#8b949e] text-[11px] font-bold">{device.manufacturer}</p>
                  <p className="text-white text-[14px] font-extrabold mt-0.5 truncate">{device.model}</p>
                  <div className="flex flex-wrap gap-1 mt-2">{device.tags?.slice(0,3).map((tag) => { const ts = TAG_STYLES[tag]; return ts ? <span key={tag} className="inline-block px-1.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase" style={{ background: ts.bg, color: ts.text }}>{tag}</span> : null; })}</div>
                  <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}><span className="text-[#8b949e] text-[10px] font-mono">{device.sku}</span><span className="font-extrabold text-[13px]" style={{ color: cc.text }}>{device.price ? fmt(device.price) : "—"}</span></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
