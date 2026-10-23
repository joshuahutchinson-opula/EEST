import { useEffect, useMemo, useState } from "react";
import { toast, Toaster } from "sonner";
import { AnimatePresence, motion } from "motion/react";
import { BarChart3, FileText, Layers, Loader2, Sparkles, Zap } from "lucide-react";
import { API, getSessionEmail, setUnauthorizedHandler, ApiError, UnauthorizedError } from "./api";
import { AppTopbar } from "./components/AppTopbar";
import { SpotlightTour } from "./components/SpotlightTour";
import { DEFAULT_EXCHANGE_RATE, G } from "./lib/constants";
import { APP_INTRO_STEPS, CurrencyContext, QuoteContext, RoleContext, SessionUserContext, TutorialContext, isTechRole, useTutorialState } from "./lib/contexts";
import { makeFmt } from "./lib/utils";
import { LoginPage } from "./pages/auth/LoginPage";
import { CalendarPage } from "./pages/calendar/CalendarPage";
import { OpsDashboard } from "./pages/dashboard/OpsDashboard";
import { TechDashboard } from "./pages/dashboard/TechDashboard";
import { DeviceLibrary } from "./pages/device-library/DeviceLibrary";
import { InstallTracker } from "./pages/install/InstallTracker";
import { Dashboard } from "./pages/pipeline/Dashboard";
import { ProjectDetail } from "./pages/project-detail/ProjectDetail";
import { ProjectsPage } from "./pages/projects/ProjectsPage";
import { ClientStatusPage } from "./pages/public/ClientStatusPage";
import { SubcontractorPortal } from "./pages/public/SubcontractorPortal";
import { Workbook } from "./pages/workbook/Workbook";
import type { CatalogDevice, CurrencyCtx, Page, Quote, QuoteCtx, QuoteLineItem, Role, SessionUserInfo } from "./types";

export default function App() {
  const portalMatch = window.location.pathname.match(/^\/portal\/subcontractor\/([^/]+)/);
  if (portalMatch) return <SubcontractorPortal token={portalMatch[1]} />;
  const projectPortalMatch = window.location.pathname.match(/^\/portal\/project\/([^/]+)/);
  if (projectPortalMatch) return <ClientStatusPage token={projectPortalMatch[1]} />;

  // Completes the Microsoft OAuth redirect: the server hands the session token back
  // in the URL fragment (never sent to a server on the next request) rather than a
  // query param, so pick it up here before AuthenticatedApp's initial state reads localStorage.
  if (window.location.hash.startsWith("#auth_token=")) {
    const token = decodeURIComponent(window.location.hash.slice("#auth_token=".length));
    localStorage.setItem("auth_token", token);
    localStorage.setItem("app_logged_in", "true");
    // A fresh login always lands on the Dashboard, regardless of whatever page was open
    // last session — in-session navigation is unaffected since that's persisted separately,
    // after this point, by AuthenticatedApp's own page-change effect.
    localStorage.setItem("app_page", "ops-dashboard");
    window.history.replaceState({}, "", window.location.pathname + window.location.search);
  }

  return <AuthenticatedApp />;
}

export function AuthenticatedApp() {
  const [page, setPage] = useState<Page>(() => {
    const saved = localStorage.getItem("app_page");
    const loggedIn = localStorage.getItem("auth_token") || localStorage.getItem("app_logged_in");
    return loggedIn ? ((saved as Page) || "ops-dashboard") : "login";
  });
  // A token in localStorage only means a previous session logged in — it may since have expired
  // or been revoked server-side. Render nothing but a boot spinner until API.auth.me() confirms
  // it's still valid, so authenticated-only children (NotificationBell's polling, etc.) never
  // mount against a dead token.
  const [authChecking, setAuthChecking] = useState(() => !!(localStorage.getItem("auth_token") || localStorage.getItem("app_logged_in")));
  const [currency, setCurrency] = useState<"USD" | "JMD">("USD");
  const [currentQuote, setCurrentQuote] = useState<Quote | null>(null);
  const onboardingKey = useMemo(() => `onboarding_complete:${getSessionEmail() || "local"}`, []);
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem(onboardingKey));
  const [role, setRole] = useState<Role>("admin");
  const [sessionUser, setSessionUser] = useState<SessionUserInfo>({ name: "", email: "" });
  const tutorialState = useTutorialState();

  useEffect(() => {
    setUnauthorizedHandler(() => {
      localStorage.removeItem("app_page");
      setPage("login");
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    if (!authChecking) return;
    let cancelled = false;
    API.auth.me()
      .then((u) => {
        if (cancelled) return;
        setRole(u.role); setSessionUser({ name: u.name, email: u.email }); setAuthChecking(false);
        try { localStorage.setItem("session_identity", JSON.stringify({ role: u.role, name: u.name, email: u.email })); } catch { /* storage unavailable */ }
      })
      .catch((err) => {
        if (cancelled) return;
        // Offline (e.g. a tech in the field): keep the session with the last known identity so
        // offline-capable screens still work. Only an actual 401 ends the session.
        if (!(err instanceof UnauthorizedError) && !(err instanceof ApiError && err.status === 401)) {
          try {
            const id = JSON.parse(localStorage.getItem("session_identity") || "null");
            if (id) { setRole(id.role); setSessionUser({ name: id.name, email: id.email }); setAuthChecking(false); return; }
          } catch { /* fall through to sign-out */ }
        }
        localStorage.removeItem("auth_token");
        localStorage.removeItem("app_logged_in");
        localStorage.removeItem("app_page");
        setPage("login");
        setAuthChecking(false);
      });
    return () => { cancelled = true; };
  }, [authChecking]);

  useEffect(() => { if (page !== "login") localStorage.setItem("app_page", page); }, [page]);
  useEffect(() => { API.fx.getRate(); const interval = setInterval(() => API.fx.getRate(), 24 * 60 * 60 * 1000); return () => clearInterval(interval); }, []);
  useEffect(() => { if (page !== "login" && !authChecking) API.auth.me().then((u) => { setRole(u.role); setSessionUser({ name: u.name, email: u.email }); }).catch(() => {}); }, [page, authChecking]);
  useEffect(() => { if (isTechRole(role) && (page === "workbook" || page === "calendar")) setPage("ops-dashboard"); }, [role, page]);

  const currencyCtx: CurrencyCtx = useMemo(() => ({ currency, setCurrency, fmt: makeFmt(currency) }), [currency]);

  const addToQuote = (device: CatalogDevice) => {
    const price = device.price;
    if (!price || !currentQuote) return;
    setCurrentQuote((prev) => {
      if (!prev) return prev;
      const firstCat = prev.categories[0];
      if (!firstCat) return prev;
      const sellPrice = price * 1.35;
      const newItem: QuoteLineItem = {
        id: crypto.randomUUID?.() || `li${Date.now()}`,
        itemNumber: String(firstCat.lineItems.length + 1).padStart(2, "0"),
        description: `${device.manufacturer} ${device.model}`,
        unitCost: price,
        quantity: 1,
        markupPercent: 0.35,
        sellPrice,
        costTotal: price,
        sellTotal: sellPrice,
        profit: sellPrice - price,
        jmdConversion: sellPrice * (parseFloat(localStorage.getItem("fx_rate") || String(DEFAULT_EXCHANGE_RATE))),
      };
      return { ...prev, categories: prev.categories.map((c, i) => i === 0 ? { ...c, lineItems: [...c.lineItems, newItem] } : c) };
    });
    toast.success(`${device.model} added to quote`);
  };

  const quoteCtx: QuoteCtx = { currentQuote, setCurrentQuote, addToQuote };

  if (authChecking) return (
    <CurrencyContext.Provider value={currencyCtx}>
      <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-6 h-6 text-blue-400 animate-spin" /></div>
    </CurrencyContext.Provider>
  );

  if (page === "login") return (<CurrencyContext.Provider value={currencyCtx}><LoginPage /></CurrencyContext.Provider>);

  const breadcrumb = page === "project-detail" ? { label: "Projects", parent: "projects" as Page } : undefined;

  return (
    <RoleContext.Provider value={role}>
    <SessionUserContext.Provider value={sessionUser}>
    <CurrencyContext.Provider value={currencyCtx}>
      <QuoteContext.Provider value={quoteCtx}>
      <TutorialContext.Provider value={tutorialState}>
        <div className="min-h-screen bg-background">
          <Toaster position="bottom-right" theme="dark" toastOptions={{ style: { background: "rgba(7,12,26,0.95)", border: "1px solid rgba(255,255,255,0.12)", color: "#e6edf3", backdropFilter: "blur(20px)" } }} />
          <AppTopbar page={page} navigate={setPage} breadcrumb={breadcrumb} />
          <div className="pt-14">
            <AnimatePresence mode="wait">
              <motion.div key={page} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: "easeOut" }}>
                {page === "ops-dashboard" && (isTechRole(role) ? <TechDashboard navigate={setPage} /> : <OpsDashboard navigate={setPage} />)}
                {page === "pipeline" && <Dashboard navigate={setPage} />}
                {page === "projects" && <ProjectsPage navigate={setPage} />}
                {page === "project-detail" && <ProjectDetail navigate={setPage} />}
                {page === "workbook" && !isTechRole(role) && <Workbook navigate={setPage} />}
                {page === "calendar" && !isTechRole(role) && <CalendarPage />}
                {page === "install-tracker" && <InstallTracker navigate={setPage} />}
                {page === "device-library" && <DeviceLibrary navigate={setPage} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
        {showOnboarding && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4" onClick={() => { setShowOnboarding(false); localStorage.setItem(onboardingKey, "true"); }}>
            <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)" }} />
            <motion.div initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.93 }} transition={{ type: "spring", damping: 26, stiffness: 360 }} onClick={(e) => e.stopPropagation()} className="relative z-10 w-full max-w-[500px] rounded-3xl p-8 text-center" style={G.liquidGlass}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.25)" }}><Zap className="w-8 h-8 text-blue-400" /></div>
              <h2 className="text-white text-[1.4rem] font-extrabold mb-2">Welcome to E-Tech Operations Center</h2>
              <p className="text-[#8b949e] text-[14px] mb-6">Your full-lifecycle security project platform. Take a 30-second guided tour to see where everything lives.</p>
              <div className="space-y-3 mb-6 text-left">
                {[
                  { icon: BarChart3, label: "Pipeline", desc: "Track sales leads and manage projects through every stage", color: "#3b82f6" },
                  { icon: Layers, label: "Projects", desc: "Manage every project's assets, workbook, and install tracker in one place", color: "#8b5cf6" },
                  { icon: FileText, label: "Workbook", desc: "Auto-generate BOMs, cost summaries, and proposals", color: "#10b981" },
                ].map(item => (
                  <div key={item.label} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${item.color}20` }}><item.icon className="w-4 h-4" style={{ color: item.color }} /></div>
                    <div><p className="text-white text-[14px] font-bold">{item.label}</p><p className="text-[#8b949e] text-[12px]">{item.desc}</p></div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setShowOnboarding(false); localStorage.setItem(onboardingKey, "true"); }} className="h-11 px-4 rounded-xl text-[#8b949e] hover:text-white text-[14px] font-bold cursor-pointer" style={G.btn}>Skip</button>
                <button onClick={() => { setShowOnboarding(false); localStorage.setItem(onboardingKey, "true"); tutorialState.replay({ key: "app-intro", steps: APP_INTRO_STEPS }); }} className="flex-1 h-11 rounded-xl text-white text-[15px] font-extrabold cursor-pointer flex items-center justify-center gap-2" style={{ background: "#3b82f6", boxShadow: "0 4px 20px rgba(59,130,246,0.4)" }}><Sparkles className="w-4 h-4" /> Start Tour</button>
              </div>
            </motion.div>
          </div>
        )}
        {tutorialState.current && <SpotlightTour steps={tutorialState.current.steps} onFinish={tutorialState.complete} />}
      </TutorialContext.Provider>
      </QuoteContext.Provider>
    </CurrencyContext.Provider>
    </SessionUserContext.Provider>
    </RoleContext.Provider>
  );
}
