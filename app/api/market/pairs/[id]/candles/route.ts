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

    let candles = await prisma.candle.findMany({
      where: {
        pairId: id,
        ...(before ? { timestamp: { lt: BigInt(before) } } : {}),
      },
      orderBy: { timestamp: "desc" },
      take: limit,
    });

    if (candles.length < 50) {
      const engine = await getOTCEngine();
      await engine.ensureHistoricalCandles();
      candles = await prisma.candle.findMany({
        where: {
          pairId: id,
          ...(before ? { timestamp: { lt: BigInt(before) } } : {}),
        },
        orderBy: { timestamp: "desc" },
        take: limit,
      });
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
