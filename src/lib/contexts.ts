import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { API } from "../api";
import type { CurrencyCtx, QuoteCtx, Role, SessionUserInfo, TutorialCtxValue, TutorialRequest, TutorialStep } from "../types";

export const CurrencyContext = createContext<CurrencyCtx>({
  currency: "USD",
  setCurrency: () => {},
  fmt: (n) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
});

export const useCurrency = () => useContext(CurrencyContext);

export const RoleContext = createContext<Role>("admin");

export const useRole = () => useContext(RoleContext);

export const isTechRole = (role: Role) => role === "tech";

export const SessionUserContext = createContext<SessionUserInfo>({ name: "", email: "" });

export const useSessionUser = () => useContext(SessionUserContext);

export const QuoteContext = createContext<QuoteCtx>({ currentQuote: null, setCurrentQuote: () => {}, addToQuote: () => {} });

export const useQuote = () => useContext(QuoteContext);

export const APP_INTRO_STEPS: TutorialStep[] = [
  { target: "nav-pipeline", title: "Pipeline", description: "Track every sales lead and support project through its stages — Lead to Won on the sales side, Planning to Complete on the project side." },
  { target: "nav-projects", title: "Projects", description: "Browse every active project here. Click into one to see its assets, workbook, tasks, and install progress in one place." },
  { target: "nav-workbook", title: "Workbook", description: "Build out Asset List, Cost & Margin, BOM, and Synthesis for a project's quote — everything rolls up automatically as you go." },
  { target: "nav-install-tracker", title: "Installation", description: "Track device-by-device installation progress across every project currently in the Installation stage." },
  { target: "nav-device-library", title: "Device Library", description: "Your catalog of cameras, access control, and network hardware — the building blocks you pull into a project's Assets." },
  { target: "tour-notifications", title: "Notifications", description: "Stay on top of task assignments, sales wins, and updates across every project from here." },
  { target: "tour-user-menu", title: "Your Account", description: "Sign out from here. Every other page and tab has its own quick walkthrough too, the first time you land on it." },
];

export const TutorialContext = createContext<TutorialCtxValue>({
  seen: new Set(),
  seenLoaded: false,
  current: null,
  enqueue: () => {},
  dequeue: () => {},
  complete: () => {},
  replay: () => {},
});

export const useTutorials = () => useContext(TutorialContext);

// Central queue so at most one walkthrough overlay is ever mounted, even if a user rapidly
// navigates across several never-seen surfaces before any one of them finishes. Auto-triggered
// surfaces register themselves via useAutoTutorial; "Replay" from the Help menu takes priority
// over anything auto-queued since it's an explicit user action.
export function useTutorialState() {
  const [seen, setSeen] = useState<Set<string>>(new Set());
  // Gates auto-enqueue until the real seen-list has loaded, so an already-completed tutorial
  // doesn't flash open (then get yanked away) for a returning user before the fetch resolves.
  const [seenLoaded, setSeenLoaded] = useState(false);
  const [autoQueue, setAutoQueue] = useState<TutorialRequest[]>([]);
  const [forced, setForced] = useState<TutorialRequest | null>(null);

  useEffect(() => { API.tutorials.list().then((keys) => setSeen(new Set(keys))).catch(() => {}).finally(() => setSeenLoaded(true)); }, []);

  const enqueue = useCallback((req: TutorialRequest) => {
    setAutoQueue((prev) => (prev.some((r) => r.key === req.key) ? prev : [...prev, req]));
  }, []);
  const dequeue = useCallback((key: string) => {
    setAutoQueue((prev) => prev.filter((r) => r.key !== key));
  }, []);
  const current = forced ?? autoQueue[0] ?? null;
  // complete() must only ever clear whichever tutorial is actually on screen (forced takes
  // priority over the queue) — a ref keeps the latest value reachable from the stable callback
  // below without re-creating it every render.
  const currentRef = useRef<TutorialRequest | null>(current);
  useEffect(() => { currentRef.current = current; });
  const complete = useCallback(() => {
    const cur = currentRef.current;
    if (!cur) return;
    API.tutorials.markSeen(cur.key).catch(() => {});
    setSeen((prev) => new Set(prev).add(cur.key));
    setForced((prev) => (prev && prev.key === cur.key ? null : prev));
    setAutoQueue((prev) => (prev[0]?.key === cur.key ? prev.slice(1) : prev));
  }, []);
  const replay = useCallback((req: TutorialRequest) => setForced(req), []);

  return useMemo(() => ({ seen, seenLoaded, current, enqueue, dequeue, complete, replay }), [seen, seenLoaded, current, enqueue, dequeue, complete, replay]);
}

// Auto-triggers a surface's walkthrough the first time it's reached. `active` gates surfaces
// that don't unmount on their own (a tab within a page, a modal within a tab) — pass whether
// this specific surface is actually the one currently visible. Waits for the real seen-list to
// load first so an already-completed tutorial doesn't flash open before getting yanked away.
export function useAutoTutorial(key: string, steps: TutorialStep[], active: boolean = true) {
  const { seen, seenLoaded, enqueue, dequeue } = useTutorials();
  const isSeen = seen.has(key);
  useEffect(() => {
    if (!active || !seenLoaded || isSeen) return;
    enqueue({ key, steps });
    return () => dequeue(key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, active, seenLoaded, isSeen]);
}
