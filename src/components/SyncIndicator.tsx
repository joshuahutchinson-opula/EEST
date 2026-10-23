import { useEffect, useState } from "react";
import { CloudOff, Loader2, RefreshCw } from "lucide-react";
import { flushQueue, subscribeSyncStatus, type SyncStatus } from "../lib/offlineQueue";

// Shows when the browser is offline or offline changes are waiting to sync; hidden otherwise.
export function SyncIndicator() {
  const [s, setS] = useState<SyncStatus>({ online: true, pending: 0, syncing: false });
  useEffect(() => subscribeSyncStatus(setS), []);
  if (s.online && s.pending === 0) return null;
  const label = !s.online ? (s.pending ? `Offline · ${s.pending} pending` : "Offline") : s.syncing ? `Syncing ${s.pending}…` : `${s.pending} pending sync`;
  return (
    <button onClick={() => flushQueue()} disabled={!s.online || s.syncing} title={s.online ? "Sync offline changes now" : "Changes are saved on this device and will sync when you're back online"} className="flex items-center gap-1.5 h-8 px-2.5 rounded-xl text-[12px] font-extrabold cursor-pointer disabled:cursor-default" style={{ background: s.online ? "rgba(59,130,246,0.15)" : "rgba(245,158,11,0.15)", border: `1px solid ${s.online ? "rgba(59,130,246,0.35)" : "rgba(245,158,11,0.35)"}`, color: s.online ? "#93c5fd" : "#fbbf24" }}>
      {!s.online ? <CloudOff className="w-3.5 h-3.5" /> : s.syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
      {label}
    </button>
  );
}
