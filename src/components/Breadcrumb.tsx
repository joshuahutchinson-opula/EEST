import { ChevronRight } from "lucide-react";
import type { Page } from "../types";

export function Breadcrumb({ page, projectName }: { page: Page; projectName?: string }) {
  const crumbs: { label: string; page?: Page }[] = [];
  if (page === "ops-dashboard") crumbs.push({ label: "Dashboard", page: "ops-dashboard" });
  else if (page === "pipeline") crumbs.push({ label: "Pipeline", page: "pipeline" });
  else if (page === "projects") crumbs.push({ label: "Projects", page: "projects" });
  else if (page === "workbook") crumbs.push({ label: "Workbook", page: "workbook" });
  else if (page === "install-tracker") crumbs.push({ label: "Installation", page: "install-tracker" });
  else if (page === "device-library") crumbs.push({ label: "Device Library", page: "device-library" });
  else if (page === "project-detail") crumbs.push({ label: "Projects", page: "projects" }, { label: projectName || "Project Detail" });
  return (
    <div className="flex items-center gap-1.5 text-[13px]">
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="w-3 h-3 text-[#484f58]" />}
          {crumb.page ? <button className="text-[#8b949e] hover:text-white font-bold transition-colors cursor-pointer">{crumb.label}</button> : <span className="text-white font-bold">{crumb.label}</span>}
        </span>
      ))}
    </div>
  );
}
