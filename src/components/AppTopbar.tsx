import { ArrowLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import logoImg from "../assets/2026-06-14_21.13.34_e-techsystemsja.com_2f51395e09e8-removebg-preview (1).png";
import { CurrencyToggle } from "./CurrencyToggle";
import { NotificationBell } from "./NotificationBell";
import { UserMenu } from "./UserMenu";
import { isTechRole, useRole } from "../lib/contexts";
import type { Page } from "../types";

export const NAV_ITEMS: { id: Page; label: string }[] = [
  { id: "ops-dashboard", label: "Dashboard" },
  { id: "pipeline", label: "Pipeline" },
  { id: "projects", label: "Projects" },
  { id: "workbook", label: "Workbook" },
  { id: "install-tracker", label: "Installation" },
  { id: "device-library", label: "Device Library" },
  { id: "calendar", label: "Calendar" },
];

export function AppTopbar({ page, navigate, breadcrumb }: { page: Page; navigate: (p: Page) => void; breadcrumb?: { label: string; parent: Page } }) {
  const role = useRole();
  const navItems = isTechRole(role) ? NAV_ITEMS.filter((n) => n.id !== "workbook" && n.id !== "calendar") : NAV_ITEMS;
  const activeTab = navItems.find((n) => n.id === page)?.id ?? null;
  return (
    <header className="fixed top-0 inset-x-0 z-50 h-14 flex items-center gap-3 md:gap-5 px-3 md:px-5" style={{ background: "rgba(7,12,26,0.65)", backdropFilter: "blur(40px) saturate(180%)", borderBottom: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 1px 0 rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.5)" }}>
      <button onClick={() => navigate("ops-dashboard")} className="flex items-center gap-2.5 flex-shrink-0 cursor-pointer min-h-[44px]">
        <img src={logoImg} alt="E-Tech Systems" className="h-8 md:h-10 object-contain" style={{ filter: "brightness(1.1)", marginTop: "-2px", marginBottom: "-2px" }} />
      </button>
      <div className="w-px h-4 flex-shrink-0 hidden md:block" style={{ background: "rgba(255,255,255,0.12)" }} />
      {breadcrumb ? (
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(breadcrumb.parent)} className="flex items-center gap-1.5 text-[#8b949e] hover:text-white text-[14px] font-bold transition-colors cursor-pointer"><ArrowLeft className="w-3.5 h-3.5" />{breadcrumb.label}</button>
          <ChevronRight className="w-3.5 h-3.5 text-[#484f58]" />
          <span className="text-white text-[14px] font-bold">Project Detail</span>
        </div>
      ) : (
        <nav className="flex items-center gap-0.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {navItems.map((item) => (
            <button key={item.id} data-tour={`nav-${item.id}`} onClick={() => navigate(item.id)} className={clsx("h-8 px-2.5 md:px-3.5 rounded-xl text-[13px] md:text-[15px] font-bold transition-all duration-150 whitespace-nowrap cursor-pointer", activeTab === item.id ? "text-white" : "text-[#8b949e] hover:text-white")} style={activeTab === item.id ? { background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.13)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)" } : undefined}>{item.label}</button>
          ))}
        </nav>
      )}
      <div className="flex-1" />
      <div className="flex items-center gap-1 md:gap-1.5">
        <div className="hidden md:block"><CurrencyToggle /></div>
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}
