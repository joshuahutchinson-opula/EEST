import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { clsx } from "clsx";

export function InlineEditCell({ value, onChange, onSave, type = "text", disabled, placeholder }: { value: string | number; onChange: (val: string) => void; onSave?: () => void; type?: "text" | "number"; disabled?: boolean; placeholder?: string; }) {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  useEffect(() => { if (!editing) setLocalValue(String(value)); }, [value, editing]);
  useEffect(() => { if (editing && inputRef.current) { inputRef.current.focus(); if (type === "number") inputRef.current.select(); } }, [editing, type]);
  const handleCommit = useCallback(() => { if (String(localValue) !== String(value)) { onChange(localValue); setSaveState("saving"); setTimeout(() => setSaveState("saved"), 600); setTimeout(() => setSaveState("idle"), 2000); onSave?.(); } setEditing(false); }, [localValue, value, onChange, onSave]);
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); handleCommit(); } else if (e.key === "Escape") { setLocalValue(String(value)); setEditing(false); } else if (e.key === "Tab") { e.preventDefault(); handleCommit(); } };
  return (
    <div className="relative group inline-flex items-center min-w-[40px]">
      {editing ? (<input ref={inputRef} type={type} value={localValue} onChange={e => setLocalValue(e.target.value)} onKeyDown={handleKeyDown} onBlur={handleCommit} disabled={disabled} placeholder={placeholder} className="bg-transparent text-white text-[13px] font-bold w-full focus:outline-none px-1 py-0.5 rounded" style={{ background: "rgba(59,130,246,0.10)", border: "1px solid rgba(59,130,246,0.25)", minWidth: "60px" }} />) : (<span onClick={() => !disabled && setEditing(true)} className={clsx("px-1 py-0.5 rounded transition-colors hover:bg-white/[0.04]", disabled ? "cursor-default hover:bg-transparent" : "cursor-pointer")} tabIndex={disabled ? -1 : 0}>{String(value) || placeholder || "—"}</span>)}
      {saveState === "saving" && <Loader2 className="w-2.5 h-2.5 animate-spin text-[#484f58] ml-1 flex-shrink-0" />}
      {saveState === "saved" && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 ml-1 flex-shrink-0" />}
    </div>
  );
}
