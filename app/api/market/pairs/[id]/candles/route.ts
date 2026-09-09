import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { toJsonError, ApiError } from "@/lib/api";
import { dayStringUTC } from "@/lib/pf-math";

const INTERVAL_MS_MAP: Record<string, number> = { "5s": 5_000, "30s": 30_000, "1m": 60_000, "5m": 300_000, "15m": 900_000, "30m": 1_800_000, "1h": 3_600_000, "4h": 14_400_000 };

interface OutBar { timestamp: number; open: number; high: number; low: number; close: number; volume: number }

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
    if (!(interval in INTERVAL_MS_MAP)) {
      throw new ApiError(400, "Invalid interval");
    }
    const intervalMs = INTERVAL_MS_MAP[interval];
    const beforeTs = before ? Number(before) : Math.floor(Date.now() / intervalMs) * intervalMs;
    const collected: OutBar[] = [];

    if (intervalMs >= 60_000) {
      let cursorMs = beforeTs - 1;
      let guard = 0;
      const maxDays = 40;
      while (collected.length < limit && guard++ < maxDays) {
        const day = dayStringUTC(new Date(cursorMs));
        const dayStart = Date.parse(`${day}T00:00:00.000Z`);
        const dayEnd = dayStart + 86_400_000;
        const rows = await prisma.candle.findMany({
          where: {
            pairId: id,
            timestamp: { gte: BigInt(dayStart), lt: BigInt(Math.min(dayEnd, beforeTs)) },
          },
          orderBy: { timestamp: "asc" },
        });
        if (rows.length > 0) {
          if (intervalMs === 60_000) {
            for (let i = rows.length - 1; i >= 0 && collected.length < limit; i--) {
              const r = rows[i];
              const ts = Number(r.timestamp);
              if (ts >= beforeTs) continue;
              collected.push({
                timestamp: ts,
                open: Number(r.open),
                high: Number(r.high),
                low: Number(r.low),
                close: Number(r.close),
                volume: Number(r.volume),
              });
            }
          } else {
            const buckets = new Map<number, OutBar>();
            for (const r of rows) {
              const ts = Number(r.timestamp);
              if (ts >= beforeTs) continue;
              const bucket = Math.floor(ts / intervalMs) * intervalMs;
              const ex = buckets.get(bucket);
              const o = Number(r.open);
              const h = Number(r.high);
              const l = Number(r.low);
              const c = Number(r.close);
              const v = Number(r.volume);
              if (!ex) buckets.set(bucket, { timestamp: bucket, open: o, high: h, low: l, close: c, volume: v });
              else {
                if (h > ex.high) ex.high = h;
                if (l < ex.low) ex.low = l;
                ex.close = c;
                ex.volume += v;
              }
            }
            const sorted = [...buckets.values()].sort((a, b) => b.timestamp - a.timestamp);
            for (const b of sorted) {
              if (collected.length >= limit) break;
              collected.push(b);
            }
          }
        }
        cursorMs = dayStart - 1;
        if (day < "2024-01-01") break;
      }
    } else {
      const perBucket = intervalMs / 1000;
      const rawTake = Math.min(Math.ceil(limit * perBucket * 1.2), 20000);
      const rows = await prisma.secondCandle.findMany({
        where: { pairId: id, timestamp: { lt: BigInt(beforeTs) } },
        orderBy: { timestamp: "desc" },
        take: rawTake,
      });
      const buckets = new Map<number, OutBar>();
      for (const r of rows) {
        const ts = Number(r.timestamp);
        const bucket = Math.floor(ts / intervalMs) * intervalMs;
        if (bucket >= beforeTs) continue;
        const ex = buckets.get(bucket);
        const o = Number(r.open);
        const h = Number(r.high);
        const l = Number(r.low);
        const c = Number(r.close);
        if (!ex) buckets.set(bucket, { timestamp: bucket, open: o, high: h, low: l, close: c, volume: 1 });
        else {
          if (h > ex.high) ex.high = h;
          if (l < ex.low) ex.low = l;
          ex.close = c;
          ex.volume += 1;
        }
      }
      const sorted = [...buckets.values()].sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
      for (const b of sorted) collected.push(b);
    }

    collected.sort((a, b) => b.timestamp - a.timestamp);
    const seen = new Set<number>();
    const deduped = collected.filter((c) => {
      if (seen.has(c.timestamp)) return false;
      seen.add(c.timestamp);
      return true;
    });
    const sliced = deduped.slice(0, limit).sort((a, b) => a.timestamp - b.timestamp);
    return Response.json({
      candles: sliced.map((c) => ({
        id: `${id}:${c.timestamp}`,
        pairId: id,
        timestamp: c.timestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
      })),
      meta: { verified: true, source: "db" },
    });
  } catch (e) {
    return toJsonError(e);
  }
}
