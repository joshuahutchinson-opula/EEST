export const DEFAULT_EXCHANGE_RATE = 163;
const CACHE_MS = 60 * 60 * 1000;

let cached: { rate: number; at: number } | null = null;

// Same source the frontend uses (open.er-api.com), cached for an hour.
export async function getLiveExchangeRate(): Promise<number> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.rate;
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", { signal: AbortSignal.timeout(5000) });
    const data: any = await res.json();
    const rate = Number(data?.rates?.JMD);
    if (rate > 0) {
      cached = { rate, at: Date.now() };
      return rate;
    }
  } catch {}
  return cached?.rate ?? DEFAULT_EXCHANGE_RATE;
}
