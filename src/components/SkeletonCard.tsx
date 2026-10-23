import { Skeleton } from "./Skeleton";
import { G } from "../lib/constants";

export function SkeletonCard() {
  return (
    <div className="rounded-2xl p-4 space-y-3" style={G.card}>
      <div className="flex items-center gap-2"><Skeleton className="w-6 h-6 rounded-full" /><Skeleton className="h-4 w-32" /></div>
      <Skeleton className="h-3 w-24" /><Skeleton className="h-3 w-20" />
      <div className="flex justify-between pt-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-3 w-12" /></div>
    </div>
  );
}
