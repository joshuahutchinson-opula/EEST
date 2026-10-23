import { useState } from "react";
import { toast } from "sonner";
import { motion } from "motion/react";
import { FileDown, Loader2 } from "lucide-react";
import { API, downloadBlob } from "../../api";
import { G } from "../../lib/constants";

export function ProposalGeneratorModal({ open, onClose, projectId, quoteId }: { open: boolean; onClose: () => void; projectId: string; quoteId?: string; }) {
  const [generating, setGenerating] = useState(false);
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { blob, filename } = await API.proposals.generate(projectId, quoteId);
      downloadBlob(blob, filename);
      toast.success("Proposal generated");
      onClose();
    } catch { toast.error("Failed to generate proposal"); }
    finally { setGenerating(false); }
  };
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }} />
      <motion.div initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.93 }} transition={{ type: "spring", damping: 26, stiffness: 360 }} onClick={e => e.stopPropagation()} className="relative z-10 w-full max-w-[480px] rounded-2xl p-6" style={G.liquidGlass}>
        <h3 className="text-white text-[16px] font-extrabold mb-2">Generate Proposal</h3>
        <p className="text-[#8b949e] text-[13px] mb-4">Creates a branded Word document with project scope, device list, and pricing summary.</p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 h-10 rounded-xl text-[#8b949e] text-[14px] font-bold cursor-pointer" style={G.btn}>Cancel</button>
          <button onClick={handleGenerate} disabled={generating} className="flex-1 h-10 rounded-xl text-white text-[14px] font-extrabold cursor-pointer flex items-center justify-center gap-2" style={{ background: "#3b82f6" }}>{generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}{generating ? "Generating..." : "Generate Word Doc"}</button>
        </div>
      </motion.div>
    </div>
  );
}
