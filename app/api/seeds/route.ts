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

    const pairs = await prisma.pair.findMany({ select: { id: true, name: true } });
    const pairMap = new Map(pairs.map((p) => [p.id, p.name]));
    const pairIds = pairs.map((p) => p.id);

    const candleDates = await prisma.$queryRaw<{ day: string }[]>`
      SELECT DISTINCT to_char(to_timestamp("timestamp" / 1000), 'YYYY-MM-DD') AS day
      FROM "SecondCandle"
      WHERE "timestamp" > 0
      ORDER BY day DESC
    `;
    const allDates = candleDates.map((r) => r.day);

    const seeds = await prisma.serverSeed.findMany({
      orderBy: { day: "desc" },
      select: {
        day: true,
        pairId: true,
        seedHash: true,
        revealed: true,
        revealedAt: true,
        committedAt: true,
        createdAt: true,
      },
    });

    const seedMap = new Map<string, typeof seeds>();
    for (const s of seeds) {
      const key = s.day;
      if (!seedMap.has(key)) seedMap.set(key, []);
      seedMap.get(key)!.push(s);
    }

    type Row = {
      day: string;
      pairId: string;
      pairName: string;
      seedHash: string;
      status: "REVEALED" | "PENDING" | "NONE";
      revealedAt: string | null;
      committedAt: string | null;
      createdAt: string;
    };

    const allRows: Row[] = [];
    for (const day of allDates) {
      const daySeeds = seedMap.get(day) ?? [];
      const seedByPair = new Map(daySeeds.map((s) => [s.pairId, s]));
      for (const pid of pairIds) {
        const s = seedByPair.get(pid);
        if (s) {
          allRows.push({
            day,
            pairId: pid,
            pairName: pairMap.get(pid) ?? pid,
            seedHash: s.seedHash,
            status: s.revealed ? "REVEALED" : "PENDING",
            revealedAt: s.revealedAt?.toISOString() ?? null,
            committedAt: s.committedAt?.toISOString() ?? null,
            createdAt: s.createdAt.toISOString(),
          });
        } else {
          allRows.push({
            day,
            pairId: pid,
            pairName: pairMap.get(pid) ?? pid,
            seedHash: "",
            status: "NONE",
            revealedAt: null,
            committedAt: null,
            createdAt: "",
          });
        }
      }
    }

    let filtered = allRows;
    if (filter === "revealed") filtered = allRows.filter((r) => r.status === "REVEALED");
    else if (filter === "pending") filtered = allRows.filter((r) => r.status === "PENDING");
    else if (filter === "unverifiable") filtered = allRows.filter((r) => r.status === "NONE");
    if (asset) filtered = filtered.filter((r) => r.pairId === asset);
    if (dateFrom) filtered = filtered.filter((r) => r.day >= dateFrom);
    if (dateTo) filtered = filtered.filter((r) => r.day <= dateTo);

    const total = filtered.length;
    const paginated = filtered.slice(skip, skip + limit);

    const validDates = [...new Set(allRows.filter((r) => r.status === "REVEALED").map((r) => r.day))].sort();

    return Response.json({
      seeds: paginated,
      pairs: pairs.map((p) => ({ id: p.id, name: p.name })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      validDates,
      allDates,
    });
  } catch (e) {
    return toJsonError(e);
  }
}
