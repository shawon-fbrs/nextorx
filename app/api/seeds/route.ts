import { toJsonError } from "@/lib/api";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10)));
    const filter = url.searchParams.get("filter") ?? "all";
    const asset = url.searchParams.get("asset") ?? "";
    const dateFrom = url.searchParams.get("from") ?? "";
    const dateTo = url.searchParams.get("to") ?? "";
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (filter === "revealed") where.revealed = true;
    else if (filter === "pending") where.revealed = false;
    if (asset) where.pairId = asset;
    if (dateFrom || dateTo) {
      where.day = {};
      if (dateFrom) (where.day as Record<string, string>).gte = dateFrom;
      if (dateTo) (where.day as Record<string, string>).lte = dateTo;
    }

    const [seeds, total] = await Promise.all([
      prisma.serverSeed.findMany({
        where,
        orderBy: { day: "desc" },
        skip,
        take: limit,
        select: {
          day: true,
          pairId: true,
          seedHash: true,
          revealed: true,
          revealedAt: true,
          committedAt: true,
          createdAt: true,
        },
      }),
      prisma.serverSeed.count({ where }),
    ]);

    const pairs = await prisma.pair.findMany({ select: { id: true, name: true } });
    const pairMap = new Map(pairs.map((p) => [p.id, p.name]));

    const enriched = seeds.map((s) => ({
      ...s,
      pairName: pairMap.get(s.pairId) ?? s.pairId,
    }));

    return Response.json({
      seeds: enriched,
      pairs: pairs.map((p) => ({ id: p.id, name: p.name })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e) {
    return toJsonError(e);
  }
}
