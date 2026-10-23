import { useEffect, useState } from "react";
import { Box, Cable, Camera, FileText, Fingerprint, Loader2, MessageSquare, Package, Server } from "lucide-react";
import { API } from "../../api";
import { ASSET_CATEGORY_LABELS } from "../../lib/constants";
import type { AssetCategory, IconType, ProjectAsset } from "../../types";

export const ASSET_CATEGORY_ICONS: Record<AssetCategory, IconType> = {
  camera: Camera,
  "access-control": Fingerprint,
  "network-hardware": Server,
  "cable-wire": Cable,
  intercom: MessageSquare,
  software: FileText,
  other: Box,
};

export function ProjectAssetSummary({ projectId }: { projectId: string }) {
  const [assets, setAssets] = useState<ProjectAsset[] | null>(null);

  useEffect(() => {
    let alive = true;
    API.projectAssets.list(projectId).then((data) => { if (alive) setAssets(data); }).catch(() => { if (alive) setAssets([]); });
    return () => { alive = false; };
  }, [projectId]);

  if (assets === null) return <div className="w-full h-full flex items-center justify-center"><Loader2 className="w-4 h-4 text-[#484f58] animate-spin" /></div>;

  const groups = (Object.keys(ASSET_CATEGORY_LABELS) as AssetCategory[])
    .map((cat) => {
      const items = assets.filter((a) => a.category === cat);
      if (items.length === 0) return null;
      if (cat === "cable-wire") return { cat, count: items.reduce((s, a) => s + (a.cableSpec?.lengthFt || 0) * a.quantity, 0), suffix: "ft" };
      return { cat, count: items.reduce((s, a) => s + a.quantity, 0), suffix: "" };
    })
    .filter((g): g is { cat: AssetCategory; count: number; suffix: string } => g !== null);

  if (groups.length === 0) return <div className="w-full h-full flex flex-col items-center justify-center rounded-lg border border-dashed" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.09)" }}><Package className="w-5 h-5 text-[#484f58] mb-1.5" /><p className="text-[#8b949e] text-[12px] font-bold">No assets yet</p></div>;

  return (
    <div className="w-full h-full flex items-center justify-center px-3">
      <div className="grid grid-cols-3 gap-1.5 w-full">
        {groups.slice(0, 6).map((g) => {
          const Icon = ASSET_CATEGORY_ICONS[g.cat];
          return (
            <div key={g.cat} title={ASSET_CATEGORY_LABELS[g.cat]} className="flex items-center gap-1.5 rounded-lg px-2 py-1.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <Icon className="w-3.5 h-3.5 text-[#8b949e] flex-shrink-0" />
              <span className="text-white text-[12px] font-bold">{g.count}{g.suffix}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
