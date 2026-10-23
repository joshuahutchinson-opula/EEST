import { toast } from "sonner";
import { ApiError, UnauthorizedError, apiFetch } from "../api";

// Offline support for field work: install-tracker status and photos, and commissioning status,
// notes and photos. A change made without a connection is stored in IndexedDB and replayed in
// order once the browser is back online. The rest of the app stays online-only.

export type OfflineOp =
  | { kind: "request"; label: string; path: string; method: "PATCH" | "POST"; body: unknown }
  // Upload a photo to the project's documents, then PATCH { addPhoto: <url> } onto `path`.
  | { kind: "photo"; label: string; projectId: string; file: Blob; fileName: string; path: string };

interface StoredOp { id?: number; op: OfflineOp; createdAt: number }

const DB_NAME = "eest-offline";
const STORE = "queue";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => { db.close(); resolve(req.result); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

const allOps = () => withStore<StoredOp[]>("readonly", (s) => s.getAll() as IDBRequest<StoredOp[]>);
const addOp = (op: OfflineOp) => withStore("readwrite", (s) => s.add({ op, createdAt: Date.now() } satisfies StoredOp));
const removeOp = (id: number) => withStore("readwrite", (s) => s.delete(id));

// --- status for the pending-sync indicator ----------------------------------------------------

export interface SyncStatus { online: boolean; pending: number; syncing: boolean }
let status: SyncStatus = { online: typeof navigator === "undefined" ? true : navigator.onLine, pending: 0, syncing: false };
const listeners = new Set<(s: SyncStatus) => void>();
function setStatus(patch: Partial<SyncStatus>) {
  status = { ...status, ...patch };
  listeners.forEach((fn) => fn(status));
}
export function subscribeSyncStatus(fn: (s: SyncStatus) => void): () => void {
  listeners.add(fn);
  fn(status);
  return () => { listeners.delete(fn); };
}
async function refreshPending() {
  try { setStatus({ pending: (await allOps()).length }); } catch { /* IndexedDB unavailable */ }
}

// --- sending ----------------------------------------------------------------------------------

const isNetworkError = (err: unknown) => err instanceof TypeError || (typeof navigator !== "undefined" && !navigator.onLine);

async function run(op: OfflineOp): Promise<string | void> {
  if (op.kind === "request") {
    await apiFetch(op.path, { method: op.method, body: JSON.stringify(op.body) });
    return;
  }
  const fd = new FormData();
  fd.append("file", op.file, op.fileName);
  const uploaded = await apiFetch<{ fileUrl: string }>(`/documents/${op.projectId}`, { method: "POST", body: fd });
  await apiFetch(op.path, { method: "PATCH", body: JSON.stringify({ addPhoto: uploaded.fileUrl }) });
  return uploaded.fileUrl;
}

// Sends now if possible; otherwise (offline, or the network fails) stores it for later.
// Server errors are thrown as usual so the caller can report them.
export async function submit(op: OfflineOp): Promise<{ queued: boolean; fileUrl?: string }> {
  if (status.online) {
    try {
      const fileUrl = await run(op);
      return { queued: false, fileUrl: fileUrl || undefined };
    } catch (err) {
      if (!isNetworkError(err)) throw err;
    }
  }
  await addOp(op);
  setStatus({ online: navigator.onLine });
  await refreshPending();
  toast.message("Saved offline — it will sync when you're back online", { id: "offline-saved" });
  return { queued: true };
}

// Replays queued changes in the order they were made. Stops at the first network failure (or
// expired session) and tries again later; a change the server rejects is dropped and reported.
let flushing = false;
export async function flushQueue(): Promise<void> {
  if (flushing || !navigator.onLine) return;
  flushing = true;
  setStatus({ syncing: true });
  let synced = 0;
  try {
    const ops = (await allOps()).sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
    for (const stored of ops) {
      try {
        await run(stored.op);
        synced++;
      } catch (err) {
        if (isNetworkError(err) || err instanceof UnauthorizedError || (err instanceof ApiError && err.status === 401)) break;
        toast.error(`Couldn't sync an offline change (${stored.op.label}) — it was rejected by the server`);
      }
      await removeOp(stored.id!);
      await refreshPending();
    }
  } catch { /* IndexedDB unavailable */ }
  finally {
    flushing = false;
    setStatus({ syncing: false });
    await refreshPending();
    if (synced > 0) toast.success(`Synced ${synced} offline change${synced === 1 ? "" : "s"}`);
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => { setStatus({ online: true }); flushQueue(); });
  window.addEventListener("offline", () => setStatus({ online: false }));
  setInterval(() => { flushQueue(); }, 60_000);
  refreshPending().then(() => flushQueue());
}

// --- last-loaded data, so field screens still show something after an offline reload ---------

export function cacheData(key: string, data: unknown) {
  try { localStorage.setItem(`offline_cache:${key}`, JSON.stringify(data)); } catch { /* storage full or unavailable */ }
}
export function readCachedData<T>(key: string): T | null {
  try { const raw = localStorage.getItem(`offline_cache:${key}`); return raw ? (JSON.parse(raw) as T) : null; } catch { return null; }
}
export { isNetworkError };
