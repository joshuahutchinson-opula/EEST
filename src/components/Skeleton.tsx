import { clsx } from "clsx";

export function Skeleton({ className }: { className?: string }) { return <div className={clsx("animate-pulse rounded-2xl", className)} style={{ background: "rgba(255,255,255,0.04)" }} />; }
