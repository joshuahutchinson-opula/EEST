import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { G } from "../lib/constants";
import type { TutorialStep } from "../types";

export function SpotlightTour({ steps, onFinish }: { steps: TutorialStep[]; onFinish: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  useEffect(() => { setStepIndex(0); }, [steps]);
  const step = steps[stepIndex];

  useEffect(() => {
    let raf = 0;
    let attempts = 0;
    const locate = () => {
      const el = document.querySelector(`[data-tour="${step.target}"]`);
      if (el) { setRect(el.getBoundingClientRect()); return; }
      if (attempts++ < 30) raf = requestAnimationFrame(locate);
    };
    setRect(null);
    locate();
    const onResize = () => { const el = document.querySelector(`[data-tour="${step.target}"]`); if (el) setRect(el.getBoundingClientRect()); };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); window.removeEventListener("scroll", onResize, true); };
  }, [stepIndex, step.target]);

  const isLast = stepIndex === steps.length - 1;
  const goNext = () => { if (isLast) onFinish(); else setStepIndex((i) => i + 1); };
  const goBack = () => setStepIndex((i) => Math.max(0, i - 1));

  const pad = 8;
  const spotlight = rect ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 } : null;
  const tooltipTop = spotlight ? Math.min(spotlight.top + spotlight.height + 14, window.innerHeight - 220) : window.innerHeight / 2 - 90;
  const tooltipLeft = spotlight ? Math.min(Math.max(spotlight.left, 16), window.innerWidth - 336) : window.innerWidth / 2 - 160;

  return (
    <div className="fixed inset-0 z-[600]">
      <AnimatePresence>
        {spotlight && (
          <motion.div key="scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="absolute inset-0" style={{ background: "rgba(2,4,10,0.78)", clipPath: `polygon(0 0, 0 100%, ${spotlight.left}px 100%, ${spotlight.left}px ${spotlight.top}px, ${spotlight.left + spotlight.width}px ${spotlight.top}px, ${spotlight.left + spotlight.width}px ${spotlight.top + spotlight.height}px, ${spotlight.left}px ${spotlight.top + spotlight.height}px, ${spotlight.left}px 100%, 100% 100%, 100% 0)` }} />
        )}
      </AnimatePresence>
      {spotlight && (
        <motion.div key={`ring-${stepIndex}`} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", damping: 22, stiffness: 300 }} className="absolute rounded-2xl pointer-events-none" style={{ top: spotlight.top, left: spotlight.left, width: spotlight.width, height: spotlight.height, border: "2px solid #3b82f6", boxShadow: "0 0 0 4px rgba(59,130,246,0.20), 0 0 24px rgba(59,130,246,0.35)" }} />
      )}
      <AnimatePresence mode="wait">
        <motion.div key={stepIndex} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ type: "spring", damping: 28, stiffness: 340 }} className="absolute w-[320px] rounded-2xl p-5" style={{ top: tooltipTop, left: tooltipLeft, ...G.liquidGlass }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-400 text-[11px] font-extrabold uppercase tracking-widest">{stepIndex + 1} of {steps.length}</span>
            <button onClick={onFinish} className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-white/[0.08] cursor-pointer"><X className="w-3.5 h-3.5 text-[#8b949e]" /></button>
          </div>
          <h3 className="text-white text-[16px] font-extrabold mb-1.5">{step.title}</h3>
          <p className="text-[#8b949e] text-[13px] leading-relaxed mb-4">{step.description}</p>
          <div className="flex items-center justify-between">
            <button onClick={onFinish} className="text-[#8b949e] hover:text-white text-[13px] font-bold cursor-pointer">Skip</button>
            <div className="flex items-center gap-2">
              {stepIndex > 0 && <button onClick={goBack} className="h-8 px-3 rounded-lg text-[#8b949e] hover:text-white text-[13px] font-bold cursor-pointer" style={G.btn}>Back</button>}
              <button onClick={goNext} className="h-8 px-3.5 rounded-lg text-white text-[13px] font-extrabold cursor-pointer" style={{ background: "#3b82f6" }}>{isLast ? "Finish" : "Next"}</button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
