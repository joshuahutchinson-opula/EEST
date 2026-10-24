import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Bell } from "lucide-react";
import { clsx } from "clsx";
import { API } from "../api";
import { G } from "../lib/constants";
import type { NotificationItem } from "../types";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    API.notifications.list().then(setNotifications).catch(() => {});
    const interval = setInterval(() => { API.notifications.list().then(setNotifications).catch(() => {}); }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllRead = async () => { await API.notifications.markAllRead(); setNotifications(prev => prev.map(n => ({ ...n, isRead: true }))); };

  const handleNotificationClick = (n: NotificationItem) => {
    API.notifications.markRead(n.id).catch(() => {});
    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, isRead: true } : x));
    if (n.actionUrl) {
      if (n.actionUrl.includes("/project/")) {
        const projectId = n.actionUrl.split("/project/")[1];
        localStorage.setItem("active_project_id", projectId);
        localStorage.setItem("app_page", "project-detail");
        window.location.href = "/";
      }
    }
  };

  const filtered = filter === "unread" ? notifications.filter(n => !n.isRead) : notifications;

  const grouped = useMemo(() => {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const groups: { label: string; items: NotificationItem[] }[] = [
      { label: "Today", items: [] },
      { label: "Yesterday", items: [] },
      { label: "Earlier", items: [] },
    ];
    for (const n of filtered) {
      const d = new Date(n.timestamp).toDateString();
      if (d === today) groups[0].items.push(n);
      else if (d === yesterday) groups[1].items.push(n);
      else groups[2].items.push(n);
    }
    return groups.filter(g => g.items.length > 0);
  }, [filtered]);

  return (
    <div className="relative">
      <button data-tour="tour-notifications" onClick={() => setOpen(!open)} className="relative w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/[0.08] transition-colors cursor-pointer" style={G.btn}>
        <Bell className="w-3.5 h-3.5 text-[#8b949e]" />
        {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center">{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setOpen(false)} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -8 }} transition={{ type: "spring", damping: 26, stiffness: 360 }} className="absolute right-0 top-full mt-2 z-[60] w-80 rounded-2xl overflow-hidden" style={{ background: "rgba(7,12,26,0.97)", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 8px 32px rgba(0,0,0,0.8)", backdropFilter: "blur(20px)" }}>
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="text-white text-[14px] font-extrabold">Notifications</p>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && <button onClick={handleMarkAllRead} className="text-[12px] text-blue-400 font-bold hover:text-blue-300 cursor-pointer">Mark all read</button>}
                <button onClick={() => setFilter(filter === "all" ? "unread" : "all")} className="text-[12px] text-[#8b949e] font-bold cursor-pointer">{filter === "all" ? "Unread" : "All"}</button>
              </div>
            </div>
            <div className="max-h-[360px] overflow-y-auto" style={{ scrollbarWidth: "none" }}>
              {filtered.length === 0 ? (
                <div className="px-4 py-10 text-center"><Bell className="w-8 h-8 text-[#484f58] mx-auto mb-2" /><p className="text-[#484f58] text-[13px]">No notifications</p></div>
              ) : (
                grouped.map(group => (
                  <div key={group.label}>
                    <div className="px-4 py-2 text-[#484f58] text-[11px] font-extrabold uppercase tracking-widest" style={{ background: "rgba(255,255,255,0.02)" }}>{group.label}</div>
                    {group.items.map(n => (
                      <div key={n.id} className={clsx("px-4 py-3 hover:bg-white/[0.03] transition-colors cursor-pointer", !n.isRead && "bg-white/[0.02]")} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }} onClick={() => handleNotificationClick(n)}>
                        <div className="flex items-start gap-2">
                          <div className={clsx("w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0", !n.isRead ? "bg-blue-400" : "bg-transparent")} />
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-[13px] font-bold">{n.event}</p>
                            {n.details && <p className="text-[#8b949e] text-[12px] mt-0.5">{n.details}</p>}
                            <p className="text-[#484f58] text-[11px] mt-1">{new Date(n.timestamp).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
