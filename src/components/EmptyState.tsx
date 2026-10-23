import type { IconType } from "../types";

export function EmptyState({ icon: Icon, title, description, action }: { icon: IconType; title: string; description: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "rgba(59,130,246,0.10)", border: "1px solid rgba(59,130,246,0.18)" }}><Icon className="w-8 h-8 text-blue-400" /></div>
      <h3 className="text-white text-[17px] font-extrabold mb-1.5">{title}</h3><p className="text-[#8b949e] text-[15px] max-w-sm mb-5">{description}</p>
      {action && <button onClick={action.onClick} className="h-9 px-5 rounded-xl text-white text-[15px] font-extrabold cursor-pointer min-h-[44px]" style={{ background: "#3b82f6", boxShadow: "0 4px 16px rgba(59,130,246,0.35)" }}>{action.label}</button>}
    </div>
  );
}
