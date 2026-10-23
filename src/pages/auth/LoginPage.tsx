import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { BarChart3, Camera, ChevronDown, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import logoImg from "../../assets/2026-06-14_21.13.34_e-techsystemsja.com_2f51395e09e8-removebg-preview (1).png";
import { API_BASE } from "../../api";

export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  domain_not_allowed: "Only @e-techsystemsja.com accounts can sign in to EEST.",
  state_mismatch: "Your sign-in session expired before it could complete. Please try again.",
  missing_state: "Your sign-in session expired before it could complete. Please try again.",
  missing_code: "Microsoft didn't return a sign-in code. Please try again.",
  sign_in_failed: "Something went wrong signing you in. Please try again.",
};

export function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [showDemoForm, setShowDemoForm] = useState(false);
  const [demoUsername, setDemoUsername] = useState("");
  const [demoPassword, setDemoPassword] = useState("");
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);
  const authError = useMemo(() => new URLSearchParams(window.location.search).get("auth_error"), []);
  const errorMessage = authError ? (AUTH_ERROR_MESSAGES[authError] || (authError.startsWith("microsoft_") ? "Microsoft sign-in was cancelled or denied." : "Sign-in failed. Please try again.")) : null;
  const signInWithMicrosoft = () => { setLoading(true); window.location.href = `${API_BASE}/auth/microsoft/login`; };
  const signInWithDemo = async (e: React.FormEvent) => {
    e.preventDefault();
    setDemoError(null);
    setDemoLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/demo/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: demoUsername, password: demoPassword }),
      });
      if (!res.ok) { setDemoError("Invalid demo username or password."); return; }
      const { token } = await res.json();
      localStorage.setItem("auth_token", token);
      localStorage.setItem("app_logged_in", "true");
      window.location.href = "/";
    } catch {
      setDemoError("Something went wrong signing you in. Please try again.");
    } finally {
      setDemoLoading(false);
    }
  };
  return (
    <div className="h-screen flex overflow-hidden">
      <div className="hidden lg:flex w-[48%] flex-shrink-0 flex-col relative overflow-hidden" style={{ background: "#070c1a" }}>
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(ellipse 80% 60% at 10% 10%, rgba(30,64,175,0.45) 0%, transparent 65%), radial-gradient(ellipse 60% 55% at 90% 90%, rgba(88,28,135,0.35) 0%, transparent 65%)" }} />
        <div className="relative z-10 flex flex-col h-full p-8 md:p-12">
          <div className="mb-auto"><img src={logoImg} alt="E-Tech Systems" className="h-8 md:h-10 object-contain object-left" style={{ filter: "brightness(1.1)" }} /></div>
          <div className="flex flex-col justify-center flex-1 py-8">
            <span className="text-blue-400 text-[12px] md:text-[13px] font-extrabold tracking-[0.15em] uppercase mb-4 block">Security System Design & Integration Platform</span>
            <h1 className="text-white text-[2.2rem] md:text-[2.8rem] font-extrabold leading-[1.12] tracking-tight mb-4">Full-Lifecycle<br />Security Project<br /><span className="text-transparent" style={{ backgroundImage: "linear-gradient(135deg, #60a5fa, #a78bfa)", WebkitBackgroundClip: "text", backgroundClip: "text" }}>Management.</span></h1>
            <p className="text-[#8b949e] text-[13px] md:text-[15px] leading-relaxed mb-8 max-w-[380px]">From New lead to New client, from Site Assessment to Final Installation. Track Leads, Design Site Plans, Build Financial Workbooks, Manage Installations, and Auto-Generate Reports in One Platform.</p>
            <div className="space-y-2">
              {[
                { icon: Camera, title: "Projects", desc: "Browse every project by stage and owner, then drill in for its Project Assets, Workbook, and Installation", color: "#3b82f6" },
                { icon: BarChart3, title: "Sales & Tech Pipeline Tracker", desc: "Track Leads, Manage Tech Projects, Generate Workbooks and Reports", color: "#8b5cf6" },
              ].map(({ icon: Icon, title, desc, color }) => (
                <div key={title} className="flex items-start gap-3 p-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color}20` }}><Icon className="w-4 h-4" style={{ color }} /></div>
                  <div><p className="text-white text-[14px] font-extrabold mb-0.5">{title}</p><p className="text-[#8b949e] text-[13px]">{desc}</p></div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[#8b949e] text-[12px]">© 2026 E-Tech Systems Limited</p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6 md:p-8 relative" style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(40px)" }}>
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="relative z-10 w-full max-w-[380px]">
          <div className="rounded-3xl p-6 md:p-8" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(40px) saturate(160%)", boxShadow: "0 24px 64px rgba(0,0,0,0.6)" }}>
            <h2 className="text-white text-[1.5rem] md:text-[1.7rem] font-extrabold mb-1">Welcome back</h2>
            <p className="text-[#8b949e] text-[14px] mb-6">Sign in with your E-Tech Systems Microsoft account</p>
            {errorMessage && <div className="mb-5 px-3 py-2.5 rounded-xl text-[13px] text-rose-300" style={{ background: "rgba(244,63,94,0.10)", border: "1px solid rgba(244,63,94,0.25)" }}>{errorMessage}</div>}
            <button onClick={signInWithMicrosoft} disabled={loading} className="w-full flex items-center justify-center gap-3 h-11 rounded-2xl text-white text-[14px] font-extrabold transition-all hover:bg-white/[0.12] cursor-pointer min-h-[44px] disabled:opacity-60" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)" }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <svg width="20" height="20" viewBox="0 0 21 21" fill="none"><rect width="10" height="10" fill="#f25022" /><rect x="11" width="10" height="10" fill="#7fba00" /><rect y="11" width="10" height="10" fill="#00a4ef" /><rect x="11" y="11" width="10" height="10" fill="#ffb900" /></svg>}
              {loading ? "Redirecting to Microsoft…" : "Sign in with Microsoft"}
            </button>
            <p className="text-[#484f58] text-[12px] mt-5 text-center">Restricted to @e-techsystemsja.com accounts.</p>
            <div className="mt-6 pt-5" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <button type="button" onClick={() => setShowDemoForm((v) => !v)} className="w-full flex items-center justify-center gap-1 text-[#484f58] hover:text-[#8b949e] text-[11px] transition-colors cursor-pointer">
                Demo login
                <ChevronDown className={clsx("w-3 h-3 transition-transform", showDemoForm && "rotate-180")} />
              </button>
              {showDemoForm && (
                <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} onSubmit={signInWithDemo} className="mt-3 space-y-2 overflow-hidden">
                  <input value={demoUsername} onChange={(e) => setDemoUsername(e.target.value)} placeholder="Demo username" autoComplete="username" className="w-full h-9 px-3 rounded-lg text-white text-[13px] outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }} />
                  <input type="password" value={demoPassword} onChange={(e) => setDemoPassword(e.target.value)} placeholder="Demo password" autoComplete="current-password" className="w-full h-9 px-3 rounded-lg text-white text-[13px] outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }} />
                  {demoError && <p className="text-rose-400 text-[11px]">{demoError}</p>}
                  <button type="submit" disabled={demoLoading || !demoUsername || !demoPassword} className="w-full h-8 rounded-lg text-[#8b949e] text-[12px] font-semibold transition-colors hover:text-white cursor-pointer disabled:opacity-50" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    {demoLoading ? "Signing in…" : "Sign in with demo account"}
                  </button>
                </motion.form>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
