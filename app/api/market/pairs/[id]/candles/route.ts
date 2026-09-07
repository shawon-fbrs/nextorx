import { NextRequest } from "next/server";
import { toJsonError, ApiError } from "@/lib/api";
import { getDayCandlesWithCache } from "@/lib/pf-history";
import { dayStringUTC } from "@/lib/pf-math";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const rawLimit = Number(request.nextUrl.searchParams.get("limit") ?? 200);
    if (!Number.isFinite(rawLimit) || rawLimit <= 0) {
      throw new ApiError(400, "Invalid limit");
    }
    const limit = Math.min(Math.floor(rawLimit), 500);
    const before = request.nextUrl.searchParams.get("before");
    if (before && !/^\d+$/.test(before)) {
      throw new ApiError(400, "Invalid before cursor");
    }
    const interval = request.nextUrl.searchParams.get("interval") ?? "1m";
    const INTERVAL_MS_MAP: Record<string, number> = { "5s": 5_000, "30s": 30_000, "1m": 60_000, "5m": 300_000, "15m": 900_000, "30m": 1_800_000, "1h": 3_600_000, "4h": 14_400_000, "1d": 86_400_000 };
    if (!(interval in INTERVAL_MS_MAP)) {
      throw new ApiError(400, "Invalid interval");
    }
    const intervalMs = INTERVAL_MS_MAP[interval];
    const beforeTs = before ? Number(before) : Math.floor(Date.now() / intervalMs) * intervalMs;
    const collected: Array<{ timestamp: number; open: number; high: number; low: number; close: number; volume: number }> = [];
    let cursorMs = beforeTs - 1;
    let guard = 0;
    const maxDays = 500;
    while (collected.length < limit && guard++ < maxDays) {
      const day = dayStringUTC(new Date(cursorMs));
      const { candles } = await getDayCandlesWithCache({ pairId: id, day, intervalMs });
      if (!candles.length) {
        cursorMs = Date.parse(`${day}T00:00:00.000Z`) - 1;
        if (cursorMs < Date.now() - 365 * 86400000) break;
        continue;
      }
      const filtered = candles.filter(c => c.timestamp < beforeTs).sort((a, b) => b.timestamp - a.timestamp);
      for (const c of filtered) {
        if (collected.length >= limit) break;
        if (c.timestamp < beforeTs) collected.push(c);
      }
      cursorMs = Date.parse(`${day}T00:00:00.000Z`) - 1;
      if (day < '2024-01-01') break;
    }
    collected.sort((a, b) => b.timestamp - a.timestamp);
    const sliced = collected.slice(0, limit).sort((a, b) => a.timestamp - b.timestamp);
    return Response.json({
      candles: sliced.map(c => ({
        id: `${id}:${c.timestamp}`,
        pairId: id,
        timestamp: c.timestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
      })),
      meta: { verified: true },
    });
  } catch (e) {
    return toJsonError(e);
  }
}
