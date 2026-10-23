import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Loader2, X } from "lucide-react";
import { G } from "../../lib/constants";

// Client sign-off: typed full name plus a signature drawn with mouse, pen or finger.
export function ApprovalDialog({ title, summary, onSubmit, onClose }: { title: string; summary: string; onSubmit: (signerName: string, signature: string) => Promise<void>; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);
  const [name, setName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0b1a33";
  }, []);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const { x, y } = point(e);
    const ctx = e.currentTarget.getContext("2d")!;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const { x, y } = point(e);
    const ctx = e.currentTarget.getContext("2d")!;
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasInk(true);
  };
  const clear = () => {
    const c = canvasRef.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setHasInk(false);
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try { await onSubmit(name.trim(), canvasRef.current!.toDataURL("image/png")); }
    catch (err) { setError(err instanceof Error && err.message ? err.message : "Couldn't record the approval. Please try again."); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} onClick={(e) => e.stopPropagation()} className="relative z-10 w-full max-w-[480px] rounded-2xl p-6 space-y-4" style={G.liquidGlass}>
        <div className="flex items-start justify-between gap-3">
          <div><h3 className="text-white text-[17px] font-extrabold">{title}</h3><p className="text-[#8b949e] text-[13px] mt-0.5">{summary}</p></div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/[0.08] cursor-pointer flex-shrink-0"><X className="w-4 h-4 text-[#8b949e]" /></button>
        </div>
        <label className="block text-[#8b949e] text-[12px] font-bold">Full name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" className="mt-1 w-full h-10 rounded-lg px-3 text-[14px] text-white" style={G.input} />
        </label>
        <div>
          <div className="flex items-center justify-between mb-1"><span className="text-[#8b949e] text-[12px] font-bold">Signature</span><button onClick={clear} className="text-[12px] text-blue-400 cursor-pointer">Clear</button></div>
          <canvas ref={canvasRef} onPointerDown={start} onPointerMove={move} onPointerUp={() => { drawing.current = false; }} onPointerLeave={() => { drawing.current = false; }} className="w-full h-[150px] rounded-xl touch-none cursor-crosshair" style={{ background: "#f8fafc" }} />
        </div>
        <label className="flex items-start gap-2 text-[#c9d1d9] text-[13px]"><input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5" /> I approve this on behalf of my organisation, and agree my typed name and signature are my electronic signature.</label>
        {error && <p className="text-rose-400 text-[13px]">{error}</p>}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl text-[#8b949e] text-[14px] font-bold cursor-pointer" style={G.btn}>Cancel</button>
          <button onClick={submit} disabled={!name.trim() || !hasInk || !agreed || submitting} className="flex-1 h-10 rounded-xl text-white text-[14px] font-extrabold cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: "#10b981" }}>{submitting && <Loader2 className="w-4 h-4 animate-spin" />}Approve</button>
        </div>
      </motion.div>
    </div>
  );
}
