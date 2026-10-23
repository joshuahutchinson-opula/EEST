import { Pencil } from "lucide-react";

export function OverrideIndicator({ isOverridden, onReset }: { isOverridden: boolean; onReset?: () => void }) { if (!isOverridden) return null; return (<button onClick={e => { e.stopPropagation(); onReset?.(); }} className="w-5 h-5 rounded-full flex items-center justify-center cursor-pointer ml-1 flex-shrink-0" style={{ background: "rgba(245,158,11,0.20)", border: "1px solid rgba(245,158,11,0.40)" }} title="Manually overridden — click to reset"><Pencil className="w-2.5 h-2.5 text-amber-400" /></button>); }
