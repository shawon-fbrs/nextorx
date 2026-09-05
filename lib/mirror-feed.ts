export interface MirrorQuote {
  pairId: string;
  price: number;
  fetchedAt: number;
}

const FETCH_TIMEOUT_MS = 10000;

const YAHOO_SYMBOLS: Record<string, string> = {
  EURUSD: "EURUSD=X",
  GBPUSD: "GBPUSD=X",
  USDJPY: "USDJPY=X",
  XAUUSD: "GC=F",
  BTCUSD: "BTC-USD",
};

export const MIRRORED_PAIR_IDS = Object.keys(YAHOO_SYMBOLS);

async function fetchYahooClose(symbol: string): Promise<number | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d`,
      {
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; NextorxOTC/1.0)" },
      },
    );
    if (!res.ok) return null;
    const json = await res.json();
    const closes: Array<number | null> | undefined =
      json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close;
    if (!closes) return null;
    for (let i = closes.length - 1; i >= 0; i--) {
      const c = closes[i];
      if (typeof c === "number" && Number.isFinite(c) && c > 0) return c;
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchMirrorQuotes(): Promise<MirrorQuote[]> {
  const fetchedAt = Date.now();
  const entries = await Promise.all(
    Object.entries(YAHOO_SYMBOLS).map(async ([pairId, symbol]) => {
      const price = await fetchYahooClose(symbol);
      return price == null ? null : { pairId, price, fetchedAt };
    }),
  );
  return entries.filter((q): q is MirrorQuote => q !== null);
}
