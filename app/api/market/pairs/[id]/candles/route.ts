import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { toJsonError, ApiError } from "@/lib/api";
import { getOTCEngine } from "@/lib/otc-engine";

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
    const INTERVAL_MAP: Record<string, number> = { "1m": 1, "5m": 5, "15m": 15, "30m": 30, "1h": 60, "4h": 240, "1d": 1440 };
    if (!INTERVAL_MAP[interval]) {
      throw new ApiError(400, "Invalid interval");
    }
    const mult = INTERVAL_MAP[interval];

    const fetchRaw = async () => {
      const rawTake = Math.min(limit * mult, 10000);
      return prisma.candle.findMany({
        where: {
          pairId: id,
          ...(before ? { timestamp: { lt: BigInt(before) } } : {}),
        },
        orderBy: { timestamp: "desc" },
        take: rawTake,
      });
    };

    let rawCandles = await fetchRaw();

    if (rawCandles.length < 50) {
      const engine = await getOTCEngine();
      await engine.ensureHistoricalCandles();
      rawCandles = await fetchRaw();
    }

    // Aggregate 1m base into requested interval
    let candles: typeof rawCandles;
    if (mult === 1) {
      candles = rawCandles.slice(0, limit);
    } else {
      const intervalMs = mult * 60_000;
      const buckets = new Map<number, typeof rawCandles>();
      for (const c of rawCandles) {
        const ts = Number(c.timestamp);
        const bucket = Math.floor(ts / intervalMs) * intervalMs;
        const arr = buckets.get(bucket);
        if (!arr) buckets.set(bucket, [c]);
        else arr.push(c);
      }
      const sortedBuckets = [...buckets.entries()].sort((a, b) => b[0] - a[0]).slice(0, limit);
      candles = sortedBuckets.map(([bucketTs, arr]) => {
        const sorted = arr.sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        let high = Number(first.high);
        let low = Number(first.low);
        let volume = 0;
        for (const r of sorted) {
          const h = Number(r.high);
          const l = Number(r.low);
          if (h > high) high = h;
          if (l < low) low = l;
          volume += Number(r.volume);
        }
        return {
          ...first,
          timestamp: BigInt(bucketTs),
          open: first.open,
          high: high as unknown as typeof first.high,
          low: low as unknown as typeof first.low,
          close: last.close,
          volume: BigInt(volume),
        } as typeof rawCandles[number];
      }).sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
    }

    return Response.json({
      candles: candles.map((c: any) => ({
        id: c.id,
        pairId: c.pairId,
        timestamp: Number(c.timestamp),
        open: Number(c.open),
        high: Number(c.high),
        low: Number(c.low),
        close: Number(c.close),
        volume: Number(c.volume),
      })),
    });
  } catch (e) {
    return toJsonError(e);
  }
}
