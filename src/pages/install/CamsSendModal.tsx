import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { motion } from "motion/react";
import { AlertTriangle, ChevronDown, ChevronUp, CloudUpload, Loader2, X } from "lucide-react";
import { API, ApiError } from "../../api";
import { G } from "../../lib/constants";
import type { CamsImportType, CamsPlan, CamsSendResult } from "../../types";

const TYPE_LABEL: Record<CamsImportType, string> = { cameras: "Cameras", doors: "Doors", servers: "Servers", switches: "Switches", software: "Software" };
const errorText = (err: unknown, fallback: string) => (err instanceof ApiError ? (err.body as { error?: string } | null)?.error : null) || fallback;

// Sends a project's completed install devices into CAMS (through EEST's server). Pick the CAMS
// client, map each install zone to a CAMS zone (typing a new name creates it), optionally change
// the zone per device, preview, then send.
export function CamsSendModal({ projectId, projectName, onClose, onSent }: { projectId: string; projectName: string; onClose: () => void; onSent: () => void }) {
  const [clients, setClients] = useState<{ id: number; name: string }[] | null>(null);
  const [clientId, setClientId] = useState<number | null>(null);
  const [plan, setPlan] = useState<CamsPlan | null>(null);
  const [camsZones, setCamsZones] = useState<string[]>([]);
  const [zoneByZoneId, setZoneByZoneId] = useState<Record<string, string>>({});
  const [zoneByDeviceId, setZoneByDeviceId] = useState<Record<string, string>>({});
  const [showDevices, setShowDevices] = useState(false);
  const [resendAll, setResendAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<CamsSendResult | null>(null);

  // First load: CAMS clients and the plan with the client remembered for this project.
  useEffect(() => {
    Promise.all([API.cams.clients(), API.cams.plan(projectId)])
      .then(([c, p]) => { setClients(c); setPlan(p); setClientId(p.camsClientId && c.some((x) => x.id === p.camsClientId) ? p.camsClientId : null); })
      .catch((err) => { toast.error(errorText(err, "Couldn't reach CAMS")); onClose(); })
      .finally(() => setLoading(false));
  }, [projectId]);

  // On picking a client: its zones, and the zone choices remembered for it.
  useEffect(() => {
    if (!clientId) return;
    let alive = true;
    Promise.all([API.cams.zones(clientId), API.cams.plan(projectId, clientId)])
      .then(([zones, p]) => {
        if (!alive) return;
        setCamsZones(zones);
        setPlan(p);
        // Pre-fill: the zone remembered for this EEST zone name, else a CAMS zone with the same name, else the EEST name.
        setZoneByZoneId(Object.fromEntries(p.zones.map((z) => [z.id, p.zoneChoices[z.name] || zones.find((n) => n.toLowerCase() === z.name.toLowerCase()) || z.name])));
        setZoneByDeviceId({});
      })
      .catch((err) => toast.error(errorText(err, "Failed to load CAMS zones")));
    return () => { alive = false; };
  }, [clientId, projectId]);

  const preview = useMemo(() => {
    const counts: Partial<Record<CamsImportType, number>> = {};
    const skipped: { name: string; reason: string }[] = [];
    let notComplete = 0, alreadySent = 0;
    for (const z of plan?.zones || []) for (const d of z.devices) {
      if (d.status !== "complete") { notComplete++; continue; }
      if (!d.camsType) { skipped.push({ name: d.name, reason: d.skipReason || "Not tracked in CAMS" }); continue; }
      if (d.sentAt && !resendAll) { alreadySent++; continue; }
      counts[d.camsType] = (counts[d.camsType] || 0) + 1;
    }
    const total = Object.values(counts).reduce((s, n) => s + (n || 0), 0);
    return { counts, skipped, notComplete, alreadySent, total };
  }, [plan, resendAll]);

  const send = async () => {
    if (!clientId) return;
    setSending(true);
    try {
      const r = await API.cams.send(projectId, { clientId, zoneByZoneId, zoneByDeviceId, resendAll });
      setResult(r);
      if (r.errors.length) toast.error(`CAMS reported ${r.errors.length} error${r.errors.length === 1 ? "" : "s"}`);
      else toast.success(`CAMS imported ${r.total} device${r.total === 1 ? "" : "s"}`);
      onSent();
    } catch (err) { toast.error(errorText(err, "Failed to send to CAMS")); }
    finally { setSending(false); }
  };

  const sendable = (plan?.zones || []).map((z) => ({ ...z, devices: z.devices.filter((d) => d.status === "complete" && d.camsType && d.camsType !== "software" && (resendAll || !d.sentAt)) })).filter((z) => z.devices.length > 0);
  const isNewZone = (name: string) => !!name.trim() && !camsZones.includes(name.trim());

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }} />
      <motion.div initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }} onClick={(e) => e.stopPropagation()} className="relative z-10 w-full max-w-[560px] max-h-[90vh] overflow-y-auto rounded-2xl p-6 space-y-4" style={G.liquidGlass}>
        <div className="flex items-center justify-between">
          <div><h3 className="text-white text-[16px] font-extrabold">Send to CAMS</h3><p className="text-[#8b949e] text-[12px]">{projectName}</p></div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/[0.08] cursor-pointer"><X className="w-4 h-4 text-[#8b949e]" /></button>
        </div>
        <datalist id="cams-zone-options">{camsZones.map((z) => <option key={z} value={z} />)}</datalist>

        {loading ? <div className="flex items-center gap-2 text-[#8b949e] text-[13px]"><Loader2 className="w-4 h-4 animate-spin" /> Connecting to CAMS…</div> : result ? (
          <div className="space-y-2">
            <p className="text-white text-[14px] font-extrabold">CAMS imported {result.total} device{result.total === 1 ? "" : "s"}</p>
            {(Object.keys(TYPE_LABEL) as CamsImportType[]).filter((t) => result.imported[t] !== undefined).map((t) => <p key={t} className="text-[#8b949e] text-[13px]">{TYPE_LABEL[t]}: {result.imported[t]}</p>)}
            {result.createdZones.length > 0 && <p className="text-[#8b949e] text-[12px]">New CAMS zones: {result.createdZones.join(", ")}</p>}
            {result.errors.map((e) => <p key={e.type} className="text-rose-400 text-[13px]">{TYPE_LABEL[e.type]}: {e.error}</p>)}
            <button onClick={onClose} className="w-full h-10 rounded-xl text-white text-[14px] font-extrabold cursor-pointer" style={{ background: "#3b82f6" }}>Done</button>
          </div>
        ) : (
          <>
            <label className="block text-[#8b949e] text-[11px] font-bold">CAMS client
              <select value={clientId ?? ""} onChange={(e) => setClientId(e.target.value ? Number(e.target.value) : null)} className="mt-1 w-full h-9 rounded-lg px-2 text-[13px] cursor-pointer" style={{ ...G.input, background: "#0d1117", color: "#e6edf3" }}>
                <option value="">Select a client…</option>
                {(clients || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>

            {clientId && (
              <>
                {sendable.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[#8b949e] text-[11px] font-bold">Zones — pick a CAMS zone, or type a new name to create it</p>
                    {sendable.map((z) => (
                      <div key={z.id} className="grid grid-cols-[1fr_1.3fr] gap-2 items-center">
                        <span className="text-white text-[13px] font-bold truncate">{z.name} <span className="text-[#8b949e] font-normal">· {z.devices.length}</span></span>
                        <div className="relative">
                          <input list="cams-zone-options" value={zoneByZoneId[z.id] ?? ""} onChange={(e) => setZoneByZoneId({ ...zoneByZoneId, [z.id]: e.target.value })} className="w-full h-8 rounded-lg px-2 text-[13px] text-white" style={G.input} />
                          {isNewZone(zoneByZoneId[z.id] ?? "") && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-extrabold text-amber-400">NEW</span>}
                        </div>
                      </div>
                    ))}
                    <button onClick={() => setShowDevices((v) => !v)} className="flex items-center gap-1 text-[12px] text-blue-400 font-bold cursor-pointer">{showDevices ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />} Change the zone for individual devices</button>
                    {showDevices && sendable.flatMap((z) => z.devices.map((d) => (
                      <div key={d.id} className="grid grid-cols-[1fr_1.3fr] gap-2 items-center pl-3">
                        <span className="text-[#c9d1d9] text-[12px] truncate">{d.name}</span>
                        <input list="cams-zone-options" value={zoneByDeviceId[d.id] ?? ""} placeholder={zoneByZoneId[z.id] || z.name} onChange={(e) => setZoneByDeviceId({ ...zoneByDeviceId, [d.id]: e.target.value })} className="w-full h-7 rounded-lg px-2 text-[12px] text-white" style={G.input} />
                      </div>
                    )))}
                  </div>
                )}

                <div className="rounded-xl p-3 space-y-1.5" style={G.subtle}>
                  <p className="text-white text-[13px] font-extrabold">Preview</p>
                  {preview.total === 0 ? <p className="text-[#8b949e] text-[12px]">Nothing to send.</p> : (Object.keys(TYPE_LABEL) as CamsImportType[]).filter((t) => preview.counts[t]).map((t) => <p key={t} className="text-[#c9d1d9] text-[12px]">{TYPE_LABEL[t]}: {preview.counts[t]}</p>)}
                  {preview.alreadySent > 0 && <p className="text-[#8b949e] text-[12px]">{preview.alreadySent} already sent — skipped</p>}
                  {preview.notComplete > 0 && <p className="text-[#8b949e] text-[12px]">{preview.notComplete} not complete yet — skipped</p>}
                  {preview.skipped.length > 0 && (
                    <div className="pt-1">
                      <p className="text-[#8b949e] text-[12px] font-bold">Skipped ({preview.skipped.length})</p>
                      {preview.skipped.map((s, i) => <p key={i} className="text-[#8b949e] text-[11px]">{s.name} — {s.reason}</p>)}
                    </div>
                  )}
                </div>

                <label className="flex items-start gap-2 text-[12px] text-[#c9d1d9] cursor-pointer">
                  <input type="checkbox" checked={resendAll} onChange={(e) => setResendAll(e.target.checked)} className="mt-0.5" />
                  <span>Resend all{resendAll && <span className="flex items-center gap-1 text-amber-400 mt-1"><AlertTriangle className="w-3 h-3 flex-shrink-0" /> CAMS adds a new row every time, so devices already sent will be duplicated there.</span>}</span>
                </label>
              </>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="flex-1 h-10 rounded-xl text-[#8b949e] text-[14px] font-bold cursor-pointer" style={G.btn}>Cancel</button>
              <button onClick={send} disabled={!clientId || preview.total === 0 || sending} className="flex-1 h-10 rounded-xl text-white text-[14px] font-extrabold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5" style={{ background: "#3b82f6" }}>
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />} Send {preview.total || ""}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
