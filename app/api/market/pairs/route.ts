import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { toJsonError } from "@/lib/api";
import { getOTCEngine } from "@/lib/otc-engine";
import { cacheGet, cacheSet, cacheDelPattern } from "@/lib/redis";

export async function GET(request: NextRequest) {
  try {
    const category = request.nextUrl.searchParams.get("category") ?? "";
    const cacheKey = `market:pairs:${category}`;
    const cached = await cacheGet<{ pairs: unknown[] }>(cacheKey);
    if (cached) return Response.json(cached);
    const pairs = await prisma.pair.findMany({
      where: {
        isActive: true,
        ...(category ? { category } : {}),
      },
      orderBy: { sortOrder: "asc" },
    });
    let live: Record<string, number> = {};
    try {
      const engine = await getOTCEngine();
      for (const p of pairs) {
        const v = engine.getCurrentPrice(p.id);
        if (v != null && Number.isFinite(v)) live[p.id] = v;
      }
    } catch {}
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const refs = await Promise.all(
      pairs.map((p) =>
        prisma.candle
          .findFirst({
            where: { pairId: p.id, timestamp: { lte: BigInt(cutoff) } },
            orderBy: { timestamp: "desc" },
            select: { close: true },
          })
          .catch(() => null),
      ),
    );
    const out = pairs.map((p, i) => {
      const cur = live[p.id] ?? Number(p.basePrice);
      const ref = refs[i] ? Number(refs[i]!.close) : null;
      const changePct24h = ref != null && ref > 0 ? ((cur - ref) / ref) * 100 : null;
      return {
        id: p.id,
        name: p.name,
        symbol: p.symbol,
        category: p.category,
        payoutPercent: Number(p.payoutPercent),
        weekendPayout: p.weekendPayout != null ? Number(p.weekendPayout) : null,
        minTrade: Number(p.minTrade),
        maxTrade: Number(p.maxTrade),
        iconUrl: (p as { iconUrl?: string | null }).iconUrl ?? null,
        iconUrl2: (p as { iconUrl2?: string | null }).iconUrl2 ?? null,
        isActive: p.isActive,
        isFeatured: p.isFeatured,
        sortOrder: p.sortOrder,
        description: p.description,
        tradingHours: p.tradingHours,
        tags: p.tags,
        changePct24h,
      };
    });
    const body = { pairs: out };
    await cacheSet(cacheKey, body, 30);
    return Response.json(body);
  } catch (e) {
    return toJsonError(e);
  }
}
