export function daysUntil(dateStr: string | undefined): number {
  if (!dateStr) return Infinity;
  return (new Date(dateStr).getTime() - Date.now()) / (24 * 60 * 60 * 1000);
}
