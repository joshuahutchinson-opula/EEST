import { useCallback, useEffect, useMemo, useState } from "react";
import { Boxes, Download, MapPin, Package, PackageOpen, Plus, Search, Tags } from "lucide-react";
import { API, fileHref } from "../../api";
import { EmptyState } from "../../components/EmptyState";
import { Skeleton } from "../../components/Skeleton";
import { G } from "../../lib/constants";
import { isTechRole, useAutoTutorial, useRole } from "../../lib/contexts";
import { downloadCSV } from "../../lib/utils";
import type { InventoryCategory, InventoryItem, InventoryKind, InventoryLocation, Page, TutorialStep, UnitStatus } from "../../types";
import { ItemDetailModal } from "./ItemDetailModal";
import { ItemFormModal } from "./ItemFormModal";
import { ListManagerModal } from "./ListManagerModal";
import { isLowStock, itemPhoto, itemTitle, UNIT_STATUS_META, whereLabel } from "./shared";

export const INVENTORY_STEPS: TutorialStep[] = [
  { target: "inv-counts", title: "At a Glance", description: "How many tracked units are in storage, checked out, installed, defective, or waiting to be returned. Click one to filter the list." },
  { target: "inv-filters", title: "Search & Filter", description: "Search by name, serial, MAC or part number, and narrow by kind, status, category or location. Export CSV downloads exactly what's shown." },
  { target: "inv-row", title: "Items", description: "Click any item to see its details, check it in or out, and its full history — including every project it was installed at." },
];

const COUNTS: { status: UnitStatus; label: string }[] = [
  { status: "in_storage", label: "In storage" },
  { status: "checked_out", label: "Checked out" },
  { status: "installed", label: "Installed" },
  { status: "defective", label: "Defective" },
  { status: "to_be_returned", label: "To be returned" },
];

const selectStyle = { ...G.btn, background: "#0d1117", color: "#e6edf3" };

export function InventoryPage({ navigate: _navigate }: { navigate: (p: Page) => void }) {
  const tech = isTechRole(useRole());
  useAutoTutorial("inventory", INVENTORY_STEPS);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [locations, setLocations] = useState<InventoryLocation[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<InventoryKind | "all">("all");
  const [statusFilter, setStatusFilter] = useState<UnitStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [adding, setAdding] = useState<InventoryKind | null>(null);
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [managing, setManaging] = useState<"locations" | "categories" | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [its, locs, cats] = await Promise.all([API.inventory.items(), API.inventory.locations(), API.inventory.categories()]);
      setItems(its); setLocations(locs); setCategories(cats);
    } catch { setItems([]); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);
  const closeItem = useCallback(() => setOpenItemId(null), []);

  const counts = useMemo(() => Object.fromEntries(COUNTS.map((c) => [c.status, items.filter((i) => i.kind === "unit" && i.status === c.status).length])), [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (kindFilter !== "all" && i.kind !== kindFilter) return false;
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      if (categoryFilter !== "all" && i.categoryId !== categoryFilter) return false;
      if (locationFilter !== "all" && i.locationId !== locationFilter) return false;
      if (!q) return true;
      return [i.name, i.manufacturer, i.model, i.serialNumber, i.macAddress, i.partNumber, i.category, i.supplier, i.holderName, i.projectName, i.storageSpot]
        .some((v) => v?.toLowerCase().includes(q));
    });
  }, [items, search, kindFilter, statusFilter, categoryFilter, locationFilter]);

  const exportCsv = () => {
    const header = ["Kind", "Name", "Manufacturer", "Model", "Category", "Part number", "Size/spec", "Serial", "MAC", "Quantity", "Low-stock level", "Status", "Location", "Storage spot", "Project", "Holder", "Supplier", "Purchase date", "Warranty expiry"];
    // Cost is only present for admins (the server never sends it to Tech).
    if (!tech) header.push("Purchase cost");
    const rows = filtered.map((i) => {
      const row = [i.kind === "unit" ? "Tracked unit" : "Bulk", itemTitle(i), i.manufacturer ?? "", i.model ?? "", i.category ?? "", i.partNumber ?? "", i.sizeSpec ?? "",
        i.serialNumber ?? "", i.macAddress ?? "", String(i.quantityOnHand), i.lowStockLevel?.toString() ?? "", i.status ? UNIT_STATUS_META[i.status].label : "",
        i.locationName ?? "", i.storageSpot ?? "", i.projectName ?? "", i.holderName ?? "", i.supplier ?? "", i.purchaseDate ?? "", i.warrantyExpiry ?? ""];
      if (!tech) row.push(i.purchaseCost?.toString() ?? "");
      return row;
    });
    downloadCSV(`inventory-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...rows]);
  };

  if (loading) return (<div className="px-3 md:px-5 py-4 md:py-6 space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-24 rounded-2xl" /><Skeleton className="h-64 rounded-2xl" /></div>);

  return (
    <div className="px-3 md:px-5 py-4 md:py-6 max-w-[1600px] mx-auto w-full">
      {adding && <ItemFormModal kind={adding} locations={locations} categories={categories} onClose={() => setAdding(null)} onSaved={(item) => { setAdding(null); fetchAll(); setOpenItemId(item.id); }} />}
      {openItemId && <ItemDetailModal itemId={openItemId} locations={locations} categories={categories} onClose={closeItem} onChanged={fetchAll} />}
      {managing === "locations" && <ListManagerModal title="Locations" noun="Location" placeholder="New location, e.g. Van 2" entries={locations} create={API.inventory.createLocation} update={API.inventory.updateLocation} onClose={() => setManaging(null)} onChanged={fetchAll} />}
      {managing === "categories" && <ListManagerModal title="Categories" noun="Category" placeholder="New category" entries={categories} create={API.inventory.createCategory} update={API.inventory.updateCategory} onClose={() => setManaging(null)} onChanged={fetchAll} />}

      <div className="flex items-center justify-between gap-3 mb-4 md:mb-6 flex-wrap">
        <div><h1 className="text-white font-extrabold text-2xl md:text-3xl tracking-tight">Inventory</h1><p className="text-[#8b949e] text-[13px] mt-0.5">{items.filter((i) => i.kind === "unit").length} tracked units · {items.filter((i) => i.kind === "bulk").length} bulk items</p></div>
        {!tech && (
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setManaging("categories")} className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-[#c9d1d9] hover:text-white text-[13px] font-bold cursor-pointer" style={G.btn}><Tags className="w-3.5 h-3.5" /> Categories</button>
            <button onClick={() => setManaging("locations")} className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-[#c9d1d9] hover:text-white text-[13px] font-bold cursor-pointer" style={G.btn}><MapPin className="w-3.5 h-3.5" /> Locations</button>
            <button onClick={() => setAdding("bulk")} className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-white text-[13px] font-extrabold cursor-pointer" style={{ background: "#8b5cf6" }}><Plus className="w-3.5 h-3.5" /> Bulk item</button>
            <button onClick={() => setAdding("unit")} className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-white text-[13px] font-extrabold cursor-pointer" style={{ background: "#3b82f6" }}><Plus className="w-3.5 h-3.5" /> Tracked unit</button>
          </div>
        )}
      </div>

      <div data-tour="inv-counts" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-3 mb-4">
        {COUNTS.map((c) => {
          const meta = UNIT_STATUS_META[c.status];
          const active = statusFilter === c.status;
          return (
            <button key={c.status} onClick={() => setStatusFilter(active ? "all" : c.status)} className="rounded-2xl p-3 md:p-4 text-left cursor-pointer transition-all" style={{ ...G.card, ...(active ? { border: `1px solid ${meta.color}` } : {}) }}>
              <p className="text-[1.5rem] md:text-[1.8rem] font-extrabold leading-none" style={{ color: meta.color }}>{counts[c.status]}</p>
              <p className="text-[#8b949e] text-[12px] mt-1">{c.label}</p>
            </button>
          );
        })}
      </div>

      <div data-tour="inv-filters" className="mb-4 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b949e]" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, serial, MAC, part #…" className="h-9 rounded-xl pl-9 w-full text-[14px] text-[#e6edf3] focus:outline-none" style={G.input} /></div>
        <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value as InventoryKind | "all")} className="h-8 rounded-xl px-2 text-[13px] cursor-pointer" style={selectStyle}>
          <option value="all">All kinds</option><option value="unit">Tracked units</option><option value="bulk">Bulk stock</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as UnitStatus | "all")} className="h-8 rounded-xl px-2 text-[13px] cursor-pointer" style={selectStyle}>
          <option value="all">All statuses</option>
          {(Object.keys(UNIT_STATUS_META) as UnitStatus[]).map((s) => <option key={s} value={s}>{UNIT_STATUS_META[s].label}</option>)}
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="h-8 rounded-xl px-2 text-[13px] cursor-pointer" style={selectStyle}>
          <option value="all">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}{c.archived ? " (archived)" : ""}</option>)}
        </select>
        <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className="h-8 rounded-xl px-2 text-[13px] cursor-pointer" style={selectStyle}>
          <option value="all">All locations</option>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.name}{l.archived ? " (archived)" : ""}</option>)}
        </select>
        <button onClick={exportCsv} disabled={filtered.length === 0} className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-[#c9d1d9] hover:text-white text-[13px] font-bold cursor-pointer disabled:opacity-40" style={G.btn}><Download className="w-3.5 h-3.5" /> Export CSV</button>
      </div>

      {items.length === 0 ? <EmptyState icon={PackageOpen} title="No inventory yet" description={tech ? "An admin adds units and stock here." : "Add a tracked unit or a bulk item to start tracking stock."} /> :
        filtered.length === 0 ? <EmptyState icon={Search} title="Nothing matches" description="Try adjusting the search or filters." /> : (
        <div className="rounded-2xl overflow-hidden" style={G.card}>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ minWidth: "760px" }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  {["", "Item", "Serial / Qty", "Status", "Location", "Holder"].map((h, i) => <th key={i} className="px-3 py-3 text-[#8b949e] text-[12px] font-extrabold uppercase tracking-widest text-left">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filtered.map((i) => {
                  const photo = itemPhoto(i);
                  const meta = i.status ? UNIT_STATUS_META[i.status] : null;
                  return (
                    <tr key={i.id} data-tour="inv-row" onClick={() => setOpenItemId(i.id)} className="cursor-pointer hover:bg-white/[0.03]" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td className="px-3 py-2 w-[56px]">
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)" }}>
                          {photo ? <img src={fileHref(photo)} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} /> : i.kind === "unit" ? <Package className="w-4 h-4 text-[#8b949e]" /> : <Boxes className="w-4 h-4 text-[#8b949e]" />}
                        </div>
                      </td>
                      <td className="px-3 py-2 min-w-0">
                        <p className="text-white text-[13px] font-bold truncate max-w-[320px]">{itemTitle(i)}</p>
                        <p className="text-[#8b949e] text-[11px] truncate max-w-[320px]">{i.kind === "unit" ? [i.manufacturer, i.model].filter(Boolean).join(" ") || "Tracked unit" : [i.category, i.partNumber, i.sizeSpec].filter(Boolean).join(" · ") || "Bulk stock"}</p>
                      </td>
                      <td className="px-3 py-2">
                        {i.kind === "unit" ? <span className="text-[#c9d1d9] text-[12px] font-mono">{i.serialNumber || "—"}</span> : (
                          <span className="inline-flex items-center gap-1.5"><span className="text-white text-[13px] font-extrabold">{i.quantityOnHand}</span>{isLowStock(i) && <span className="px-1.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase" style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24" }}>Low stock</span>}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">{meta ? <span className="inline-block px-2 py-0.5 rounded-lg text-[11px] font-extrabold whitespace-nowrap" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span> : <span className="text-[#8b949e] text-[12px]">—</span>}</td>
                      <td className="px-3 py-2 text-[#c9d1d9] text-[12px]">{whereLabel(i)}</td>
                      <td className="px-3 py-2 text-[#c9d1d9] text-[12px]">{i.status === "checked_out" ? i.holderName : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
