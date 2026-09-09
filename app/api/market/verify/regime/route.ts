import { NextRequest } from "next/server";
import { toJsonError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { dayStringUTC } from "@/lib/pf-math";

export async function GET(request: NextRequest) {
  try {
    const asset = request.nextUrl.searchParams.get("asset") ?? "";
    const date = request.nextUrl.searchParams.get("date") ?? dayStringUTC(new Date());
    if (!/^[A-Z0-9]+$/.test(asset)) {
      return Response.json({ error: "Invalid asset" }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return Response.json({ error: "Invalid date (YYYY-MM-DD)" }, { status: 400 });
    }
    const rows = await prisma.pairVolRegime.findMany({
      where: { pairId: asset, day: date },
      orderBy: { hour: "asc" },
      select: { hour: true, sigmaMult: true, measuredAt: true },
    });
    return Response.json({
      asset,
      date,
      regimes: rows.map((r) => ({ hour: r.hour, sigmaMult: Number(r.sigmaMult), measuredAt: r.measuredAt.toISOString() })),
    });
  } catch (e) {
    return toJsonError(e);
  }
}
